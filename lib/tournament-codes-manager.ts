/**
 * lib/tournament-codes-manager.ts
 *
 * Lógica central para geração de tournament codes sob demanda.
 *
 * Estratégia:
 *  1. Cada partida (match) usa o riot_tournament_id/riot_provider_id do torneio BRLOL
 *     já registrado em `riot_tournament_registrations`.
 *  2. Codes são gerados uma única vez por match (idempotente).
 *  3. Se codes_expire_at < now() os codes são considerados expirados e regerados.
 *  4. Quantidade de codes = best_of da partida (BO1→1, BO3→3, BO5→5).
 *
 * Estrutura do campo `tournament_codes` (jsonb) em `matches`:
 * [
 *   { game_number: 1, code: "BR_XXXX", used: false, used_at: null },
 *   { game_number: 2, code: "BR_YYYY", used: false, used_at: null },
 *   ...
 * ]
 *
 * Expiração: codes_expire_at = codes_generated_at + 90 dias (padrão Riot).
 */

import { createServiceRoleClient } from "@/lib/supabase/server";
import {
  generateTournamentCodes,
  type TournamentCodeParameters,
} from "@/lib/riot-tournament";

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface TournamentCodeEntry {
  game_number: number;
  code: string;
  used: boolean;
  used_at: string | null;
}

export interface GenerateCodesForMatchResult {
  match_id: string;
  codes: TournamentCodeEntry[];
  generated_at: string;
  expire_at: string;
  /** true = codes já existiam e estavam válidos (retorno de cache) */
  from_cache: boolean;
  /** true = codes existiam mas estavam expirados e foram regerados */
  regenerated: boolean;
}

export interface GenerateCodesForStageResult {
  stage_id: string;
  total_matches: number;
  results: GenerateCodesForMatchResult[];
  errors: { match_id: string; error: string }[];
}

// ── Constantes ────────────────────────────────────────────────────────────────

/** Margem de segurança: considerar codes como expirados 7 dias antes do prazo real */
const EXPIRY_SAFETY_MARGIN_DAYS = 7;

/** Expiração real da Riot: 90 dias */
const RIOT_CODE_TTL_DAYS = 90;

// ── Helpers ───────────────────────────────────────────────────────────────────

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function isExpiredOrMissing(codesExpireAt: string | null): boolean {
  if (!codesExpireAt) return true;
  const expiry = new Date(codesExpireAt);
  const safetyDeadline = addDays(new Date(), EXPIRY_SAFETY_MARGIN_DAYS);
  // expired se a expiração é antes da nossa margem de segurança
  return expiry <= safetyDeadline;
}

function buildCodeParams(
  bestOf: number,
  puuids: string[]
): { count: number; params: TournamentCodeParameters } {
  // count = número máximo de games possíveis para o formato
  const count = bestOf;
  const params: TournamentCodeParameters = {
    teamSize: 5,
    pickType: "TOURNAMENT_DRAFT",
    mapType: "SUMMONERS_RIFT",
    spectatorType: "ALL",
    // PUUIDs dos 10 jogadores (5 de cada time). Se vazio, qualquer um pode entrar.
    ...(puuids.length > 0 ? { allowedParticipants: puuids } : {}),
  };
  return { count, params };
}

// ── Função principal: gerar (ou reusar) codes para 1 match ───────────────────

