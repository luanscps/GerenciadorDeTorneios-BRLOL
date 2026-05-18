import { createAdminClient } from "../supabase/admin";
import { getMatchById, MatchDto } from "../riot";

// ─── Interfaces ───────────────────────────────────────────────────────────────

interface RawRiotGameData {
  gameId: number;
  platformId: string;
}

interface NormalizedMatchData {
  tournamentCode: string;
  gameId: number;
  platformId: string;
  rawPayload: RawRiotGameData;
}

interface ResolvedMatchData extends NormalizedMatchData {
  matchId: string;
  matchDetails: MatchDto;
  localMatchId: string;
}

// ─── Subtarefa 1: Normaliza dados brutos do banco ─────────────────────────────

async function processMatchResult(
  tournamentCode: string,
  gameId: number
): Promise<{ success: true; data: NormalizedMatchData } | { success: false; error: string }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tournament_match_results")
    .select("*")
    .eq("tournament_code", tournamentCode)
    .eq("game_id", gameId)
    .single();

  if (error || !data) {
    console.error(`[IngestMatch] Registro não encontrado: ${tournamentCode} / ${gameId}`);
    return { success: false, error: "Registro não encontrado" };
  }

  if (data.processed) {
    console.warn(`[IngestMatch] Já processado: ${tournamentCode} / ${gameId}`);
    return { success: false, error: "Já processado" };
  }

  const gameData = data.game_data as unknown as RawRiotGameData;
  if (!gameData?.gameId || !gameData?.platformId) {
    return { success: false, error: "Dados brutos inválidos" };
  }

  return {
    success: true,
    data: {
      tournamentCode: data.tournament_code,
      gameId: gameData.gameId,
      platformId: gameData.platformId,
      rawPayload: gameData,
    },
  };
}

// ─── Subtarefa 2: Busca Riot API + resolve match interno ──────────────────────
// Chamada apenas UMA vez por ingestão. Retorna ResolvedMatchData que é
// repassado como parâmetro para as subtarefas 3 e 4.

