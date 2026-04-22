"use server";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const ResultSchema = z.object({
  winner_team_id: z.string().uuid(),
  score_a: z.coerce.number().min(0),
  score_b: z.coerce.number().min(0),
  match_id_riot: z.string().optional(),
});

export async function editarResultadoPartida(
  matchDbId: string,
  tournamentId: string,
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Nao autenticado" };
    const { data: profile } = await supabase
      .from("profiles").select("is_admin").eq("id", user.id).single();
    if (!profile?.is_admin) return { error: "Sem permissao" };

    const parsed = ResultSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { error } = await supabase
      .from("matches")
      .update({ ...parsed.data, status: "finished" })
      .eq("id", matchDbId);
    if (error) return { error: error.message };
    revalidatePath("/admin/torneios/" + tournamentId + "/partidas");
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}
