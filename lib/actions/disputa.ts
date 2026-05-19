'use server';
import { requireAuth, requireTournamentOrganizerOrAdmin } from '@/lib/supabase/permissions';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const AbrirDisputaSchema = z.object({
  match_id:     z.string().uuid('ID de partida inválido'),
  reason:       z.string().min(10, 'Descreva o motivo com pelo menos 10 caracteres').max(1000),
  evidence_url: z.string().url('URL de evidência inválida').optional().or(z.literal('')),
});

// dispute_status reais: OPEN | UNDER_REVIEW | RESOLVED | DISMISSED
const ResolverDisputaSchema = z.object({
  status:           z.enum(['RESOLVED', 'DISMISSED'], {
    errorMap: () => ({ message: 'Status inválido: use RESOLVED ou DISMISSED' }),
  }),
  resolution_notes: z.string().min(5, 'Informe a decisão com pelo menos 5 caracteres').max(1000),
});

// ─── CAPITÃO: Abrir disputa de resultado ─────────────────────────────────────
/**
 * Apenas o capitão (owner_id) do time envolvido na partida pode abrir disputa.
 * Valida que a partida está FINISHED e que o time está nela (team_a ou team_b).
 *
 * Política Riot: disputas devem ser resolvidas pelo organizador de forma justa e
 * transparente antes de avançar para a próxima rodada.
 * Ref: https://developer.riotgames.com/policies/general
 */
