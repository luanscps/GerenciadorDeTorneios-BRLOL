import { createAdminClient } from "../supabase/admin";
import { getMatchById, MatchDto } from "../riot";

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
  matchId: string;        // Ex: BR1_123456
  matchDetails: MatchDto; // Dados completos da Riot
  localMatchId: string;   // UUID interno da tabela 'matches'
}

/**
 * Subtarefa 1: Processador de Resultados (Estrutura Básica)
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
    data: { ...normalized, matchId, matchDetails, localMatchId: matchInternal.id } as ResolvedMatchData,
  };
}

/**
 * Subtarefa 3: Persistência em match_games
 */
export async function persistMatchGame(tournamentCode: string, gameId: number) {
  console.log(`[IngestMatch] Subtarefa 3: Persistindo match_games para ${tournamentCode} / ${gameId}`);

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
    console.log(`[IngestMatch] match_games já existe (id: ${existing.id}). Pulando.`);
    return { success: true, data: { matchGameId: existing.id } };
  }

  const { data: inserted, error: insertError } = await supabase
    .from("match_games")
    .insert({
      match_id: localMatchId,
      game_number: 1,
      riot_game_id: matchDetails.info.gameId.toString(),
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

/**
 * Subtarefa 4: Persistência de Estatísticas em player_stats
 *
 * FIX (Nó 1): Cadeia de resolução corrigida:
 *   Riot API → participant.puuid
 *     → riot_accounts.puuid         (tabela correta, não players.puuid)
 *     → players.riot_account_id     (FK que vincula as duas tabelas)
 *     → team_members.riot_account_id (resolve time atual do jogador)
 *
 * Antes: buscava players.puuid diretamente → 0 resultados pois
 * riot_account_id estava NULL em todos os registros.
 */
export async function persistPlayerStats(tournamentCode: string, gameId: number) {
  console.log(`[IngestMatch] Subtarefa 4: Persistindo player_stats para ${tournamentCode} / ${gameId}`);

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

  for (const participant of matchDetails.info.participants) {
    const puuid = participant.puuid;

    // ── PASSO 1: Resolver riot_account pelo puuid ──────────────────────────────
    // O puuid correto vive em riot_accounts, não em players
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

    // ── PASSO 2: Resolver player pelo riot_account_id ──────────────────────────
    // A FK players.riot_account_id aponta para riot_accounts.id
    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("id")
      .eq("riot_account_id", riotAccount.id)
      .maybeSingle();

    if (playerError || !player) {
      console.warn(
        `[IngestMatch] riot_account ${riotAccount.id} não tem player vinculado. ` +
        `profile_id=${riotAccount.profile_id}. Pulando stats.`
      );
      unresolvedPlayers.push(puuid);
      skippedCount++;
      continue;
    }

    // ── PASSO 3: Resolver team_id atual via team_members ───────────────────────
    // Time do jogador vem de team_members, não de players.team_id (dropado)
    const { data: membership } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("riot_account_id", riotAccount.id)
      .eq("status", "ACCEPTED")
      .maybeSingle();

    const teamId = membership?.team_id ?? null;

    // ── PASSO 4: Idempotência ──────────────────────────────────────────────────
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

    // ── PASSO 5: Inserir estatísticas ─────────────────────────────────────────
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
      console.log(`[IngestMatch] Stats inseridos: player=${player.id} team=${teamId ?? 'sem time'}`);
      insertedCount++;
    }
  }

  if (unresolvedPlayers.length > 0) {
    console.warn(
      `[IngestMatch] ${unresolvedPlayers.length} participante(s) não resolvido(s) — ` +
      `puuids sem riot_account ou player vinculado:\n` +
      unresolvedPlayers.map((p) => `  - ${p}`).join("\n")
    );
  }

  console.log(`[IngestMatch] Subtarefa 4 concluída. Inseridos: ${insertedCount}, Pulados: ${skippedCount}`);

  return {
    success: true,
    data: { inserted: insertedCount, skipped: skippedCount, unresolvedPlayers },
  };
}

/**
 * Subtarefa 5: Finalização da Ingestão
 */
export async function finalizeMatchIngestion(tournamentCode: string, gameId: number) {
  console.log(`[IngestMatch] Subtarefa 5: Finalizando ${tournamentCode} / ${gameId}`);

  const gameRes = await persistMatchGame(tournamentCode, gameId);
  if (!gameRes.success) return { success: false, error: gameRes.error };

  const statsRes = await persistPlayerStats(tournamentCode, gameId);
  if (!statsRes.success) return { success: false, error: statsRes.error };

  const resolved = await fetchAndResolveMatch(tournamentCode, gameId);
  if (!resolved.success) return { success: false, error: resolved.error };
  const { localMatchId } = resolved.data!;

  const supabase = createAdminClient();

  const { error: procError } = await supabase
    .from("tournament_match_results")
    .update({ processed: true })
    .eq("tournament_code", tournamentCode)
    .eq("game_id", gameId);

  if (procError) {
    console.error(`[IngestMatch] Erro ao marcar como processado:`, procError);
    return { success: false, error: "Falha ao marcar registro como processado" };
  }

  const { error: matchError } = await supabase
    .from("matches")
    .update({ status: "FINISHED", finished_at: new Date().toISOString() })
    .eq("id", localMatchId);

  if (matchError) {
    console.error(`[IngestMatch] Erro ao atualizar status da partida:`, matchError);
    return { success: false, error: "Falha ao finalizar status da partida" };
  }

  return {
    success: true,
    data: {
      localMatchId,
      matchGameId: gameRes.data!.matchGameId,
      statsInserted: statsRes.data?.inserted ?? 0,
      unresolvedPlayers: statsRes.data?.unresolvedPlayers ?? [],
    },
  };
}
