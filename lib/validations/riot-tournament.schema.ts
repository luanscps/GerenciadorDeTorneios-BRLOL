import { z } from "zod";

// ── PUUID: formato UUID estendido da Riot (78 chars) ─────────────────────────
export const PuuidSchema = z
  .string()
  .regex(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{20}$/,
    "PUUID inválido: formato incorreto"
  );

// ── Enums validados em runtime ────────────────────────────────────────────────
export const PickTypeSchema = z.enum([
  "BLIND_PICK",
  "DRAFT_MODE",
  "ALL_RANDOM",
  "TOURNAMENT_DRAFT",
]);

export const MapTypeSchema = z.enum([
  "SUMMONERS_RIFT",
  "TWISTED_TREELINE",
  "HOWLING_ABYSS",
]);

export const SpectatorTypeSchema = z.enum(["NONE", "LOBBYONLY", "ALL"]);

// ── TournamentCodeParameters (v5 usa allowedParticipants com PUUIDs) ──────────
export const TournamentCodeParametersSchema = z.object({
  teamSize: z.number().int().min(1).max(5),
  pickType: PickTypeSchema,
  mapType: MapTypeSchema,
  spectatorType: SpectatorTypeSchema,
  // tournament-v5 usa "allowedParticipants" com PUUIDs
  // "allowedSummonerIds" era da v4 e NÃO é aceito na v5
  allowedParticipants: z.array(PuuidSchema).optional(),
  metadata: z.string().max(256).optional(),
});

// ── TournamentCode retornado pela API ────────────────────────────────────────
export const TournamentCodeSchema = z.object({
  code: z.string(),
  spectators: SpectatorTypeSchema,
  lobbyName: z.string(),
  metaData: z.string(),
  password: z.string(),
  teamSize: z.number().int(),
  providerId: z.number().int().positive(),
  pickType: PickTypeSchema,
  tournamentId: z.number().int().positive(),
  lobbyId: z.string(),
  id: z.number().int().positive(),
  mapType: MapTypeSchema,
  participants: z.array(PuuidSchema),
});

// ── LobbyEvent com timestamp coercido e eventType tipado ──────────────────────
/**
 * Valores documentados de eventType (Riot Games Developer Relations, 2024).
 * Usar .or(z.string()) como fallback para novos tipos não documentados.
 */
export const LobbyEventTypeSchema = z
  .enum([
    "PracticeGameCreatedEvent",   // Lobby criado
    "PlayerJoinedGameEvent",      // Jogador entrou
    "PlayerSwitchedTeamEvent",    // Jogador trocou de time
    "PlayerQuitGameEvent",        // Jogador saiu do lobby
    "ChampSelectStartedEvent",    // Champ select iniciou
    "GameAllocationStartedEvent", // Loading screen
    "GameAllocatedToLsmEvent",    // Jogo iniciou
  ])
  .or(z.string()); // fallback para eventTypes futuros não documentados

export const LobbyEventSchema = z.object({
  summonerId: z.string(),
  eventType: LobbyEventTypeSchema,
  /**
   * Riot envia timestamp como epoch-ms em formato string.
   * O transform converte automaticamente para Date.
   */
  timestamp: z
    .string()
    .transform((v) => new Date(Number(v)))
    .refine((d) => !isNaN(d.getTime()), "timestamp de LobbyEvent inválido"),
});

export const LobbyEventResponseSchema = z.object({
  eventList: z.array(LobbyEventSchema),
});