export async function generateCodesForMatch(
  matchId: string,
  options: {
    /** Forçar regeração mesmo se codes ainda são válidos */
    forceRegenerate?: boolean;
    /** Incluir PUUIDs dos jogadores como allowedParticipants. Se false → lobby aberto */
    lockParticipants?: boolean;
  } = {}
): Promise<GenerateCodesForMatchResult> {
  const { forceRegenerate = false, lockParticipants = false } = options;

  const supabase = createServiceRoleClient();

  // ── 1. Buscar match + registration do torneio ─────────────────────────────
  const { data: match, error: matchErr } = await supabase
    .from("matches")
    .select(
      `id, best_of, tournament_id, team_a_id, team_b_id,
       tournament_codes, codes_generated_at, codes_expire_at,
       riot_tournament_id, riot_provider_id`
    )
    .eq("id", matchId)
    .single();

  if (matchErr || !match) {
    throw new Error(`Match não encontrado: ${matchId}`);
  }

  // ── 2. Verificar idempotência — codes válidos já existem? ─────────────────
  const codesArray = (match.tournament_codes as TournamentCodeEntry[] | null) ?? [];
  const alreadyGenerated = codesArray.length > 0;
  const expired = isExpiredOrMissing(match.codes_expire_at);

  if (alreadyGenerated && !expired && !forceRegenerate) {
    return {
      match_id: matchId,
      codes: codesArray,
      generated_at: match.codes_generated_at!,
      expire_at: match.codes_expire_at!,
      from_cache: true,
      regenerated: false,
    };
  }

  // ── 3. Buscar riot_tournament_registration do torneio ─────────────────────
  const { data: registration, error: regErr } = await supabase
    .from("riot_tournament_registrations")
    .select("riot_provider_id, riot_tournament_id")
    .eq("tournament_id", match.tournament_id)
    .single();

  if (regErr || !registration) {
    throw new Error(
      `Torneio ${match.tournament_id} não tem registration na Riot API. ` +
      `Execute POST /api/riot/tournament primeiro.`
    );
  }

  const riotTournamentId = Number(registration.riot_tournament_id);

  // ── 4. Buscar PUUIDs dos jogadores (se lockParticipants = true) ───────────
  let puuids: string[] = [];
  if (lockParticipants && match.team_a_id && match.team_b_id) {
    const { data: members } = await supabase
      .from("team_members")
      .select("riot_accounts(puuid)")
      .in("team_id", [match.team_a_id, match.team_b_id])
      .eq("status", "accepted");

    if (members) {
      puuids = members
        .flatMap((m: any) => {
          const ra = m.riot_accounts;
          if (!ra) return [];
          return Array.isArray(ra) ? ra.map((r: any) => r.puuid) : [ra.puuid];
        })
        .filter(Boolean)
        // PUUID válido tem 78 caracteres
        .filter((p: string) => p.length === 78)
        // Riot aceita máx 10 participantes
        .slice(0, 10);
    }
  }

  // ── 5. Gerar codes na Riot API ────────────────────────────────────────────
  const bestOf = match.best_of ?? 1;
  const { count, params } = buildCodeParams(bestOf, puuids);

  const rawCodes = await generateTournamentCodes(riotTournamentId, count, params);

  // ── 6. Montar array estruturado ───────────────────────────────────────────
  const now = new Date();
  const expireAt = addDays(now, RIOT_CODE_TTL_DAYS);

  const newCodes: TournamentCodeEntry[] = rawCodes.map((code, idx) => ({
    game_number: idx + 1,
    code,
    used: false,
    used_at: null,
  }));

  // ── 7. Persistir no match ─────────────────────────────────────────────────
  const { error: updateErr } = await supabase
    .from("matches")
    .update({
      tournament_codes: newCodes,
      codes_generated_at: now.toISOString(),
      codes_expire_at: expireAt.toISOString(),
      riot_tournament_id: riotTournamentId,
      riot_provider_id: Number(registration.riot_provider_id),
      updated_at: now.toISOString(),
    })
    .eq("id", matchId);

  if (updateErr) {
    throw new Error(`Falha ao persistir codes no match ${matchId}: ${updateErr.message}`);
  }

  return {
    match_id: matchId,
    codes: newCodes,
    generated_at: now.toISOString(),
    expire_at: expireAt.toISOString(),
    from_cache: false,
    regenerated: alreadyGenerated && expired,
  };
}

// ── Gerar codes para todas as partidas de uma stage ──────────────────────────

export async function generateCodesForStage(
  stageId: string,
  options: {
    forceRegenerate?: boolean;
    lockParticipants?: boolean;
    /** Se true, pula matches que já têm codes válidos (default: true) */
    skipValid?: boolean;
  } = {}
): Promise<GenerateCodesForStageResult> {
  const { forceRegenerate = false, lockParticipants = false, skipValid = true } = options;

  const supabase = createServiceRoleClient();

  // Buscar todas as partidas da stage (apenas SCHEDULED ou IN_PROGRESS)
  const { data: matches, error: stageErr } = await supabase
    .from("matches")
    .select("id, status, codes_expire_at, tournament_codes")
    .eq("stage_id", stageId)
    .in("status", ["SCHEDULED", "IN_PROGRESS"])
    .order("round", { ascending: true })
    .order("match_order", { ascending: true });

  if (stageErr) {
    throw new Error(`Erro ao buscar matches da stage ${stageId}: ${stageErr.message}`);
  }

  if (!matches || matches.length === 0) {
    return {
      stage_id: stageId,
      total_matches: 0,
      results: [],
      errors: [],
    };
  }

  const results: GenerateCodesForMatchResult[] = [];
  const errors: { match_id: string; error: string }[] = [];

  // Processar em série para não explodir rate limit
  for (const m of matches) {
    const codesArray = (m.tournament_codes as TournamentCodeEntry[] | null) ?? [];
    const hasValidCodes =
      codesArray.length > 0 && !isExpiredOrMissing(m.codes_expire_at);

    if (skipValid && hasValidCodes && !forceRegenerate) {
      // Retornar cache sem chamar Riot API
      results.push({
        match_id: m.id,
        codes: codesArray,
        generated_at: "", // já persisted, não precisamos retornar
        expire_at: m.codes_expire_at!,
        from_cache: true,
        regenerated: false,
      });
      continue;
    }

    try {
      const result = await generateCodesForMatch(m.id, {
        forceRegenerate,
        lockParticipants,
      });
      results.push(result);
    } catch (err) {
      errors.push({
        match_id: m.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  return {
    stage_id: stageId,
    total_matches: matches.length,
    results,
    errors,
  };
}

// ── Marcar um code como usado ─────────────────────────────────────────────────

export async function markCodeAsUsed(
  matchId: string,
  code: string
): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: match } = await supabase
    .from("matches")
    .select("tournament_codes")
    .eq("id", matchId)
    .single();

  if (!match) throw new Error(`Match ${matchId} não encontrado`);

  const codes = (match.tournament_codes as TournamentCodeEntry[]) ?? [];
  const updated = codes.map((entry) =>
    entry.code === code
      ? { ...entry, used: true, used_at: new Date().toISOString() }
      : entry
  );

  await supabase
    .from("matches")
    .update({ tournament_codes: updated, updated_at: new Date().toISOString() })
    .eq("id", matchId);
}
