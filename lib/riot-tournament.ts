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

// ── Alterne para "/lol/tournament/v5" ao receber Production Key ───────────────
const BASE = "/lol/tournament-stub/v5";
const METHOD_PREFIX = "tournament-stub-v5";

function getPlatformUrl(): string {
  const region = (process.env.RIOT_REGION ?? "br1").toLowerCase();
  return `https://${region}.api.riotgames.com`;
}

// ─── Tipos ────────────────────────────────────────────────────────────────────
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

export interface TournamentCodeParameters {
  /** Número de participantes por time (5 para LoL padrão) */
  teamSize: number;
  pickType: PickType;
  mapType: MapType;
  spectatorType: SpectatorType;
  /** Lista de PUUIDs autorizados (opcional — deixe vazio para permitir todos) */
  allowedSummonerIds?: string[];
  metadata?: string;
}

export interface TournamentCode {
  code: string;
  spectators: SpectatorType;
  lobbyName: string;
  metaData: string;
  password: string;
  teamSize: number;
  providerId: number;
  pickType: PickType;
  tournamentId: number;
  lobbyId: string;
  id: number;
  mapType: MapType;
  participants: string[]; // PUUIDs
}

export interface LobbyEvent {
  summonerId: string;
  eventType: string; // "Practice", "Start", etc.
  timestamp: string;
}

export interface LobbyEventResponse {
  eventList: LobbyEvent[];
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

// ─── 1. Registrar Provider ────────────────────────────────────────────────────
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

// ─── 2. Criar Torneio ─────────────────────────────────────────────────────────
/**
 * Cria um torneio associado ao provider.
 * Retorna o tournamentId que será usado em todos os tournament codes.
 */
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

// ─── 3. Gerar Tournament Codes ────────────────────────────────────────────────
/**
 * Gera N tournament codes para um torneio.
 * Cada code corresponde a UMA partida (fase do bracket).
 *
 * @param tournamentId  ID retornado por createTournament()
 * @param count         Quantas partidas/códigos gerar (1–1000)
 * @param params        Configurações da partida
 */
export async function generateTournamentCodes(
  tournamentId: number,
  count: number,
  params: TournamentCodeParameters
): Promise<string[]> {
  const codes = await riotFetch<string[]>(
    `${getPlatformUrl()}${BASE}/codes?count=${count}&tournamentId=${tournamentId}`,
    `${METHOD_PREFIX}:codes`,
    { method: "POST", body: JSON.stringify(params) }
  );
  return codes;
}

// ─── 4. Buscar detalhes de um Code ───────────────────────────────────────────
export async function getTournamentCode(
  tournamentCode: string
): Promise<TournamentCode> {
  return riotFetch<TournamentCode>(
    `${getPlatformUrl()}${BASE}/codes/${tournamentCode}`,
    `${METHOD_PREFIX}:codes`
  );
}

// ─── 5. Atualizar um Code ─────────────────────────────────────────────────────
export async function updateTournamentCode(
  tournamentCode: string,
  params: Pick<TournamentCodeParameters, "pickType" | "mapType" | "spectatorType" | "allowedSummonerIds">
): Promise<void> {
  await riotFetch<void>(
    `${getPlatformUrl()}${BASE}/codes/${tournamentCode}`,
    `${METHOD_PREFIX}:codes`,
    { method: "PUT", body: JSON.stringify(params) }
  );
}

// ─── 6. Listar Lobby Events ───────────────────────────────────────────────────
/**
 * Busca os eventos de lobby de uma partida de torneio.
 * Inclui: jogador entrou, saiu, partida iniciada, resultado.
 *
 * Faça polling a cada 30s para detectar quando a partida terminou.
 */
export async function getLobbyEvents(
  tournamentCode: string
): Promise<LobbyEventResponse> {
  return riotFetch<LobbyEventResponse>(
    `${getPlatformUrl()}${BASE}/lobby/events/by-code/${tournamentCode}`,
    `${METHOD_PREFIX}:events`,
    { revalidate: 0 } // sem cache — dados em tempo real
  );
}

// ─── 7. Fluxo completo para criar uma fase do torneio ─────────────────────────
/**
 * Helper de alto nível: cria provider + torneio + codes em sequência.
 * Útil para inicializar um novo torneio no BRLOL do zero.
 *
 * @returns { providerId, tournamentId, codes }
 */
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