// ── MatchParticipant — alinhado com match-v5 atual (2024+) ───────────────────
export const MatchParticipantSchema = z.object({
  puuid: PuuidSchema,
  /**
   * ID do participante (1–10).
   * 1–5 = Blue Side, 6–10 = Red Side.
   * Necessário para calcular pick order no draft.
   */
  participantId: z.number().int().min(1).max(10),
  /**
   * @deprecated Campo em descontinuação pela Riot desde nov/2023.
   * Pode retornar UUID aleatório para contas novas.
   * Use riotIdGameName + riotIdTagLine para exibição.
   */
  summonerName: z.string().optional(),
  /** Nome do Riot ID (ex: "Faker"). Presente em partidas após nov/2023. */
  riotIdGameName: z.string().optional(),
  /** Tag do Riot ID (ex: "KR1"). Presente em partidas após nov/2023. */
  riotIdTagLine: z.string().optional(),
  championId: z.number().int().positive(),
  championName: z.string(),
  kills: z.number().int().nonnegative(),
  deaths: z.number().int().nonnegative(),
  assists: z.number().int().nonnegative(),
  win: z.boolean(),
  teamId: z.union([z.literal(100), z.literal(200)]),
  totalDamageDealtToChampions: z.number().nonnegative(),
  goldEarned: z.number().nonnegative(),
  totalMinionsKilled: z.number().nonnegative(),
  neutralMinionsKilled: z.number().nonnegative().default(0),
  visionScore: z.number().nonnegative(),
  item0: z.number().int().nonnegative(),
  item1: z.number().int().nonnegative(),
  item2: z.number().int().nonnegative(),
  item3: z.number().int().nonnegative(),
  item4: z.number().int().nonnegative(),
  item5: z.number().int().nonnegative(),
  item6: z.number().int().nonnegative(),
  pentaKills: z.number().int().nonnegative(),
  individualPosition: z.string(),
  teamPosition: z.string(),
});

// ── MatchInfo com gameDuration normalizado (bug pre-patch 11.20) ──────────────
// Antes do patch 11.20 (< 1634000000000 ms), gameDuration vinha em ms.
// Após patch 11.20, gameDuration vem em segundos.
const PATCH_1120_TIMESTAMP_MS = 1_634_000_000_000;

export const MatchInfoSchema = z
  .object({
    gameId: z.number(),
    gameStartTimestamp: z.number().int().positive(),
    gameDuration: z.number().nonnegative(),
    gameMode: z.string(),
    queueId: z.number().int(),
    participants: z.array(MatchParticipantSchema),
    teams: z.array(
      z.object({
        teamId: z.union([z.literal(100), z.literal(200)]),
        win: z.boolean(),
        objectives: z.object({
          baron: z.object({ kills: z.number().int().nonnegative() }),
          dragon: z.object({ kills: z.number().int().nonnegative() }),
          tower: z.object({ kills: z.number().int().nonnegative() }),
        }),
      })
    ),
  })
  .transform((data) => {
    const isOldMatch =
      data.gameStartTimestamp < PATCH_1120_TIMESTAMP_MS &&
      data.gameDuration > 1_000_000;
    const durationSeconds = isOldMatch
      ? Math.floor(data.gameDuration / 1000)
      : data.gameDuration;
    return { ...data, gameDuration: durationSeconds };
  });

export const MatchDtoSchema = z.object({
  metadata: z.object({
    matchId: z.string(),
    participants: z.array(PuuidSchema),
  }),
  info: MatchInfoSchema,
});

// ── Tipos inferidos dos schemas ───────────────────────────────────────────────
export type ValidatedTournamentCode = z.infer<typeof TournamentCodeSchema>;
export type ValidatedTournamentCodeParameters = z.infer<typeof TournamentCodeParametersSchema>;
export type ValidatedLobbyEvent = z.infer<typeof LobbyEventSchema>;
export type ValidatedLobbyEventResponse = z.infer<typeof LobbyEventResponseSchema>;
export type ValidatedMatchParticipant = z.infer<typeof MatchParticipantSchema>;
export type ValidatedMatchInfo = z.infer<typeof MatchInfoSchema>;
export type ValidatedMatchDto = z.infer<typeof MatchDtoSchema>;
export type ValidatedLobbyEventType = z.infer<typeof LobbyEventTypeSchema>;
