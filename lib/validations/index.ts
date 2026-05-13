import { z } from "zod";

// ─── Schemas de formulários do app ────────────────────────────────────────────

export const riotIdSchema = z.object({
  riotId: z.string().min(3).max(50)
    .refine(v => v.includes("#"), { message: "Use Nome#TAG" })
    .refine(v => { const [n,t] = v.split("#"); return n.length>=3 && t && t.length>=2 && t.length<=5; }, { message: "Nome: min 3 | Tag: 2-5 chars" }),
});

export const createTournamentSchema = z.object({
  name: z.string().min(3).max(60),
  slug: z.string().min(3).max(60).regex(/^[a-z0-9-]+$/, "Apenas minusculas, numeros e hifen"),
  description: z.string().max(500).optional(),
  queue_type: z.enum(["RANKED_SOLO_5x5","RANKED_FLEX_SR","NORMAL_5x5_DRAFT","ARAM"]),
  bracket_type: z.enum(["single_elimination","double_elimination","round_robin","swiss"]),
  max_teams: z.number({ coerce: true }).int().min(4).max(64),
  prize_pool: z.string().max(100).optional(),
  starts_at: z.string().optional(),
  min_tier: z.string().optional(),
  max_tier: z.string().optional(),
});

export const createTeamSchema = z.object({
  name: z.string().min(2).max(30),
  tag: z.string().min(2).max(5).regex(/^[A-Z0-9]+$/),
  tournament_id: z.string().uuid(),
});

export type RiotIdInput = z.infer<typeof riotIdSchema>;
export type CreateTournamentInput = z.infer<typeof createTournamentSchema>;
export type CreateTeamInput = z.infer<typeof createTeamSchema>;

// ─── Re-exports de schemas Riot (tournament + match) ──────────────────────────
export {
  PuuidSchema,
  PickTypeSchema,
  MapTypeSchema,
  SpectatorTypeSchema,
  TournamentCodeParametersSchema,
  TournamentCodeSchema,
  LobbyEventSchema,
  LobbyEventResponseSchema,
  MatchParticipantSchema,
  MatchInfoSchema,
  MatchDtoSchema,
  type ValidatedTournamentCode,
  type ValidatedTournamentCodeParameters,
  type ValidatedLobbyEvent,
  type ValidatedLobbyEventResponse,
  type ValidatedMatchParticipant,
  type ValidatedMatchInfo,
  type ValidatedMatchDto,
} from "@/lib/validations/riot-tournament.schema";
