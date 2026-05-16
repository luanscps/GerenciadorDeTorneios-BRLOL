"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * Aceita um convite de time.
 * O jogador convidado (invited_profile_id = auth.uid()) pode aceitar.
 * A RLS policy "team_invites_update" garante permissão.
 */
export async function aceitarConvite(inviteId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    // Busca o convite validando que pertence ao usuário autenticado
    const { data: invite, error: fetchErr } = await supabase
      .from("team_invites")
      .select("id, team_id, role, is_reserve, status, expires_at, invited_profile_id")
      .eq("id", inviteId)
      .eq("invited_profile_id", user.id)
      .single();

    if (fetchErr || !invite) return { error: "Convite não encontrado" };
    if (invite.status !== "PENDING") return { error: "Convite já foi respondido" };
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return { error: "Convite expirado" };
    }

    // 1. Marca o convite como aceito
    const { error: updateErr } = await supabase
      .from("team_invites")
      .update({ status: "ACCEPTED" })
      .eq("id", inviteId);

    if (updateErr) return { error: updateErr.message };

    // 2. Insere na tabela team_members
    const { error: memberErr } = await supabase
      .from("team_members")
      .upsert(
        {
          team_id:      invite.team_id,
          profile_id:   user.id,
          team_role:    invite.role ?? "member",
          status:       "active",
          invited_by:   null,
          invited_at:   new Date().toISOString(),
          responded_at: new Date().toISOString(),
        },
        { onConflict: "team_id,profile_id", ignoreDuplicates: false }
      );

    if (memberErr) return { error: memberErr.message };

    revalidatePath("/dashboard");
    revalidatePath(`/dashboard/times/${invite.team_id}`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

/**
 * Recusa um convite de time.
 * Garante que apenas o convidado pode recusar via .eq("invited_profile_id", user.id).
 */
export async function recusarConvite(inviteId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };

    const { error } = await supabase
      .from("team_invites")
      .update({ status: "REJECTED" })
      .eq("id", inviteId)
      .eq("invited_profile_id", user.id);

    if (error) return { error: error.message };
    revalidatePath("/dashboard");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

/**
 * Lista convites pendentes do usuário autenticado.
 * Filtro por invited_profile_id = auth.uid() — sistema novo.
 * Não depende mais de summoner_name/tagline do perfil.
 */
export async function listarConvitesPendentes() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado", data: null };

    const { data, error } = await supabase
      .from("team_invites")
      .select(`
        id, role, is_reserve, status, expires_at, created_at, message,
        team:teams ( id, name, tag, logo_url )
      `)
      .eq("invited_profile_id", user.id)
      .eq("status", "PENDING")
      .gt("expires_at", new Date().toISOString());

    if (error) return { error: error.message, data: null };
    return { data, error: null };
  } catch (e: any) {
    return { error: e.message, data: null };
  }
}
