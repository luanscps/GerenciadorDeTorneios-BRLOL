'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * salvarPlayerDeRiotAccount — Server Action
 *
 * Chamada pelo formulário /dashboard/jogador/registrar após o
 * salvamento local do riot_accounts. Faz o upsert em `players`
 * vinculando o riot_account_id ao registro de stats do jogador.
 *
 * Fix aplicado:
 * - Recebe puuid e inclui no upsert (necessário para players.puuid)
 * - onConflict em riot_account_id (requer UNIQUE constraint adicionado via migration)
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

  // Verifica se o riot_account pertence ao usuário logado
  const { data: riotAccount, error: raErr } = await supabase
    .from('riot_accounts')
    .select('id, profile_id')
    .eq('id', params.riotAccountId)
    .single();

  if (raErr || !riotAccount) return { error: 'Conta Riot não encontrada' };
  if (riotAccount.profile_id !== user.id) return { error: 'Sem permissão' };

  // Upsert em players vinculando ao riot_account
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
