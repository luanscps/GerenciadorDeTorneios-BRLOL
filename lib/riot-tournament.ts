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
  type ValidatedLobbyEventResponse,
} from "@/lib/validations/riot-tournament.schema";

// ── Alterne para "/lol/tournament/v5" ao receber Production Key ──────────────
const BASE = "/lol/tournament-stub/v5";
const METHOD_PREFIX = "tournament-stub-v5";

function getPlatformUrl(): string {
  const region = (process.env.RIOT_REGION ?? "br1").toLowerCase();
  return `https://${region}.api.riotgames.com`;
}

// ─── Tipos públicos ───────────────────────────────────────────────────────────
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
 * O campo `allowedSummonerIds` era da v4 e NÃO é aceito na v5 —
 * passa silenciosamente ou retorna 400.
 */
export interface TournamentCodeParameters {
  teamSize: number;
  pickType: PickType;
  mapType: MapType;
  spectatorType: SpectatorType;
  /** Lista de PUUIDs autorizados (tournament-v5). Vazio = todos permitidos. */
  allowedParticipants?: string[];
  metadata?: string;
}

export type TournamentCode = ValidatedTournamentCode;
export type LobbyEventResponse = ValidatedLobbyEventResponse;

export interface ProviderRegistration {
  region: string;
  /**
   * URL que a Riot vai chamar via POST com o resultado da partida.
   *
   * RESTRIÇÕES OBRIGATÓRIAS DA RIOT (violação causa rejeição silenciosa):
   * - Apenas http:80 ou https:443 (sem portas customizadas)
   * - TLD aprovado antes de março/2011: .com, .net, .org, .br, etc.
   * - gTLDs modernos como .app, .dev, .io, .xyz são REJEITADOS
   * - Domínios *.vercel.app, *.netlify.app, *.pages.dev NÃO são válidos
   *   para callback de produção (use um domínio próprio)
   *
   * Exemplo válido:  https://api.seudominio.com.br/api/riot/tournament/callback
   * Exemplo inválido: https://seuapp.vercel.app/api/riot/tournament/callback
   */
  url: string;
}

export interface TournamentRegistration {
  name: string;
  providerId: number;
}

// ─── 1. Registrar Provider ───────────────────────────────────────────────────
export async function registerProvider(
  params: ProviderRegistration
): Promise<number> {
  return riotFetch<number>(
    `${getPlatformUrl()}${BASE}/providers`,
    `${METHOD_PREFIX}:providers`,
    { method: "POST", body: JSON.stringify(params) }
  );
}

// ─── 2. Criar Torneio ────────────────────────────────────────────────────────
export async function createTournament(
  params: TournamentRegistration
): Promise<number> {
  return riotFetch<number>(
    `${getPlatformUrl()}${BASE}/tournaments`,
    `${METHOD_PREFIX}:tournaments`,
    { method: "POST", body: JSON.stringify(params) }
  );
}

// ─── 3. Gerar Tournament Codes ───────────────────────────────────────────────
/**
 * Valida os parâmetros via Zod antes de enviar à Riot.
 * Captura cedo: PUUIDs inválidos, enums incorretos, allowedParticipants mal formado.
 *
 * BEST PRACTICE: Gere codes sob demanda (por partida), não todos de uma vez.
 * Tournament codes expiram em 3 meses se não usados.
 */
export async function generateTournamentCodes(
  tournamentId: number,
  count: number,
  params: TournamentCodeParameters
): Promise<string[]> {
  const validated = TournamentCodeParametersSchema.parse(params);
  return riotFetch<string[]>(
    `${getPlatformUrl()}${BASE}/codes?count=${count}&tournamentId=${tournamentId}`,
    `${METHOD_PREFIX}:codes`,
    { method: "POST", body: JSON.stringify(validated) }
  );
}

// ─── 4. Buscar detalhes de um Code ──────────────────────────────────────────
/**
 * Retorno validado pelo TournamentCodeSchema:
 * - participants são PUUIDs válidos (78 chars)
 * - enums pickType / mapType / spectatorType verificados em runtime
 */
export async function getTournamentCode(
  tournamentCode: string
): Promise<TournamentCode> {
  const raw = await riotFetch<unknown>(
    `${getPlatformUrl()}${BASE}/codes/${tournamentCode}`,
    `${METHOD_PREFIX}:codes`
  );
  return TournamentCodeSchema.parse(raw);
}

// ─── 5. Atualizar um Code ────────────────────────────────────────────────────
/**
 * Valida via Zod antes do PUT.
 * Usa .pick() para validar apenas os campos aceitos neste endpoint.
 */
export async function updateTournamentCode(
  tournamentCode: string,
  params: Pick<
    TournamentCodeParameters,
    "pickType" | "mapType" | "spectatorType" | "allowedParticipants"
  >
): Promise<void> {
  const validated = TournamentCodeParametersSchema.pick({
    pickType: true,
    mapType: true,
    spectatorType: true,
    allowedParticipants: true,
  }).parse(params);

  await riotFetch<void>(
    `${getPlatformUrl()}${BASE}/codes/${tournamentCode}`,
    `${METHOD_PREFIX}:codes`,
    { method: "PUT", body: JSON.stringify(validated) }
  );
}

// ─── 6. Listar Lobby Events ──────────────────────────────────────────────────
/**
 * O campo `timestamp` de cada evento é coercido automaticamente pelo
 * LobbyEventSchema: string epoch-ms → Date.
 *
 * Faça polling a cada 30s para detectar quando a partida terminou.
 */
export async function getLobbyEvents(
  tournamentCode: string
): Promise<LobbyEventResponse> {
  const raw = await riotFetch<unknown>(
    `${getPlatformUrl()}${BASE}/lobby/events/by-code/${tournamentCode}`,
    `${METHOD_PREFIX}:events`,
    { revalidate: 0 }
  );
  return LobbyEventResponseSchema.parse(raw);
}

// ─── 7. Helper: pick order por participantId ─────────────────────────────────
/**
 * Mapeia participantId (1–10) para slot de draft e time.
 *
 * A Riot numera participantes 1–5 (Blue) e 6–10 (Red).
 * A sequência real de picks no draft é: [1,6,2,7,3,8,4,9,5,10]
 * (não é 1–10 sequencialmente).
 *
 * @example
 * getPickOrderSlot(1)  → { team: "blue", pickSlot: 1 }  // 1º pick Blue
 * getPickOrderSlot(6)  → { team: "red",  pickSlot: 1 }  // 1º pick Red
 * getPickOrderSlot(10) → { team: "red",  pickSlot: 5 }  // último pick Red
 */
export function getPickOrderSlot(participantId: number): {
  team: "blue" | "red";
  pickSlot: number;
} {
  if (participantId >= 1 && participantId <= 5) {
    return { team: "blue", pickSlot: participantId };
  }
  return { team: "red", pickSlot: participantId - 5 };
}

/**
 * Sequência completa de picks/bans por participantId.
 * Use para ordenar a exibição do draft overlay.
 */
export const PICK_ORDER_SEQUENCE = [1, 6, 2, 7, 3, 8, 4, 9, 5, 10] as const;

// ─── 8. Setup completo de torneio ────────────────────────────────────────────
/**
 * Fluxo completo: registerProvider → createTournament → generateTournamentCodes.
 *
 * ATENÇÃO: para torneios grandes, prefira gerar codes sob demanda por partida
 * em vez de usar matchCount para gerar todos de uma vez. Codes expiram em 3 meses.
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
