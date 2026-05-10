"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────
// Enviar convite (capitão → jogador por nick)
// ─────────────────────────────────────────────
export async function enviarConvite(params: {
  teamId: string;
  summonerName: string;
  tagline: string;
  role: string;
}) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: team, error: teamErr } = await supabase
      .from("teams")
      .select("id, owner_id")
      .eq("id", params.teamId)
      .single();

    if (teamErr || !team) return { error: "Time não encontrado" };
    if (team.owner_id !== user.id) return { error: "Apenas o capitão pode convidar jogadores" };

    // Valida vagas: max 5 membros aceitos em team_members
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", params.teamId)
      .eq("status", "accepted");

    if ((count ?? 0) >= 5) return { error: "Time já possui 5 jogadores" };

    const { data: existing } = await supabase
      .from("team_invites")
      .select("id")
      .eq("team_id", params.teamId)
      .eq("summoner_name", params.summonerName)
      .eq("tagline", params.tagline)
      .eq("status", "PENDING")
      .maybeSingle();

    if (existing) return { error: "Já existe um convite pendente para este jogador" };

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertErr } = await supabase
      .from("team_invites")
      .insert({
        team_id:       params.teamId,
        invited_by:    user.id,
        summoner_name: params.summonerName,
        tagline:       params.tagline,
        role:          params.role,
        status:        "PENDING",
        expires_at:    expiresAt,
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
// Remove o registro em team_members via profile_id
// lookup: players.id → riot_accounts → profile_id
// ─────────────────────────────────────────────
export async function removerJogador(playerId: string, teamId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { data: team } = await supabase
      .from("teams")
      .select("owner_id")
      .eq("id", teamId)
      .single();

    if (team?.owner_id !== user.id) return { error: "Apenas o capitão pode remover jogadores" };

    // Resolve profile_id: players.id → riot_accounts.id → riot_accounts.profile_id
    const { data: player, error: playerErr } = await supabase
      .from("players")
      .select("riot_account_id")
      .eq("id", playerId)
      .single();

    if (playerErr || !player?.riot_account_id)
      return { error: "Jogador não encontrado" };

    const { data: riotAccount, error: raErr } = await supabase
      .from("riot_accounts")
      .select("profile_id")
      .eq("id", player.riot_account_id)
      .single();

    if (raErr || !riotAccount?.profile_id)
      return { error: "Conta Riot não vinculada a um perfil" };

    // Deleta o vínculo em team_members
    const { error } = await supabase
      .from("team_members")
      .delete()
      .eq("profile_id", riotAccount.profile_id)
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
