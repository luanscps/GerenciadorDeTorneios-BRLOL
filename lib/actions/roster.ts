"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

// ─────────────────────────────────────────────
// Enviar convite (capitão → jogador por profileId)
// Usa invited_profile_id como identificador único.
// summoner_name e tag_line ficam NULL (colunas legadas mantidas temporariamente).
// ─────────────────────────────────────────────
export async function enviarConvite(params: {
  teamId:     string;
  profileId:  string; // profile_id do jogador (vem do /api/jogadores/buscar)
  role:       string;
  isReserve?: boolean;
  message?:   string;
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

    // Não pode convidar a si mesmo
    if (params.profileId === user.id) return { error: "Você não pode se convidar" };

    // Valida vagas: max 5 membros ativos
    const { count } = await supabase
      .from("team_members")
      .select("id", { count: "exact", head: true })
      .eq("team_id", params.teamId)
      .eq("status", "active");

    if ((count ?? 0) >= 5) return { error: "Time já possui 5 jogadores" };

    // Verifica convite PENDING já existente para este profile
    const { data: existing } = await supabase
      .from("team_invites")
      .select("id")
      .eq("team_id", params.teamId)
      .eq("invited_profile_id", params.profileId)
      .eq("status", "PENDING")
      .maybeSingle();

    if (existing) return { error: "Já existe um convite pendente para este jogador" };

    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString();

    const { data: invite, error: insertErr } = await supabase
      .from("team_invites")
      .insert({
        team_id:            params.teamId,
        invited_by:         user.id,
        invited_profile_id: params.profileId,
        role:               params.role,
        is_reserve:         params.isReserve ?? false,
        message:            params.message ?? null,
        status:             "PENDING",
        expires_at:         expiresAt,
        // summoner_name e tag_line: NULL — colunas legadas, removidas em próxima migration
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

    const { data: team } = await supabase
      .from("teams")
      .select("owner_id")
      .eq("id", teamId)
      .single();

    if (team?.owner_id !== user.id) return { error: "Apenas o capitão pode remover jogadores" };

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
// Inclui display name do convidado via join em profiles
// ─────────────────────────────────────────────
export async function listarConvitesEnviados(teamId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", data: null };

    const { data, error } = await supabase
      .from("team_invites")
      .select(`
        id,
        role,
        is_reserve,
        status,
        expires_at,
        created_at,
        message,
        invited_profile:profiles!invited_profile_id (
          id,
          riot_game_name,
          riot_tagline
        )
      `)
      .eq("team_id", teamId)
      .in("status", ["PENDING", "ACCEPTED", "REJECTED", "CANCELLED"])
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) return { error: error.message, data: null };
    return { data, error: null };
  } catch (e: any) {
    return { error: e.message, data: null };
  }
}
