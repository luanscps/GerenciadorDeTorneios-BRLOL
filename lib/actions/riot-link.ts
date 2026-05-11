'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * vincularRiotAccount — Server Action principal
 *
 * Centraliza TODO o fluxo de vinculação server-side:
 * 1. upsert riot_accounts  (summoner_id salvo corretamente, sem RLS bloqueando)
 * 2. insert rank_snapshots
 * 3. upsert champion_masteries
 * 4. upsert players        (puuid + riot_account_id — UNIQUE constraint adicionado via migration)
 *
 * Fluxo seguro de INSERT/UPDATE:
 *   - Tenta INSERT direto.
 *   - Se 23505 (puuid duplicado): busca o registro existente, verifica ownership.
 *     Se profile_id ≠ user.id → rejeita (conta já vinculada a outro perfil).
 *     Se profile_id = user.id  → UPDATE pelo id direto (garante summoner_id salvo).
 */
export async function vincularRiotAccount(params: {
  puuid:          string;
  gameName:       string;
  tagLine:        string;
  summonerId:     string;
  summonerLevel:  number;
  profileIconId:  number;
  entries: Array<{
    queueType: string;
    tier:      string;
    rank:      string;
    lp:        number;
    wins:      number;
    losses:    number;
  }>;
  masteries: Array<{
    championId:     number;
    championName:   string;
    championLevel:  number;
    championPoints: number;
  }>;
}) {
  const supabase = await createClient();

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    console.error('[riot-link] auth error:', authErr?.message);
    return { error: 'Não autenticado' };
  }

  // ── 1. riot_accounts ────────────────────────────────────────────────
  const now = new Date().toISOString();

  const riotPayload = {
    profile_id:      user.id,
    puuid:           params.puuid,
    game_name:       params.gameName,
    tag_line:        params.tagLine,
    summoner_id:     params.summonerId,
    summoner_level:  params.summonerLevel,
    profile_icon_id: params.profileIconId,
    is_primary:      false,
    updated_at:      now,
  };

  let acctId: string | null = null;

  const { data: inserted, error: insertErr } = await supabase
    .from('riot_accounts')
    .insert(riotPayload)
    .select('id')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      // ── puuid duplicado: verifica ownership antes de atualizar ──
      console.warn('[riot-link] 23505 — buscando registro existente para puuid:', params.puuid);

      const { data: existing, error: selectErr } = await supabase
        .from('riot_accounts')
        .select('id, profile_id')
        .eq('puuid', params.puuid)
        .single();

      if (selectErr || !existing) {
        console.error('[riot-link] falha ao buscar registro existente:', selectErr?.message);
        return { error: 'Erro ao localizar conta Riot existente.' };
      }

      // Segurança: rejeita se a conta pertence a outro usuário
      if (existing.profile_id !== user.id) {
        console.warn('[riot-link] puuid pertence a outro profile_id — acesso negado.');
        return { error: 'PUUID_ALREADY_CLAIMED' };
      }

      // Ownership confirmado — atualiza pelo id direto (não depende de profile_id no .eq)
      const { data: updated, error: updateErr } = await supabase
        .from('riot_accounts')
        .update({
          game_name:       params.gameName,
          tag_line:        params.tagLine,
          summoner_id:     params.summonerId,
          summoner_level:  params.summonerLevel,
          profile_icon_id: params.profileIconId,
          updated_at:      now,
        })
        .eq('id', existing.id)
        .eq('profile_id', user.id)   // mantém restrição RLS explícita
        .select('id')
        .single();

      if (updateErr || !updated) {
        console.error('[riot-link] update error:', updateErr?.message, '| updated:', updated);
        return { error: 'Erro ao atualizar conta Riot: ' + (updateErr?.message ?? 'sem retorno') };
      }

      console.log('[riot-link] riot_account atualizado com sucesso:', updated.id);
      acctId = updated.id;

    } else {
      console.error('[riot-link] insert error:', { code: insertErr.code, msg: insertErr.message });
      return { error: 'Erro ao salvar conta Riot: ' + insertErr.message };
    }
  } else {
    console.log('[riot-link] riot_account inserido com sucesso:', inserted?.id);
    acctId = inserted?.id ?? null;
  }

  if (!acctId) {
    console.error('[riot-link] acctId é null após insert/update — estado inesperado.');
    return { error: 'Não foi possível obter o ID da conta Riot.' };
  }

  // ── is_primary: reset outros → seta atual ───────────────────────────
  const { error: resetErr } = await supabase
    .from('riot_accounts')
    .update({ is_primary: false })
    .eq('profile_id', user.id)
    .neq('id', acctId);

  if (resetErr) console.warn('[riot-link] is_primary reset:', resetErr.message);

  const { error: primaryErr } = await supabase
    .from('riot_accounts')
    .update({ is_primary: true })
    .eq('id', acctId)
    .eq('profile_id', user.id);

  if (primaryErr) console.warn('[riot-link] is_primary set:', primaryErr.message);

  // ── 2. rank_snapshots ───────────────────────────────────────────────
  if (params.entries.length > 0) {
    const snapshots = params.entries.map(e => ({
      riot_account_id: acctId,
      queue_type:      e.queueType,
      tier:            e.tier,
      rank:            e.rank,
      lp:              e.lp,
      wins:            e.wins,
      losses:          e.losses,
    }));
    const { error: snapErr } = await supabase
      .from('rank_snapshots')
      .insert(snapshots);
    if (snapErr) console.warn('[riot-link] rank_snapshots insert:', snapErr.message);
    else console.log('[riot-link] rank_snapshots inseridos:', snapshots.length);
  }

  // ── 3. champion_masteries ───────────────────────────────────────────
  if (params.masteries.length > 0) {
    const masteries = params.masteries.map(m => ({
      riot_account_id: acctId,
      champion_id:     m.championId,
      champion_name:   m.championName,
      mastery_level:   m.championLevel,
      mastery_points:  m.championPoints,
    }));
    const { error: mastErr } = await supabase
      .from('champion_masteries')
      .upsert(masteries, { onConflict: 'riot_account_id,champion_id' });
    if (mastErr) console.warn('[riot-link] champion_masteries upsert:', mastErr.message);
    else console.log('[riot-link] champion_masteries upsertados:', masteries.length);
  }

  // ── 4. players ──────────────────────────────────────────────────────
  const soloEntry = params.entries.find(e => e.queueType === 'RANKED_SOLO_5x5');

  const { error: playerErr } = await supabase
    .from('players')
    .upsert(
      {
        riot_account_id: acctId,
        puuid:           params.puuid,
        summoner_name:   params.gameName,
        tag_line:        params.tagLine,
        tier:            soloEntry?.tier   ?? 'UNRANKED',
        rank:            soloEntry?.rank   ?? '',
        lp:              soloEntry?.lp     ?? 0,
        wins:            soloEntry?.wins   ?? 0,
        losses:          soloEntry?.losses ?? 0,
        updated_at:      now,
      },
      { onConflict: 'riot_account_id' },
    );

  if (playerErr) {
    console.error('[riot-link] players upsert error:', playerErr.message);
    return { error: 'Erro ao criar player: ' + playerErr.message };
  }

  console.log('[riot-link] ✅ vincularRiotAccount concluído para acctId:', acctId);

  revalidatePath('/jogadores');
  revalidatePath('/ranking');
  revalidatePath('/dashboard');

  return { success: true };
}

/**
 * @deprecated Use vincularRiotAccount
 * Mantido por compatibilidade caso exista alguma referência antiga.
 */
export async function salvarPlayerDeRiotAccount(params: {
  riotAccountId: string;
  puuid: string;
  gameName: string;
  tagLine: string;
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { error: pErr } = await supabase
    .from('players')
    .upsert(
      {
        riot_account_id: params.riotAccountId,
        puuid:           params.puuid,
        summoner_name:   params.gameName,
        tag_line:        params.tagLine,
        tier:            params.tier || 'UNRANKED',
        rank:            params.rank || '',
        lp:              params.lp ?? 0,
        wins:            params.wins ?? 0,
        losses:          params.losses ?? 0,
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'riot_account_id' },
    );

  if (pErr) {
    console.error('[riot-link] salvarPlayerDeRiotAccount error:', pErr.message);
    return { error: 'Erro ao criar player: ' + pErr.message };
  }

  revalidatePath('/jogadores');
  revalidatePath('/ranking');
  revalidatePath('/dashboard');

  return { success: true };
}
