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

const CreatePartidaSchema = z.object({
  team_a_id: z.string().uuid(),
  team_b_id: z.string().uuid(),
  round: z.coerce.number().min(1),
  match_number: z.coerce.number().min(1),
  scheduled_at: z.string().optional(),
  fase_id: z.string().uuid().optional(),
  best_of: z.coerce.number().min(1).max(7).default(1),
});

async function requireOrgOrAdmin(supabase: any, tornId: string, userId: string) {
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", userId)
    .single();
  if (profile?.is_admin) return true;
  const { data: torneio } = await supabase
    .from("tournaments")
    .select("organizer_id")
    .eq("id", tornId)
    .single();
  if (torneio?.organizer_id !== userId) throw new Error("Sem permissão");
  return true;
}

/** Avança o vencedor para a próxima partida do bracket (eliminatório simples) */
async function avancarVencedor(supabase: any, match: any, winnerId: string) {
  const { round, match_number, tournament_id } = match;
  const proximoRound = round + 1;
  const proximaPartidaNum = Math.ceil(match_number / 2);

  // Verifica se já existe partida na próxima rodada
  const { data: proximaPartida } = await supabase
    .from("matches")
    .select("id, team_a_id, team_b_id")
    .eq("tournament_id", tournament_id)
    .eq("round", proximoRound)
    .eq("match_number", proximaPartidaNum)
    .maybeSingle();

  if (proximaPartida) {
    // Preenche o slot vazio (team_a ou team_b) com o vencedor
    const update = proximaPartida.team_a_id == null
      ? { team_a_id: winnerId }
      : { team_b_id: winnerId };
    await supabase
      .from("matches")
      .update(update)
      .eq("id", proximaPartida.id);
  } else {
    // Cria a partida da próxima rodada com o vencedor no slot A
    // O outro slot será preenchido quando a partida espelho finalizar
    const isSlotA = match_number % 2 !== 0;
    await supabase.from("matches").insert({
      tournament_id,
      team_a_id: isSlotA ? winnerId : null,
      team_b_id: isSlotA ? null : winnerId,
      round: proximoRound,
      match_number: proximaPartidaNum,
      best_of: match.best_of ?? 1,
      status: "pending",
    });
  }
}

// Mantém compatibilidade com PartidaResultForm existente
export async function editarResultadoPartida(
  matchDbId: string,
  tournamentId: string,
  formData: FormData
) {
  return updateResultadoPartida(matchDbId, tournamentId, formData);
}

