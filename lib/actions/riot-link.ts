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
  if (authErr || !user) return { error: 'Não autenticado' };

  // ── 1. riot_accounts ────────────────────────────────────────────────
  const riotPayload = {
    profile_id:      user.id,
    puuid:           params.puuid,
    game_name:       params.gameName,
    tag_line:        params.tagLine,
    summoner_id:     params.summonerId,
    summoner_level:  params.summonerLevel,
    profile_icon_id: params.profileIconId,
    is_primary:      false,
    updated_at:      new Date().toISOString(),
  };

  let acctId: string | null = null;

  const { data: inserted, error: insertErr } = await supabase
    .from('riot_accounts')
    .insert(riotPayload)
    .select('id')
    .single();

  if (insertErr) {
    if (insertErr.code === '23505') {
      // puuid já existe — atualiza campos
      const { data: updated, error: updateErr } = await supabase
        .from('riot_accounts')
        .update({
          game_name:       params.gameName,
          tag_line:        params.tagLine,
          summoner_id:     params.summonerId,
          summoner_level:  params.summonerLevel,
          profile_icon_id: params.profileIconId,
          updated_at:      new Date().toISOString(),
        })
        .eq('puuid', params.puuid)
        .eq('profile_id', user.id)
        .select('id')
        .single();

      if (updateErr) return { error: 'Erro ao atualizar conta Riot: ' + updateErr.message };
      acctId = updated?.id ?? null;
    } else {
      return { error: 'Erro ao salvar conta Riot: ' + insertErr.message };
    }
  } else {
    acctId = inserted?.id ?? null;
  }

  if (!acctId) return { error: 'Não foi possível obter o ID da conta Riot.' };

  // Garante is_primary correto
  await supabase
    .from('riot_accounts')
    .update({ is_primary: false })
    .eq('profile_id', user.id)
    .neq('id', acctId);

  await supabase
    .from('riot_accounts')
    .update({ is_primary: true })
    .eq('id', acctId);

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
    const { error: snapErr } = await supabase.from('rank_snapshots').insert(snapshots);
    if (snapErr) console.warn('[riot-link] rank_snapshots:', snapErr.message);
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
    if (mastErr) console.warn('[riot-link] champion_masteries:', mastErr.message);
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
        updated_at:      new Date().toISOString(),
      },
      { onConflict: 'riot_account_id' }
    );

  if (playerErr) return { error: 'Erro ao criar player: ' + playerErr.message };

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
      { onConflict: 'riot_account_id' }
    );

  if (pErr) return { error: 'Erro ao criar player: ' + pErr.message };

  revalidatePath('/jogadores');
  revalidatePath('/ranking');
  revalidatePath('/dashboard');

  return { success: true };
}
