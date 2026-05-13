/**
 * lib/riot-tournament.ts
 *
 * Cliente completo para tournament-stub-v5 (desenvolvimento / staging).
 *
 * Quando a Production Key for aprovada, troque:
 *   const BASE = "/lol/tournament-stub/v5"
 * por:
 *   const BASE = "/lol/tournament/v5"
 *
 * Documentação oficial:
 *   https://developer.riotgames.com/apis#tournament-stub-v5
 *   https://developer.riotgames.com/apis#tournament-v5
 */

import { riotFetch } from "@/lib/riot-rate-limiter";
import {
  TournamentCodeSchema,
  TournamentCodeParametersSchema,
  LobbyEventResponseSchema,
  type ValidatedTournamentCode,
  type ValidatedTournamentCodeParameters,
  type ValidatedLobbyEventResponse,
} from "@/lib/validations/riot-tournament.schema";

// ── Alterne para "/lol/tournament/v5" ao receber Production Key ─────────────────
const BASE = "/lol/tournament-stub/v5";
const METHOD_PREFIX = "tournament-stub-v5";

function getPlatformUrl(): string {
  const region = (process.env.RIOT_REGION ?? "br1").toLowerCase();
  return `https://${region}.api.riotgames.com`;
}

// ─── Tipos públicos (re-exportados dos schemas) ───────────────────────────────
export type PickType =
  | "BLIND_PICK"
  | "DRAFT_MODE"
  | "ALL_RANDOM"
  | "TOURNAMENT_DRAFT";

export type MapType =
  | "SUMMONERS_RIFT"
  | "TWISTED_TREELINE"
  | "HOWLING_ABYSS";

export type SpectatorType = "NONE" | "LOBBYONLY" | "ALL";

/**
 * Parâmetros para gerar tournament codes.
 *
 * IMPORTANTE: tournament-v5 usa `allowedParticipants` com PUUIDs.
 * O campo `allowedSummonerIds` era da v4 e não é aceito na v5.
 */
export interface TournamentCodeParameters {
  teamSize: number;
  pickType: PickType;
  mapType: MapType;
  spectatorType: SpectatorType;
  /** Lista de PUUIDs autorizados (tournament-v5). Deixe vazio para permitir todos. */
  allowedParticipants?: string[];
  metadata?: string;
}

export type TournamentCode = ValidatedTournamentCode;
export type LobbyEventResponse = ValidatedLobbyEventResponse;

export interface LobbyEvent {
  summonerId: string;
  eventType: string;
  /** Já convertido para Date (a Riot envia epoch em ms como string) */
  timestamp: Date;
}

export interface ProviderRegistration {
  region: string;
  /** URL que a Riot vai chamar via POST com o resultado da partida */
  url: string;
}

export interface TournamentRegistration {
  name: string;
  providerId: number;
}

// ─── 1. Registrar Provider ───────────────────────────────────────────────────────
/**
 * Registra o servidor do BRLOL como provider de torneios na Riot.
 * Necessário UMA VEZ por ambiente. Guarde o providerId retornado.
 *
 * Em desenvolvimento, a callbackUrl pode ser qualquer HTTPS válida.
 * Use https://gerenciador-de-torneios-brlol.vercel.app/api/riot/tournament/callback
 */
export async function registerProvider(
  params: ProviderRegistration
): Promise<number> {
  const providerId = await riotFetch<number>(
    `${getPlatformUrl()}${BASE}/providers`,
    `${METHOD_PREFIX}:providers`,
    { method: "POST", body: JSON.stringify(params) }
  );
  return providerId;
}

// ─── 2. Criar Torneio ───────────────────────────────────────────────────────────
export async function createTournament(
  params: TournamentRegistration
): Promise<number> {
  const tournamentId = await riotFetch<number>(
    `${getPlatformUrl()}${BASE}/tournaments`,
    `${METHOD_PREFIX}:tournaments`,
    { method: "POST", body: JSON.stringify(params) }
  );
  return tournamentId;
}

// ─── 3. Gerar Tournament Codes ─────────────────────────────────────────────────
export async function generateTournamentCodes(
  tournamentId: number,
  count: number,
  params: TournamentCodeParameters
): Promise<string[]> {
  // Valida os parâmetros antes de enviar — pega erros de PUUID/enum cedo
  TournamentCodeParametersSchema.parse({
    ...params,
    // mapeia para o nome esperado pelo schema se vier do legado
    allowedParticipants: params.allowedParticipants,
  });

  const codes = await riotFetch<string[]>(
    `${getPlatformUrl()}${BASE}/codes?count=${count}&tournamentId=${tournamentId}`,
    `${METHOD_PREFIX}:codes`,
    { method: "POST", body: JSON.stringify(params) }
  );
  return codes;
}

// ─── 4. Buscar detalhes de um Code ──────────────────────────────────────────────
export async function getTournamentCode(
  tournamentCode: string
): Promise<TournamentCode> {
  const raw = await riotFetch<unknown>(
    `${getPlatformUrl()}${BASE}/codes/${tournamentCode}`,
    `${METHOD_PREFIX}:codes`
  );
  // Valida e retorna typed: garante PUUIDs corretos, enums válidos
  return TournamentCodeSchema.parse(raw);
}

// ─── 5. Atualizar um Code ───────────────────────────────────────────────────────────
export async function updateTournamentCode(
  tournamentCode: string,
  params: Pick<TournamentCodeParameters, "pickType" | "mapType" | "spectatorType" | "allowedParticipants">
): Promise<void> {
  await riotFetch<void>(
    `${getPlatformUrl()}${BASE}/codes/${tournamentCode}`,
    `${METHOD_PREFIX}:codes`,
    { method: "PUT", body: JSON.stringify(params) }
  );
}

// ─── 6. Listar Lobby Events ───────────────────────────────────────────────────────
/**
 * Busca os eventos de lobby de uma partida de torneio.
 * O campo `timestamp` de cada evento já vem convertido para Date.
 *
 * Faça polling a cada 30s para detectar quando a partida terminou.
 */
export async function getLobbyEvents(
  tournamentCode: string
): Promise<LobbyEventResponse> {
  const raw = await riotFetch<unknown>(
    `${getPlatformUrl()}${BASE}/lobby/events/by-code/${tournamentCode}`,
    `${METHOD_PREFIX}:events`,
    { revalidate: 0 } // sem cache — dados em tempo real
  );
  // Valida e converte timestamp string → Date automaticamente
  return LobbyEventResponseSchema.parse(raw);
}

// ─── 7. Fluxo completo para criar uma fase do torneio ───────────────────────────
export async function setupTournament(options: {
  tournamentName: string;
  callbackUrl: string;
  region?: string;
  matchCount: number;
  codeParams: TournamentCodeParameters;
}) {
  const region = options.region ?? process.env.RIOT_REGION ?? "BR";

  const providerId = await registerProvider({
    region: region.toUpperCase(),
    url: options.callbackUrl,
  });

  const tournamentId = await createTournament({
    name: options.tournamentName,
    providerId,
  });

  const codes = await generateTournamentCodes(
    tournamentId,
    options.matchCount,
    options.codeParams
  );

  return { providerId, tournamentId, codes };
}
