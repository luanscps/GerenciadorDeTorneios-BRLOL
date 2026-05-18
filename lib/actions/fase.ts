"use server";
import { requireTournamentOrganizerOrAdmin } from '@/lib/supabase/permissions';
import { revalidatePath } from "next/cache";
import { z } from "zod";

const BracketTypeEnum = z.enum([
  "SINGLE_ELIMINATION",
  "DOUBLE_ELIMINATION",
  "ROUND_ROBIN",
  "SWISS",
]);

const FaseSchema = z.object({
  nome:                    z.string().min(1, "Nome é obrigatório").max(80),
  tipo:                    BracketTypeEnum,
  ordem:                   z.coerce.number().min(1).max(20),
  num_grupos:              z.coerce.number().min(1).max(16).optional(),
  times_por_grupo:         z.coerce.number().min(2).max(16).optional(),
  classificados_por_grupo: z.coerce.number().min(1).max(8).optional(),
  melhor_de:               z.coerce.number().min(1).max(7).optional(),
});

export async function createFase(tournamentId: string, formData: FormData) {
  try {
    const { supabase } = await requireTournamentOrganizerOrAdmin(tournamentId);

    const parsed = FaseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { data, error } = await supabase
      .from("tournament_stages")
      .insert({
        tournament_id:          tournamentId,
        name:                   parsed.data.nome,
        bracket_type:           parsed.data.tipo,
        stage_order:            parsed.data.ordem,
        num_groups:             parsed.data.num_grupos ?? 1,
        teams_per_group:        parsed.data.times_por_grupo ?? 4,
        qualifiers_per_group:   parsed.data.classificados_por_grupo ?? 2,
        best_of:                parsed.data.melhor_de ?? 1,
        status:                 "pending",
      })
      .select()
      .single();

    if (error) return { error: error.message };
    revalidatePath(`/organizador/torneios/${tournamentId}/fases`);
    return { success: true, data };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function updateFase(faseId: string, tournamentId: string, formData: FormData) {
  try {
    const { supabase } = await requireTournamentOrganizerOrAdmin(tournamentId);

    const parsed = FaseSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { error } = await supabase
      .from("tournament_stages")
      .update({
        name:                   parsed.data.nome,
        bracket_type:           parsed.data.tipo,
        stage_order:            parsed.data.ordem,
        num_groups:             parsed.data.num_grupos ?? 1,
        teams_per_group:        parsed.data.times_por_grupo ?? 4,
        qualifiers_per_group:   parsed.data.classificados_por_grupo ?? 2,
        best_of:                parsed.data.melhor_de ?? 1,
      })
      .eq("id", faseId);

    if (error) return { error: error.message };
    revalidatePath(`/organizador/torneios/${tournamentId}/fases`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deleteFase(faseId: string, tournamentId: string) {
  try {
    const { supabase } = await requireTournamentOrganizerOrAdmin(tournamentId);

    const { data: fase } = await supabase
      .from("tournament_stages")
      .select("status")
      .eq("id", faseId)
      .single();

    if (fase?.status === "active" || fase?.status === "finished") {
      return { error: "Não é possível excluir uma fase em andamento ou finalizada" };
    }

    const { error } = await supabase
      .from("tournament_stages")
      .delete()
      .eq("id", faseId);

    if (error) return { error: error.message };
    revalidatePath(`/organizador/torneios/${tournamentId}/fases`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getFasesByTorneio(tournamentId: string) {
  const { supabase } = await requireTournamentOrganizerOrAdmin(tournamentId);
  const { data, error } = await supabase
    .from("tournament_stages")
    .select("*")
    .eq("tournament_id", tournamentId)
    .order("stage_order", { ascending: true });
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function ativarFase(faseId: string, tournamentId: string) {
  try {
    const { supabase } = await requireTournamentOrganizerOrAdmin(tournamentId);

    // Finaliza fase anterior se existir
    await supabase
      .from("tournament_stages")
      .update({ status: "finished" })
      .eq("tournament_id", tournamentId)
      .eq("status", "active");

    const { error } = await supabase
      .from("tournament_stages")
      .update({ status: "active", started_at: new Date().toISOString() })
      .eq("id", faseId);

    if (error) return { error: error.message };
    revalidatePath(`/organizador/torneios/${tournamentId}/fases`);
    revalidatePath(`/torneios`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
