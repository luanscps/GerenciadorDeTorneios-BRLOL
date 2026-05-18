'use server';
import { requireAuth, requireTournamentOrganizerOrAdmin } from '@/lib/supabase/permissions';
import { revalidatePath } from 'next/cache';

// ─── ORGANIZER/ADMIN: Aprovar inscrição ───────────────────────────────────────
export async function aprovarInscricao(teamId: string, tournamentId: string) {
  try {
    const { supabase, profile } = await requireTournamentOrganizerOrAdmin(tournamentId);
    const { error } = await supabase
      .from('inscricoes')
      .update({
        status:      'APPROVED',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('team_id', teamId)
      .eq('tournament_id', tournamentId);
    if (error) return { error: error.message };
    revalidatePath(`/organizador/torneios/${tournamentId}/inscricoes`);
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    revalidatePath(`/admin/tournaments/${tournamentId}/inscricoes`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── ORGANIZER/ADMIN: Rejeitar inscrição ─────────────────────────────────────
export async function rejeitarInscricao(teamId: string, tournamentId: string, notes: string) {
  try {
    const { supabase, profile } = await requireTournamentOrganizerOrAdmin(tournamentId);
    const { error } = await supabase
      .from('inscricoes')
      .update({
        status:      'REJECTED',
        reviewed_by: profile.id,
        reviewed_at: new Date().toISOString(),
        notes,
      })
      .eq('team_id', teamId)
      .eq('tournament_id', tournamentId);
    if (error) return { error: error.message };
    revalidatePath(`/organizador/torneios/${tournamentId}/inscricoes`);
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    revalidatePath(`/admin/tournaments/${tournamentId}/inscricoes`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── ORGANIZER/ADMIN: Desfazer check-in ──────────────────────────────────────
export async function desfazerCheckin(inscricaoId: string) {
  try {
    const { supabase } = await requireAuth();

    const { data: insc, error: fetchErr } = await supabase
      .from('inscricoes')
      .select('tournament_id')
      .eq('id', inscricaoId)
      .single();

    if (fetchErr || !insc) return { error: 'Inscrição não encontrada' };

    await requireTournamentOrganizerOrAdmin(insc.tournament_id);

    const { error } = await supabase
      .from('inscricoes')
      .update({ checked_in: false, checked_in_at: null, checked_in_by: null })
      .eq('id', inscricaoId);

    if (error) return { error: error.message };

    revalidatePath(`/organizador/torneios/${insc.tournament_id}/checkin`);
    revalidatePath(`/admin/tournaments/${insc.tournament_id}/checkin`);
    revalidatePath(`/admin/tournaments/${insc.tournament_id}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── ORGANIZER/ADMIN: Fazer check-in manual ──────────────────────────────────
/**
 * Permite que o organizador ou admin faça check-in de um time manualmente.
 * Diferente de `fazerCheckin` (que exige ser o capitão do time),
 * esta action verifica apenas se o caller é organizador/admin do torneio.
 *
 * A validação de "jogador em partida" (spectator-v5) é feita no Client
 * antes desta action ser chamada (best-effort, não bloqueia aqui no servidor).
 */
export async function fazerCheckinOrganizador(inscricaoId: string) {
  try {
    const { supabase, profile } = await requireAuth();

    const { data: insc, error: fetchErr } = await supabase
      .from('inscricoes')
      .select('id, status, tournament_id')
      .eq('id', inscricaoId)
      .single();

    if (fetchErr || !insc) return { error: 'Inscrição não encontrada' };

    // Verifica permissão agora que temos o tournament_id
    await requireTournamentOrganizerOrAdmin(insc.tournament_id);

    if (insc.status !== 'APPROVED') {
      return { error: 'Inscrição precisa estar APROVADA para check-in' };
    }

    const { error } = await supabase
      .from('inscricoes')
      .update({
        checked_in:    true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: profile.id,
      })
      .eq('id', inscricaoId);

    if (error) return { error: error.message };

    revalidatePath(`/organizador/torneios/${insc.tournament_id}/checkin`);
    revalidatePath(`/admin/tournaments/${insc.tournament_id}/checkin`);
    revalidatePath(`/admin/tournaments/${insc.tournament_id}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── PLAYER: Criar inscrição (capitão de time) ────────────────────────────────
export async function criarInscricao(teamId: string, tournamentId: string) {
  try {
    const { supabase, profile } = await requireAuth();
    const { error } = await supabase.from('inscricoes').insert({
      team_id:       teamId,
      tournament_id: tournamentId,
      status:        'PENDING',
      requested_by:  profile.id,
    });
    if (error) return { error: error.message };
    revalidatePath('/dashboard');
    revalidatePath(`/torneios/${tournamentId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── Alias público ────────────────────────────────────────────────────────────
export async function inscreverTime(tournamentId: string, teamId: string) {
  return criarInscricao(teamId, tournamentId);
}

// ─── PLAYER: Fazer check-in (apenas o capitão do time) ───────────────────────
export async function fazerCheckin(inscricaoId: string) {
  try {
    const { supabase, profile } = await requireAuth();

    const { data: insc, error: fetchErr } = await supabase
      .from('inscricoes')
      .select('id, status, team_id, teams!inner(owner_id)')
      .eq('id', inscricaoId)
      .single();

    if (fetchErr || !insc) return { error: 'Inscrição não encontrada' };

    const team = insc.teams as any;
    if (team.owner_id !== profile.id) return { error: 'Apenas o capitão pode fazer check-in' };
    if (insc.status !== 'APPROVED') return { error: 'Inscrição precisa estar APROVADA para check-in' };

    const { error } = await supabase
      .from('inscricoes')
      .update({
        checked_in:    true,
        checked_in_at: new Date().toISOString(),
        checked_in_by: profile.id,
      })
      .eq('id', inscricaoId);

    if (error) return { error: error.message };

    revalidatePath('/dashboard');
    revalidatePath(`/dashboard/times/${insc.team_id}`);
    revalidatePath(`/dashboard/times/${insc.team_id}/checkin`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── PUBLIC: Listar inscrições por torneio ────────────────────────────────────
export async function listarInscricoesPorTorneio(tournamentId: string) {
  const { supabase } = await requireAuth();
  const { data, error } = await supabase
    .from('inscricoes')
    .select(`
      id, status, checked_in, checked_in_at, created_at,
      team:teams (
        id, name, tag, logo_url, owner_id,
        team_members (
          id, team_role, lane,
          riot_account:riot_accounts (
            id, game_name, tag_line,
            player:players ( id, tier, lp, wins, losses )
          )
        )
      )
    `)
    .eq('tournament_id', tournamentId)
    .order('created_at', { ascending: true });
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}
