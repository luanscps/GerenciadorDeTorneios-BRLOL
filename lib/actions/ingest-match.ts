import { createAdminClient } from "../supabase/admin";
import { getMatchById, MatchDto } from "../riot";
import { Database } from "../database.types";

/**
 * Interface mínima esperada para o game_data vindo da Riot via Webhook.
 */
interface RawRiotGameData {
  gameId: number;
  platformId: string;
}

/**
 * Estrutura normalizada que o processador deve montar.
 */
interface NormalizedMatchData {
  tournamentCode: string;
  gameId: number;
  platformId: string;
  rawPayload: RawRiotGameData;
}

/**
 * Estrutura enriquecida após busca na Riot e resolução interna.
 */
interface ResolvedMatchData extends NormalizedMatchData {
  matchId: string;              // Ex: BR1_123456
  matchDetails: MatchDto;       // Dados completos da Riot
  localMatchId: string;         // UUID interno da tabela 'matches'
}

/**
 * Subtarefa 1: Processador de Resultados (Estrutura Básica)
 * Responsável por buscar e normalizar o dado bruto.
 */
export async function processMatchResult(tournamentCode: string, gameId: number) {
  const supabase = createAdminClient();
  
  const { data, error } = await supabase
    .from("tournament_match_results")
    .select("*")
    .eq("tournament_code", tournamentCode)
    .eq("game_id", gameId)
    .single();

  if (error || !data) {
    console.error(`[IngestMatch] Registro não encontrado para: ${tournamentCode} / ${gameId}`);
    return { success: false, error: "Registro não encontrado" };
  }

  if (data.processed) {
    console.warn(`[IngestMatch] Registro já processado: ${tournamentCode} / ${gameId}`);
    return { success: false, error: "Já processado" };
  }

  const gameData = data.game_data as unknown as RawRiotGameData;
  if (!gameData?.gameId || !gameData?.platformId) {
    return { success: false, error: "Dados brutos inválidos" };
  }

  const normalized: NormalizedMatchData = {
    tournamentCode: data.tournament_code,
    gameId: gameData.gameId,
    platformId: gameData.platformId,
    rawPayload: gameData,
  };

  return { success: true, data: normalized };
}

/**
 * Subtarefa 2: Busca Riot e Resolução de Match Interno
 */
export async function fetchAndResolveMatch(tournamentCode: string, gameId: number) {
  const result = await processMatchResult(tournamentCode, gameId);
  if (!result.success) return { success: false, error: result.error };

  const normalized = result.data!;
  const matchId = `${normalized.platformId}_${normalized.gameId}`.toUpperCase();
  console.log(`[IngestMatch] Buscando detalhes na Riot para: ${matchId}`);

  let matchDetails: MatchDto;
  try {
    matchDetails = await getMatchById(matchId);
  } catch (err) {
    console.error(`[IngestMatch] Erro ao buscar Riot API para ${matchId}:`, err);
    return { success: false, error: "Erro ao buscar detalhes do match" };
  }

  const supabase = createAdminClient();
  const { data: matchInternal, error: matchError } = await supabase
    .from("matches")
    .select("id")
    .eq("tournament_code", tournamentCode)
    .single();

  if (matchError || !matchInternal) {
    console.error(`[IngestMatch] Match interno não encontrado para: ${tournamentCode}`);
    return { success: false, error: "Match interno não encontrado" };
  }

  console.log(`[IngestMatch] Match interno resolvido: ${matchInternal.id}`);

  return { 
    success: true, 
    data: { ...normalized, matchId, matchDetails, localMatchId: matchInternal.id } as ResolvedMatchData 
  };
}

/**
 * Subtarefa 3: Persistência em match_games
 */