export async function updateResultadoPartida(
  matchDbId: string,
  tournamentId: string,
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };
    await requireOrgOrAdmin(supabase, tournamentId, user.id);

    const parsed = ResultSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    const { score_a, score_b, winner_team_id, match_id_riot } = parsed.data;

    // Busca partida atual para saber round/match_number
    const { data: match, error: errMatch } = await supabase
      .from("matches")
      .select("id, round, match_number, tournament_id, best_of")
      .eq("id", matchDbId)
      .single();

    if (errMatch || !match) return { error: "Partida não encontrada" };

    const { error } = await supabase
      .from("matches")
      .update({
        winner_id: winner_team_id,
        score_a,
        score_b,
        match_id_riot: match_id_riot ?? null,
        status: "finished",
        finished_at: new Date().toISOString(),
      })
      .eq("id", matchDbId);

    if (error) return { error: error.message };

    // Avança vencedor para próxima rodada
    await avancarVencedor(supabase, match, winner_team_id);

    // Picks & Bans (opcional)
    const picksBansRaw = formData.get("picks_bans");
    if (picksBansRaw) {
      try {
        const picksBans = JSON.parse(picksBansRaw as string);
        if (Array.isArray(picksBans) && picksBans.length > 0) {
          const rows = picksBans
            .filter((pb: any) => pb.champion)
            .map((pb: any) => ({
              match_id: matchDbId,
              tournament_id: tournamentId,
              team_id: pb.team === 'A' ? match.team_a_id : match.team_b_id,
              champion: pb.champion,
              type: pb.type,
              order: pb.order,
            }));
          if (rows.length > 0) {
            await supabase.from("picks_bans").insert(rows);
          }
        }
      } catch (_) { /* ignora erro de parse de picks_bans */ }
    }

    // Busca slug do torneio para revalidatePath correto
    const { data: torneio } = await supabase
      .from("tournaments")
      .select("slug")
      .eq("id", tournamentId)
      .single();

    const slug = torneio?.slug ?? tournamentId;
    revalidatePath(`/admin/torneios/${slug}/partidas`);
    revalidatePath(`/torneios/${slug}/bracket`);
    revalidatePath(`/torneios/${slug}`);
    revalidatePath(`/torneios`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function createPartida(
  tournamentId: string,
  formData: FormData
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };
    await requireOrgOrAdmin(supabase, tournamentId, user.id);

    const parsed = CreatePartidaSchema.safeParse(Object.fromEntries(formData));
    if (!parsed.success) return { error: parsed.error.errors[0].message };

    if (parsed.data.team_a_id === parsed.data.team_b_id) {
      return { error: "Os dois times precisam ser diferentes" };
    }

    const { data, error } = await supabase
      .from("matches")
      .insert({
        tournament_id: tournamentId,
        team_a_id: parsed.data.team_a_id,
        team_b_id: parsed.data.team_b_id,
        round: parsed.data.round,
        match_number: parsed.data.match_number,
        best_of: parsed.data.best_of,
        fase_id: parsed.data.fase_id ?? null,
        scheduled_at: parsed.data.scheduled_at ?? null,
        status: "pending",
      })
      .select()
      .single();

    if (error) return { error: error.message };

    const { data: torneio } = await supabase
      .from("tournaments")
      .select("slug")
      .eq("id", tournamentId)
      .single();
    const slug = torneio?.slug ?? tournamentId;
    revalidatePath(`/admin/torneios/${slug}/partidas`);
    return { success: true, data };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function deletePartida(matchId: string, tournamentId: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };
    await requireOrgOrAdmin(supabase, tournamentId, user.id);

    const { data: match } = await supabase
      .from("matches")
      .select("status")
      .eq("id", matchId)
      .single();
    if (match?.status === "finished") {
      return { error: "Não é possível excluir uma partida já finalizada" };
    }

    const { error } = await supabase.from("matches").delete().eq("id", matchId);
    if (error) return { error: error.message };

    const { data: torneio } = await supabase
      .from("tournaments")
      .select("slug")
      .eq("id", tournamentId)
      .single();
    const slug = torneio?.slug ?? tournamentId;
    revalidatePath(`/admin/torneios/${slug}/partidas`);
    return { success: true };
  } catch (e: any) {
    return { error: e.message };
  }
}

export async function getPartidasByTorneio(tournamentId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .select(
      `id, round, match_number, status, score_a, score_b, scheduled_at, finished_at, best_of, fase_id,
       team_a:teams!team_a_id(id, name, tag, logo_url),
       team_b:teams!team_b_id(id, name, tag, logo_url),
       winner:teams!winner_id(id, name, tag)`
    )
    .eq("tournament_id", tournamentId)
    .order("round")
    .order("match_number");
  if (error) return { error: error.message, data: null };
  return { data, error: null };
}

export async function gerarChaveamento(tournamentId: string, faseId?: string) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Não autenticado" };
    await requireOrgOrAdmin(supabase, tournamentId, user.id);

    const { data: inscricoes, error: errInsc } = await supabase
      .from("inscricoes")
      .select("team_id, teams(id, name, tag)")
      .eq("tournament_id", tournamentId)
      .eq("status", "APPROVED");

    if (errInsc) return { error: errInsc.message };
    if (!inscricoes || inscricoes.length < 2) {
      return { error: "É necessário pelo menos 2 times aprovados para gerar o chaveamento" };
    }

    const times = [...inscricoes].sort(() => Math.random() - 0.5);
    const nextPow2 = Math.pow(2, Math.ceil(Math.log2(times.length)));
    const partidas: any[] = [];

    for (let i = 0; i < nextPow2 / 2; i++) {
      const timeA = times[i * 2];
      const timeB = times[i * 2 + 1];
      if (!timeA) continue;
      if (!timeB) continue; // BYE
      partidas.push({
        tournament_id: tournamentId,
        team_a_id: timeA.team_id,
        team_b_id: timeB.team_id,
        round: 1,
        match_number: i + 1,
        best_of: 1,
        fase_id: faseId ?? null,
        status: "pending",
      });
    }

    const { data: inserted, error: errIns } = await supabase
      .from("matches")
      .insert(partidas)
      .select();

    if (errIns) return { error: errIns.message };

    const { data: torneio } = await supabase
      .from("tournaments")
      .select("slug")
      .eq("id", tournamentId)
      .single();
    const slug = torneio?.slug ?? tournamentId;
    revalidatePath(`/admin/torneios/${slug}/partidas`);
    revalidatePath(`/torneios/${slug}/bracket`);
    revalidatePath(`/torneios`);
    return { success: true, data: inserted };
  } catch (e: any) {
    return { error: e.message };
  }
}