export async function abrirDisputa(matchId: string, formData: FormData) {
  try {
    const { supabase, profile } = await requireAuth();

    const parsed = AbrirDisputaSchema.safeParse({
      match_id:     matchId,
      reason:       formData.get('reason'),
      evidence_url: formData.get('evidence_url') ?? '',
    });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    // Busca a partida
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('id, tournament_id, team_a_id, team_b_id, status')
      .eq('id', matchId)
      .single();

    if (matchErr || !match) return { error: 'Partida não encontrada' };
    if (match.status !== 'FINISHED') {
      return { error: 'Disputas só podem ser abertas em partidas já finalizadas' };
    }

    // Verifica que o usuário é owner de um dos times da partida
    const { data: myTeam, error: teamErr } = await supabase
      .from('teams')
      .select('id')
      .eq('owner_id', profile.id)
      .in('id', [match.team_a_id, match.team_b_id])
      .maybeSingle();

    if (teamErr || !myTeam) {
      return { error: 'Apenas o capitão de um dos times da partida pode abrir disputa' };
    }

    // Verifica se já existe disputa aberta (OPEN) ou em análise (UNDER_REVIEW) para esta partida
    const { data: existente } = await supabase
      .from('disputes')
      .select('id, status')
      .eq('match_id', matchId)
      .in('status', ['OPEN', 'UNDER_REVIEW'])
      .maybeSingle();

    if (existente) {
      return { error: 'Já existe uma disputa aberta para esta partida' };
    }

    // FK real do banco: reported_by (não opened_by)
    // disputes só tem: match_id, reported_by, resolved_by, status, reason, evidence_url, resolution_notes
    const { error: insertErr } = await supabase
      .from('disputes')
      .insert({
        match_id:     matchId,
        reported_by:  profile.id,
        reason:       parsed.data.reason,
        evidence_url: parsed.data.evidence_url || null,
        status:       'OPEN',
      });

    if (insertErr) return { error: insertErr.message };

    const { data: torneio } = await supabase
      .from('tournaments')
      .select('slug')
      .eq('id', match.tournament_id)
      .single();

    const slug = torneio?.slug ?? match.tournament_id;
    revalidatePath(`/organizador/torneios/${match.tournament_id}/partidas`);
    revalidatePath(`/torneios/${slug}`);
    revalidatePath(`/dashboard/times`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── ORGANIZADOR/ADMIN: Resolver disputa ─────────────────────────────────────
/**
 * Organizador ou admin resolve a disputa com RESOLVED (aceita) ou DISMISSED (rejeitada).
 * Registra resolved_by, resolved_at e resolution_notes para auditoria.
 */
export async function resolverDisputa(
  disputaId: string,
  tournamentId: string,
  formData: FormData
) {
  try {
    const { supabase, profile } = await requireTournamentOrganizerOrAdmin(tournamentId);

    const parsed = ResolverDisputaSchema.safeParse({
      status:           formData.get('status'),
      resolution_notes: formData.get('resolution_notes'),
    });
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { data: disputa, error: fetchErr } = await supabase
      .from('disputes')
      .select('id, status, match_id')
      .eq('id', disputaId)
      .single();

    if (fetchErr || !disputa) return { error: 'Disputa não encontrada' };

    // Valida que a partida pertence ao torneio informado
    const { data: match, error: matchErr } = await supabase
      .from('matches')
      .select('id, tournament_id')
      .eq('id', disputa.match_id)
      .eq('tournament_id', tournamentId)
      .single();

    if (matchErr || !match) return { error: 'Disputa não pertence a este torneio' };

    // Já resolvida ou descartada
    if (disputa.status === 'RESOLVED' || disputa.status === 'DISMISSED') {
      return { error: 'Esta disputa já foi resolvida' };
    }

    const { error: updateErr } = await supabase
      .from('disputes')
      .update({
        status:           parsed.data.status,
        resolution_notes: parsed.data.resolution_notes,
        resolved_by:      profile.id,
        resolved_at:      new Date().toISOString(),
      })
      .eq('id', disputaId);

    if (updateErr) return { error: updateErr.message };

    const { data: torneio } = await supabase
      .from('tournaments')
      .select('slug')
      .eq('id', tournamentId)
      .single();

    const slug = torneio?.slug ?? tournamentId;
    revalidatePath(`/organizador/torneios/${tournamentId}/partidas`);
    revalidatePath(`/admin/torneios/${slug}/partidas`);
    revalidatePath(`/torneios/${slug}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─── ORGANIZADOR/ADMIN: Listar disputas por torneio ──────────────────────────
export async function listarDisputasPorTorneio(tournamentId: string) {
  try {
    const { supabase } = await requireTournamentOrganizerOrAdmin(tournamentId);

    // Busca todas as partidas do torneio para filtrar disputas
    const { data: matchIds, error: matchIdsErr } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournamentId);

    if (matchIdsErr) return { error: matchIdsErr.message, data: null };

    const ids = (matchIds ?? []).map((m) => m.id);
    if (ids.length === 0) return { data: [], error: null };

    const { data, error } = await supabase
      .from('disputes')
      .select(`
        id, status, reason, evidence_url, resolution_notes,
        opened_at:created_at, resolved_at,
        match:matches (
          id, round, match_number,
          team_a:teams!team_a_id ( id, name, tag ),
          team_b:teams!team_b_id ( id, name, tag )
        ),
        reported_by_profile:profiles!reported_by ( id, username, display_name ),
        resolved_by_profile:profiles!resolved_by ( id, username, display_name )
      `)
      .in('match_id', ids)
      .order('created_at', { ascending: false });

    if (error) return { error: error.message, data: null };
    return { data, error: null };
  } catch (e: any) {
    return { error: e.message, data: null };
  }
}

// ─── CAPITÃO: Listar disputas do meu time ────────────────────────────────────
export async function listarDisputasPorTime(teamId: string) {
  try {
    const { supabase, profile } = await requireAuth();

    // Garante que o solicitante é owner do time
    const { data: myTeam, error: teamErr } = await supabase
      .from('teams')
      .select('id')
      .eq('id', teamId)
      .eq('owner_id', profile.id)
      .maybeSingle();

    if (teamErr || !myTeam) return { error: 'Time não encontrado ou sem permissão', data: null };

    // Busca as partidas do time
    const { data: matchRows, error: matchErr } = await supabase
      .from('matches')
      .select('id')
      .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`);

    if (matchErr) return { error: matchErr.message, data: null };

    const ids = (matchRows ?? []).map((m) => m.id);
    if (ids.length === 0) return { data: [], error: null };

    const { data, error } = await supabase
      .from('disputes')
      .select(`
        id, status, reason, evidence_url, resolution_notes, created_at, resolved_at,
        match:matches (
          id, round, match_number,
          tournament:tournaments ( id, name, slug ),
          team_a:teams!team_a_id ( id, name, tag ),
          team_b:teams!team_b_id ( id, name, tag )
        ),
        reported_by_profile:profiles!reported_by ( id, username, display_name )
      `)
      .in('match_id', ids)
      .order('created_at', { ascending: false });

    if (error) return { error: error.message, data: null };
    return { data, error: null };
  } catch (e: any) {
    return { error: e.message, data: null };
  }
}
