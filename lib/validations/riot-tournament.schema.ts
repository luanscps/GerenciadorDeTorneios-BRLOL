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
  // tournament-v5 usa "allowedParticipants" com PUUIDs, NÃO "allowedSummonerIds"
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

// ── LobbyEvent com timestamp coercido de epoch-ms string → Date ───────────────
export const LobbyEventSchema = z.object({
  summonerId: z.string(),
  eventType: z.string(),
  timestamp: z
    .string()
    .transform((v) => new Date(Number(v)))
    .refine((d) => !isNaN(d.getTime()), "timestamp de LobbyEvent inválido"),
});

export const LobbyEventResponseSchema = z.object({
  eventList: z.array(LobbyEventSchema),
});

// ── MatchParticipant com participantId para pick order ───────────────────────
export const MatchParticipantSchema = z.object({
  puuid: PuuidSchema,
  participantId: z.number().int().min(1).max(10),
  summonerName: z.string(),
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