async function fetchAndResolveMatch(
  tournamentCode: string,
  gameId: number
): Promise<{ success: true; data: ResolvedMatchData } | { success: false; error: string }> {
  const normResult = await processMatchResult(tournamentCode, gameId);
  if (!normResult.success) return { success: false, error: normResult.error };

  const normalized = normResult.data;
  const matchId = `${normalized.platformId}_${normalized.gameId}`.toUpperCase();
  console.log(`[IngestMatch] Buscando Riot API para: ${matchId}`);

  let matchDetails: MatchDto;
  try {
    matchDetails = await getMatchById(matchId);
  } catch (err) {
    console.error(`[IngestMatch] Erro Riot API ${matchId}:`, err);
    return { success: false, error: "Erro ao buscar detalhes do match" };
  }

  const supabase = createAdminClient();
  const { data: matchInternal, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_code", tournamentCode)
    .single();

  if (matchError || !matchInternal) {
    console.error(`[IngestMatch] Match interno não encontrado: ${tournamentCode}`);
    return { success: false, error: "Match interno não encontrado" };
  }

  return {
    success: true,
    data: { ...normalized, matchId, matchDetails, localMatchId: matchInternal.id },
  };
}

// ─── Subtarefa 3: Persiste em match_games ─────────────────────────────────────
// Recebe ResolvedMatchData — sem nova chamada ao banco ou à Riot.

async function persistMatchGame(
  resolved: ResolvedMatchData
): Promise<{ success: true; data: { matchGameId: string } } | { success: false; error: string }> {
  const { matchDetails, localMatchId } = resolved;
  const supabase = createAdminClient();

  const riotGameIdStr = matchDetails.info.gameId.toString();

  const { data: existing } = await supabase
    .from("match_games")
    .select("id")
    .eq("match_id", localMatchId)
    .eq("riot_game_id", riotGameIdStr)
    .maybeSingle();

  if (existing) {
    console.log(`[IngestMatch] match_games já existe (id: ${existing.id}). Pulando.`);
    return { success: true, data: { matchGameId: existing.id } };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("match_games")
    .insert({
      match_id: localMatchId,
      game_number: 1,
      riot_game_id: riotGameIdStr,
      duration_sec: Math.floor(matchDetails.info.gameDuration),
      winner_id: null,
    })
    .select("id")
    .single();

  if (insertError) {
    console.error(`[IngestMatch] Erro ao persistir match_games:`, insertError);
    return { success: false, error: insertError.message };
  }

  console.log(`[IngestMatch] match_games criado: ${inserted.id}`);
  return { success: true, data: { matchGameId: inserted.id } };
}

// ─── Subtarefa 4: Persiste player_stats ───────────────────────────────────────
// Recebe ResolvedMatchData e matchGameId — sem nova chamada à Riot.

async function persistPlayerStats(
  resolved: ResolvedMatchData,
  matchGameId: string
): Promise<{
  success: true;
  data: { inserted: number; skipped: number; unresolvedPlayers: string[] };
} | { success: false; error: string }> {
  const { matchDetails } = resolved;
  const supabase = createAdminClient();

  let insertedCount = 0;
  let skippedCount = 0;
  const unresolvedPlayers: string[] = [];

  for (const participant of matchDetails.info.participants) {
    const puuid = participant.puuid;

    // PASSO 1: riot_accounts pelo puuid
    const { data: riotAccount, error: raError } = await supabase
      .from("riot_accounts")
      .select("id, profile_id")
      .eq("puuid", puuid)
      .maybeSingle();

    if (raError || !riotAccount) {
      console.warn(`[IngestMatch] puuid não encontrado em riot_accounts (${puuid}). Pulando.`);
      unresolvedPlayers.push(puuid);
      skippedCount++;
      continue;
    }

    // PASSO 2: player pelo riot_account_id
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("riot_account_id", riotAccount.id)
      .maybeSingle();

    if (playerError || !player) {
      console.warn(
        `[IngestMatch] riot_account ${riotAccount.id} sem player vinculado. ` +
        `profile_id=${riotAccount.profile_id}. Pulando stats.`
      );
      unresolvedPlayers.push(puuid);
      skippedCount++;
      continue;
    }

    // PASSO 3: team_id via team_members
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("riot_account_id", riotAccount.id)
      .eq("status", "ACCEPTED")
      .maybeSingle();

    const teamId = membership?.team_id ?? null;

    // PASSO 4: idempotência
    const { data: existingStat } = await supabase
      .from("player_stats")
      .select("id")
      .eq("game_id", matchGameId)
      .eq("player_id", player.id)
      .maybeSingle();

    if (existingStat) {
      console.log(`[IngestMatch] Stats já existem para player ${player.id} no game ${matchGameId}.`);
      skippedCount++;
      continue;
    }

    // PASSO 5: insert
    const { error: insertError } = await supabase
      .from("player_stats")
      .insert({
        game_id:       matchGameId,
        player_id:     player.id,
        team_id:       teamId,
        kills:         participant.kills,
        deaths:        participant.deaths,
        assists:       participant.assists,
        gold_earned:   participant.goldEarned,
        cs:            participant.totalMinionsKilled + (participant.neutralMinionsKilled || 0),
        vision_score:  participant.visionScore,
        damage_dealt:  participant.totalDamageDealtToChampions,
        win:           participant.win,
        champion:      participant.championName,
        game_duration: Math.floor(matchDetails.info.gameDuration),
      });

    if (insertError) {
      console.error(`[IngestMatch] Erro ao inserir stats player ${player.id}:`, insertError.message);
      skippedCount++;
    } else {
      console.log(`[IngestMatch] Stats inseridos: player=${player.id} team=${teamId ?? "sem time"}`);
      insertedCount++;
    }
  }

  if (unresolvedPlayers.length > 0) {
    console.warn(
      `[IngestMatch] ${unresolvedPlayers.length} participante(s) não resolvido(s):\n` +
      unresolvedPlayers.map((p) => `  - ${p}`).join("\n")
    );
  }

  return {
    success: true,
    data: { inserted: insertedCount, skipped: skippedCount, unresolvedPlayers },
  };
}

// ─── Subtarefa 5: Finalização — ponto de entrada público ──────────────────────
// fetchAndResolveMatch chamado UMA ÚNICA VEZ aqui.
// resolved.data é repassado diretamente para persistMatchGame e persistPlayerStats.

export async function finalizeMatchIngestion(tournamentCode: string, gameId: number) {
  console.log(`[IngestMatch] Iniciando ingestão: ${tournamentCode} / ${gameId}`);

  // ── 1 chamada Riot API, aqui e apenas aqui ────────────────────────────────
  const resolved = await fetchAndResolveMatch(tournamentCode, gameId);
  if (!resolved.success) return { success: false, error: resolved.error };

  const { localMatchId } = resolved.data;

  // ── Subtarefa 3: match_games ──────────────────────────────────────────────
  const gameRes = await persistMatchGame(resolved.data);
  if (!gameRes.success) return { success: false, error: gameRes.error };

  // ── Subtarefa 4: player_stats — recebe matchGameId já resolvido ───────────
  const statsRes = await persistPlayerStats(resolved.data, gameRes.data.matchGameId);
  if (!statsRes.success) return { success: false, error: statsRes.error };

  const supabase = createAdminClient();

  // ── Marca como processado ─────────────────────────────────────────────────
  const { error: procError } = await supabase
    .from("tournament_match_results")
    .update({ processed: true, processing_at: null })
    .eq("tournament_code", tournamentCode)
    .eq("game_id", gameId);

  if (procError) {
    console.error(`[IngestMatch] Erro ao marcar como processado:`, procError);
    return { success: false, error: "Falha ao marcar registro como processado" };
  }

  // ── Finaliza partida ──────────────────────────────────────────────────────
  const { error: matchError } = await supabase
    .from("matches")
    .update({ status: "FINISHED", finished_at: new Date().toISOString() })
    .eq("id", localMatchId);

  if (matchError) {
    console.error(`[IngestMatch] Erro ao atualizar status da partida:`, matchError);
    return { success: false, error: "Falha ao finalizar status da partida" };
  }

  console.log(`[IngestMatch] Concluído. Stats inseridos: ${statsRes.data.inserted}`);

  return {
    success: true,
    data: {
      localMatchId,
      matchGameId: gameRes.data.matchGameId,
      statsInserted: statsRes.data.inserted,
      unresolvedPlayers: statsRes.data.unresolvedPlayers,
    },
  };
}