export async function persistMatchGame(tournamentCode: string, gameId: number) {
  console.log(`[IngestMatch] Subtarefa 3 iniciada: Persistindo match_games para ${tournamentCode} / ${gameId}`);

  const resolved = await fetchAndResolveMatch(tournamentCode, gameId);
  if (!resolved.success) return { success: false, error: resolved.error };

  const { matchDetails, localMatchId } = resolved.data!;
  const supabase = createAdminClient();

  const { data: existing } = await supabase
    .from("match_games")
    .select("id")
    .eq("match_id", localMatchId)
    .eq("riot_game_id", matchDetails.info.gameId.toString())
    .maybeSingle();

  if (existing) {
    console.log(`[IngestMatch] Registro match_games já existe (id: ${existing.id}). Pulando inserção.`);
    return { success: true, data: { matchGameId: existing.id } };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("match_games")
    .insert({
      match_id: localMatchId,
      game_number: 1, 
      riot_game_id: matchDetails.info.gameId.toString(),
      duration_sec: Math.floor(matchDetails.info.gameDuration),
      winner_id: null 
    })
    .select("id")
    .single();

  if (insertError) {
    console.error(`[IngestMatch] Erro ao persistir match_games:`, insertError);
    return { success: false, error: insertError.message };
  }

  console.log(`[IngestMatch] Sucesso! match_games criado: ${inserted.id}`);
  return { success: true, data: { matchGameId: inserted.id } };
}

/**
 * Subtarefa 4: Persistência de Estatísticas em player_stats
 */
export async function persistPlayerStats(tournamentCode: string, gameId: number) {
  console.log(`[IngestMatch] Subtarefa 4 iniciada: Persistindo player_stats para ${tournamentCode} / ${gameId}`);

  // 1. Garantir que o match_game existe e obter detalhes da Riot
  const gameResult = await persistMatchGame(tournamentCode, gameId);
  if (!gameResult.success) return { success: false, error: gameResult.error };

  const matchResult = await fetchAndResolveMatch(tournamentCode, gameId);
  if (!matchResult.success) return { success: false, error: matchResult.error };

  const { matchDetails } = matchResult.data!;
  const matchGameId = gameResult.data!.matchGameId;
  const supabase = createAdminClient();

  let insertedCount = 0;
  let skippedCount = 0;
  const unresolvedPlayers: string[] = [];

  // 2. Processar cada participante da Riot
  for (const participant of matchDetails.info.participants) {
    const puuid = participant.puuid;

    // A. Localizar jogador interno por puuid
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id, team_id")
      .eq("puuid", puuid)
      .maybeSingle();

    if (playerError || !player) {
      console.warn(`[IngestMatch] Jogador não resolvido internamente (puuid: ${puuid}). Pulando stats.`);
      unresolvedPlayers.push(puuid);
      skippedCount++;
      continue;
    }

    // B. Verificar Idempotência para este player neste game
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

    // C. Mapear e Inserir estatísticas suportadas
    const { error: insertError } = await supabase
      .from("player_stats")
      .insert({
        game_id: matchGameId,
        player_id: player.id,
        team_id: player.team_id,
        kills: participant.kills,
        deaths: participant.deaths,
        assists: participant.assists,
        gold_earned: participant.goldEarned,
        cs: participant.totalMinionsKilled + (participant.neutralMinionsKilled || 0),
        vision_score: participant.visionScore,
        damage_dealt: participant.totalDamageDealtToChampions,
        win: participant.win,
        champion: participant.championName,
        game_duration: Math.floor(matchDetails.info.gameDuration)
      });

    if (insertError) {
      console.error(`[IngestMatch] Erro ao inserir stats para player ${player.id}:`, insertError.message);
      skippedCount++;
    } else {
      insertedCount++;
    }
  }


  console.log(`[IngestMatch] Subtarefa 4 concluída. Inseridos: ${insertedCount}, Pulados/Erros: ${skippedCount}`);

  return {
    success: true,
    data: {
      inserted: insertedCount,
      skipped: skippedCount,
      unresolvedPlayers
    }
  };
}

/**
 * Subtarefa 5: Finalização da Ingestão
 */
export async function finalizeMatchIngestion(tournamentCode: string, gameId: number) {
  console.log(`[IngestMatch] Subtarefa 5 iniciada: Finalizando ${tournamentCode} / ${gameId}`);

  // 1. Persistência de dados
  const gameRes = await persistMatchGame(tournamentCode, gameId);
  if (!gameRes.success) return { success: false, error: gameRes.error };

  const statsRes = await persistPlayerStats(tournamentCode, gameId);
  if (!statsRes.success) return { success: false, error: statsRes.error };

  // 2. Resolver dados necessários ANTES de marcar como processed
  const resolved = await fetchAndResolveMatch(tournamentCode, gameId);
  if (!resolved.success) return { success: false, error: resolved.error };
  const { localMatchId } = resolved.data!;

  const supabase = createAdminClient();

  // 3. Marcar como processado
  const { error: procError } = await supabase
    .from("tournament_match_results")
    .update({ processed: true })
    .eq("tournament_code", tournamentCode)
    .eq("game_id", gameId);

  if (procError) {
    console.error(`[IngestMatch] Erro ao marcar como processado:`, procError);
    return { success: false, error: "Falha ao marcar registro como processado" };
  }

  // 4. Atualizar status da partida para FINISHED
  const { error: matchError } = await supabase
    .from("matches")
    .update({
      status: 'FINISHED',
      finished_at: new Date().toISOString()
    })
    .eq("id", localMatchId);

  if (matchError) {
    console.error(`[IngestMatch] Erro ao atualizar status da partida:`, matchError);
    return { success: false, error: "Falha ao finalizar status da partida" };
  }

  return {
    success: true,
    data: {
      localMatchId,
      matchGameId: gameRes.data!.matchGameId
    }
  };
}

