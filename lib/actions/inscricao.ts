'use server';
import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// ─── Helper: garante admin ─────────────────────────────────────────────────
async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Nao autenticado');
  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();
  if (!profile?.is_admin) throw new Error('Sem permissao');
  return { supabase, adminId: user.id };
}

// ─── ADMIN: Aprovar inscrição ──────────────────────────────────────────────
export async function aprovarInscricao(teamId: string, tournamentId: string) {
  try {
    const { supabase, adminId } = await requireAdmin();
    const { error } = await supabase
      .from('inscricoes')
      .update({ status: 'APPROVED', reviewed_by: adminId, reviewed_at: new Date().toISOString() })
      .eq('team_id', teamId)
      .eq('tournament_id', tournamentId);
    if (error) return { error: error.message };
    revalidatePath(`/admin/tournaments/${tournamentId}/inscricoes`);
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── ADMIN: Rejeitar inscrição ─────────────────────────────────────────────
export async function rejeitarInscricao(teamId: string, tournamentId: string, notes: string) {
  try {
    const { supabase, adminId } = await requireAdmin();
    const { error } = await supabase
      .from('inscricoes')
      .update({ status: 'REJECTED', reviewed_by: adminId, reviewed_at: new Date().toISOString(), notes })
      .eq('team_id', teamId)
      .eq('tournament_id', tournamentId);
    if (error) return { error: error.message };
    revalidatePath(`/admin/tournaments/${tournamentId}/inscricoes`);
    revalidatePath(`/admin/tournaments/${tournamentId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── ADMIN: Desfazer check-in ──────────────────────────────────────────────
export async function desfazerCheckin(inscricaoId: string) {
  try {
    const { supabase, adminId: _adminId } = await requireAdmin();

    const { data: insc } = await supabase
      .from('inscricoes')
      .select('tournament_id')
      .eq('id', inscricaoId)
      .single();

    const { error } = await supabase
      .from('inscricoes')
      .update({ checked_in: false, checked_in_at: null, checked_in_by: null })
      .eq('id', inscricaoId);

    if (error) return { error: error.message };

    if (insc?.tournament_id) {
      revalidatePath(`/admin/tournaments/${insc.tournament_id}/checkin`);
      revalidatePath(`/admin/tournaments/${insc.tournament_id}`);
    }
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── Criar inscrição (capitão) ─────────────────────────────────────────────
export async function criarInscricao(teamId: string, tournamentId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Nao autenticado' };
    const { error } = await supabase.from('inscricoes').insert({
      team_id:       teamId,
      tournament_id: tournamentId,
      status:        'PENDING',
      requested_by:  user.id,
    });
    if (error) return { error: error.message };
    revalidatePath('/dashboard');
    revalidatePath(`/torneios/${tournamentId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── Inscrever time (alias público) ───────────────────────────────────────
export async function inscreverTime(tournamentId: string, teamId: string) {
  return criarInscricao(teamId, tournamentId);
}

// ─── Fazer check-in (capitão) ──────────────────────────────────────────────
export async function fazerCheckin(inscricaoId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Não autenticado' };

  const { data: insc, error: fetchErr } = await supabase
    .from('inscricoes')
    .select('id, status, team_id, teams!inner(owner_id)')
    .eq('id', inscricaoId)
    .single();

  if (fetchErr || !insc) return { error: 'Inscrição não encontrada' };

  const team = insc.teams as any;
  if (team.owner_id !== user.id) return { error: 'Apenas o capitão pode fazer check-in' };
  if (insc.status !== 'APPROVED') return { error: 'Inscrição precisa estar APROVADA para check-in' };

  const { error } = await supabase
    .from('inscricoes')
    .update({
      checked_in:    true,
      checked_in_at: new Date().toISOString(),
      checked_in_by: user.id,
    })
    .eq('id', inscricaoId);

  if (error) return { error: error.message };

  revalidatePath('/dashboard');
  revalidatePath(`/dashboard/times/${insc.team_id}`);
  revalidatePath(`/dashboard/times/${insc.team_id}/checkin`);
  return { success: true };
}

// ─── Listar inscrições por torneio ─────────────────────────────────────────
// Roster agora via team_members → riot_accounts → players (stats de perfil)
export async function listarInscricoesPorTorneio(tournamentId: string) {
  const supabase = await createClient();
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
