"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────
// Enviar convite (capitão → jogador por nick)
// ─────────────────────────────────────────────
export async function enviarConvite(params: {
  teamId: string;
  summonerName: string;  // riot game name sem tag
  tagline: string;       // ex: "BR1"
  role: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    // Garante que o usuário é capitão (owner) do time
    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("id, owner_id")
      .eq("id", params.teamId)
      .single();

    if (teamErr || !team) return { error: "Time não encontrado" };
    if (team.owner_id !== user.id) return { error: "Apenas o capitão pode convidar jogadores" };

    // Valida vagas: max 5 players
    const { count } = await supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("team_id", params.teamId);

    if ((count ?? 0) >= 5) return { error: "Time já possui 5 jogadores" };

    // Verifica se já existe convite PENDING para este nick no time
    const { data: existing } = await supabase
      .from("team_invites")
      .select("id")
      .eq("team_id", params.teamId)
      .eq("summoner_name", params.summonerName)
      .eq("tagline", params.tagline)
      .eq("status", "PENDING")
      .maybeSingle();

    if (existing) return { error: "Já existe um convite pendente para este jogador" };

    // Expira em 48h
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertErr } = await supabase
      .from("team_invites")
      .insert({
        team_id:      params.teamId,
        invited_by:   user.id,
        summoner_name: params.summonerName,
        tagline:      params.tagline,
        role:         params.role,
        status:       "PENDING",
        expires_at:   expiresAt,
      })
      .select("id")
      .single();

    if (insertErr) return { error: insertErr.message };

    revalidatePath(`/dashboard/times/${params.teamId}/roster`);
    return { success: true, inviteId: invite.id };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─────────────────────────────────────────────
// Cancelar convite pendente (capitão)
// ─────────────────────────────────────────────
export async function cancelarConvite(inviteId: string, teamId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: team } = await supabase
      .from("teams")
      .select("owner_id")
      .eq("id", teamId)
      .single();

    if (team?.owner_id !== user.id) return { error: "Sem permissão" };

    const { error } = await supabase
      .from("team_invites")
      .update({ status: "CANCELLED" })
      .eq("id", inviteId)
      .eq("status", "PENDING");

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/times/${teamId}/roster`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─────────────────────────────────────────────
// Remover jogador do time (capitão)
// ─────────────────────────────────────────────
export async function removerJogador(playerId: string, teamId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    // Apenas o capitão pode remover
    const { data: team } = await supabase
      .from("teams")
      .select("owner_id")
      .eq("id", teamId)
      .single();

    if (team?.owner_id !== user.id) return { error: "Apenas o capitão pode remover jogadores" };

    // Desvincula o jogador do time (não deleta o player)
    const { error } = await supabase
      .from("players")
      .update({ team_id: null })
      .eq("id", playerId)
      .eq("team_id", teamId);

    if (error) return { error: error.message };

    revalidatePath(`/dashboard/times/${teamId}/roster`);
    revalidatePath(`/dashboard/times/${teamId}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

// ─────────────────────────────────────────────
// Listar convites enviados pelo time (capitão)
// ─────────────────────────────────────────────
export async function listarConvitesEnviados(teamId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", data: null };

    const { data, error } = await supabase
      .from("team_invites")
      .select("id, summoner_name, tagline, role, status, expires_at, created_at")
      .eq("team_id", teamId)
      .in("status", ["PENDING", "ACCEPTED", "REJECTED"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return { error: error.message, data: null };
    return { data, error: null };
  } catch (e: any) {
    return { error: e.message, data: null };
  }
}
