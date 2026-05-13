/**
 * lib/validations/tournament-codes.schema.ts
 *
 * Schemas Zod para os endpoints de geração de tournament codes.
 */
import { z } from "zod";

// ── Corpo do POST /api/riot/tournament/codes/by-match ─────────────────────────
export const GenerateByMatchBodySchema = z.object({
  match_id: z.string().uuid({ message: "match_id deve ser um UUID válido" }),

  /**
   * Forçar regeração mesmo se codes ainda são válidos (não expirados).
   * Útil quando os times mudaram e você quer atualizar allowedParticipants.
   */
  force_regenerate: z.boolean().optional().default(false),

  /**
   * Incluir PUUIDs dos membros aceitos dos dois times como allowedParticipants.
   * Se false, qualquer jogador pode entrar no lobby (útil para testes).
   */
  lock_participants: z.boolean().optional().default(true),
});

export type GenerateByMatchBody = z.infer<typeof GenerateByMatchBodySchema>;

// ── Corpo do POST /api/riot/tournament/codes/by-stage ─────────────────────────
export const GenerateByStageBodySchema = z.object({
  stage_id: z.string().uuid({ message: "stage_id deve ser um UUID válido" }),

  /** Forçar regeração de todos os matches, mesmo os com codes válidos */
  force_regenerate: z.boolean().optional().default(false),

  /** Incluir PUUIDs como allowedParticipants em cada partida */
  lock_participants: z.boolean().optional().default(true),

  /**
   * Pular matches que já têm codes válidos (não expirados).
   * default: true — economiza chamadas à Riot API.
   */
  skip_valid: z.boolean().optional().default(true),
});

export type GenerateByStageBody = z.infer<typeof GenerateByStageBodySchema>;

// ── Entrada do code entry (estrutura salva em matches.tournament_codes) ───────
export const TournamentCodeEntrySchema = z.object({
  game_number: z.number().int().min(1).max(5),
  code: z.string().min(10),
  used: z.boolean(),
  used_at: z.string().nullable(),
});

export type TournamentCodeEntry = z.infer<typeof TournamentCodeEntrySchema>;
