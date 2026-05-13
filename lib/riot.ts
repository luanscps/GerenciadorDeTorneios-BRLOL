// lib/riot.ts
import { getCached, setCached } from "@/lib/riot-cache";
import { MatchDtoSchema } from "@/lib/validations/riot-tournament.schema";

function getApiKey(): string {
  const key = process.env.RIOT_API_KEY;
  if (!key) throw new Error("RIOT_API_KEY não configurada no servidor.");
  return key;
}

/**
 * Mapeamento de platform host → regional host.
 *
 * Plataformas SEA atuais (2024+):
 *   sg2 = Singapore (unificou ph2 e th2 em 2023)
 *   tw2 = Taiwan
 *   vn2 = Vietnam
 *
 * ph2 e th2 mantidos apenas para compatibilidade com dados históricos.
 */
const REGION_TO_REGIONAL: Record<string, string> = {
  // Americas
  br1: "americas",
  na1: "americas",
  la1: "americas",
  la2: "americas",
  // Europe
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  // Asia
  kr: "asia",
  jp1: "asia",
  // SEA — plataformas atuais
  oc1: "sea",
  sg2: "sea",
  tw2: "sea",
  vn2: "sea",
  // SEA — legado (ph2 e th2 foram migrados para sg2 em 2023)
  ph2: "sea",
  th2: "sea",
};

export function getRegion(): string {
  return (process.env.RIOT_REGION ?? "br1").toLowerCase();
}
export function getRegionalHost(): string {
  const region = getRegion();
  return process.env.RIOT_REGIONAL_HOST ?? REGION_TO_REGIONAL[region] ?? "americas";
}
export function getPlatformUrl(): string {
  return "https://" + getRegion() + ".api.riotgames.com";
}
export function getRegionalUrl(): string {
  return "https://" + getRegionalHost() + ".api.riotgames.com";
}

// ─── Data Dragon: versão dinâmica ──────────────────────────────────────────────
let _ddVersion: string | null = null;

export async function getDDVersion(): Promise<string> {
  if (_ddVersion) return _ddVersion;
  const cached = getCached<string>("dd:version");
  if (cached) { _ddVersion = cached; return cached; }
  try {
    // Usa realms/br.json para obter a versão exata da região BR
    // (mais preciso que versions.json que pode não refletir a versão regional atual)
    const res = await fetch(
      "https://ddragon.leagueoflegends.com/realms/br.json",
      { next: { revalidate: 3600 } }
    );
    const realm = await res.json();
    _ddVersion = realm.v as string;
    setCached("dd:version", _ddVersion, 3600);
    return _ddVersion;
  } catch {
    // Fallback: busca lista geral de versões
    try {
      const res = await fetch(
        "https://ddragon.leagueoflegends.com/api/versions.json",
        { next: { revalidate: 3600 } }
      );
      const versions: string[] = await res.json();
      _ddVersion = versions[0];
      setCached("dd:version", _ddVersion, 3600);
      return _ddVersion;
    } catch {
      _ddVersion = "15.1.1";
      return _ddVersion;
    }
  }
}

async function riotFetch<T>(url: string): Promise<T> {
  const apiKey = getApiKey();
  const res = await fetch(url, {
    headers: { "X-Riot-Token": apiKey },
    next: { revalidate: 300 },
  });
  if (!res.ok) {
    const e = await res.json().catch(() => ({}));
    const msg = e?.status?.message ?? res.statusText;
    throw new Error(`Riot API ${res.status}: ${msg}`);
  }
  return res.json() as Promise<T>;
}

// ─── Endpoints ────────────────────────────────────────────────────────────────

export async function getAccountByRiotId(
  gameName: string,
  tagLine: string
): Promise<RiotAccount> {
  const key = ("account:" + gameName + "#" + tagLine).toLowerCase();
  const cached = getCached<RiotAccount>(key);
  if (cached) return cached;
  const data = await riotFetch<RiotAccount>(
    getRegionalUrl() +
      "/riot/account/v1/accounts/by-riot-id/" +
      encodeURIComponent(gameName) +
      "/" +
      encodeURIComponent(tagLine)
  );
  setCached(key, data, 600);
  return data;
}

export async function getSummonerByPuuid(puuid: string): Promise<Summoner> {
  const key = "summoner:" + puuid;
  const cached = getCached<Summoner>(key);
  if (cached) return cached;
  const data = await riotFetch<Summoner>(
    getPlatformUrl() + "/lol/summoner/v4/summoners/by-puuid/" + puuid
  );
  setCached(key, data, 300);
  return data;
}

export async function getLeagueEntriesByPuuid(
  puuid: string
): Promise<LeagueEntry[]> {
  const key = "league:" + puuid;
  const cached = getCached<LeagueEntry[]>(key);
  if (cached) return cached;
  const data = await riotFetch<LeagueEntry[]>(
    getPlatformUrl() + "/lol/league/v4/entries/by-puuid/" + puuid
  );
  setCached(key, data, 300);
  return data;
}

export async function getTopMasteriesByPuuid(
  puuid: string,
  count = 5
): Promise<ChampionMastery[]> {
  const key = "mastery:" + puuid + ":" + count;
  const cached = getCached<ChampionMastery[]>(key);
  if (cached) return cached;
  const data = await riotFetch<ChampionMastery[]>(
    getPlatformUrl() +
      "/lol/champion-mastery/v4/champion-masteries/by-puuid/" +
      puuid +
      "/top?count=" +
      count
  );
  setCached(key, data, 600);
  return data;
}

export async function getMatchIdsByPuuid(
  puuid: string,
  count = 20,
  queue?: number
): Promise<string[]> {
  const key = "matchids:" + puuid + ":" + count + ":" + (queue ?? "all");
  const cached = getCached<string[]>(key);
  if (cached) return cached;
  const q = queue ? "&queue=" + queue : "";
  const data = await riotFetch<string[]>(
    getRegionalUrl() +
      "/lol/match/v5/matches/by-puuid/" +
      puuid +
      "/ids?count=" +
      count +
      q
  );
  setCached(key, data, 120);
  return data;
}

/**
 * Busca e valida uma partida pelo matchId via MatchDtoSchema (Zod).
 *
 * Garantias do schema:
 * - PUUIDs de todos os participantes são válidos
 * - participantId (1–10) presente (necessário para pick order)
 * - gameDuration normalizado: partidas antigas (< patch 11.20) vinham em ms →
 *   convertido para segundos automaticamente
 * - teamId restrito a 100 (Blue) ou 200 (Red)
 * - neutralMinionsKilled com default 0 quando ausente
 * - summonerName opcional (campo deprecated pela Riot desde nov/2023)
 * - riotIdGameName / riotIdTagLine quando disponíveis
 */
export async function getMatchById(matchId: string): Promise<MatchDto> {
  const key = "match:" + matchId;
  const cached = getCached<MatchDto>(key);
  if (cached) return cached;
  const raw = await riotFetch<unknown>(
    getRegionalUrl() + "/lol/match/v5/matches/" + matchId
  );
  const data = MatchDtoSchema.parse(raw) as MatchDto;
  setCached(key, data, 3600);
  return data;
}

// ─── Asset URLs — Data Dragon ─────────────────────────────────────────────────

export async function profileIconUrl(id: number): Promise<string> {
  const v = await getDDVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/profileicon/${id}.png`;
}

export function championIconByCDragon(
  championId: number | null | undefined
): string {
  const id = championId ?? -1;
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/${id}.png`;
}

export async function championIconUrl(
  name: string | null | undefined
): Promise<string> {
  const v = await getDDVersion();
  if (!name || name === "null" || name.trim() === "") {
    return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/-1.png`;
  }
  const normalized = name.replace(/[^a-zA-Z0-9]/g, "");
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/champion/${normalized}.png`;
}

export function championSplashUrl(
  name: string | null | undefined,
  skinNum = 0
): string {
  if (!name || name === "null" || name.trim() === "") {
    return "https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/unmasked-magician.png";
  }
  const normalized = name.replace(/[^a-zA-Z0-9]/g, "");
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/splash/${normalized}_${skinNum}.jpg`;
}

export function championLoadingUrl(
  name: string | null | undefined,
  skinNum = 0
): string {
  if (!name || name === "null" || name.trim() === "") return "";
  const normalized = name.replace(/[^a-zA-Z0-9]/g, "");
  return `https://ddragon.leagueoflegends.com/cdn/img/champion/loading/${normalized}_${skinNum}.jpg`;
}

export async function itemIconUrl(itemId: number): Promise<string> {
  const v = await getDDVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/item/${itemId}.png`;
}

export async function summonerSpellIconUrl(spellId: string): Promise<string> {
  const v = await getDDVersion();
  return `https://ddragon.leagueoflegends.com/cdn/${v}/img/spell/${spellId}.png`;
}

// ─── Asset URLs — CommunityDragon ─────────────────────────────────────────────

export function rankEmblemUrl(tier: string): string {
  const t = tier.toLowerCase();
  return `https://raw.communitydragon.org/latest/game/assets/loadouts/regalia/crests/ranked/ranked-emblem-${t}.png`;
}

export function profileBorderUrl(level: number): string {
  const BASE =
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images";
  let n: number;
  if (level >= 500) n = 7;
  else if (level >= 300) n = 6;
  else if (level >= 200) n = 5;
  else if (level >= 150) n = 4;
  else if (level >= 100) n = 3;
  else if (level >= 30) n = 2;
  else n = 1;
  return `${BASE}/summoner-level-border-${n}.png`;
}

export function profileIconBorderStyle(level: number): {
  color: string;
  glow: string;
  label: string;
} {
  if (level >= 500) return { color: "#FFD700", glow: "rgba(255,215,0,0.7)",   label: "Ouro Ancestral" };
  if (level >= 400) return { color: "#C0C0FF", glow: "rgba(192,192,255,0.7)", label: "Prata Ancien" };
  if (level >= 300) return { color: "#00D4FF", glow: "rgba(0,212,255,0.6)",   label: "Ciano Elite" };
  if (level >= 200) return { color: "#9B59B6", glow: "rgba(155,89,182,0.6)",  label: "Violeta" };
  if (level >= 150) return { color: "#E74C3C", glow: "rgba(231,76,60,0.6)",   label: "Vermelho" };
  if (level >= 100) return { color: "#00E5CC", glow: "rgba(0,229,204,0.6)",   label: "Teal" };
  if (level >= 50)  return { color: "#C8A84B", glow: "rgba(200,168,75,0.6)",  label: "Dourado" };
  if (level >= 30)  return { color: "#A8A9AD", glow: "rgba(168,169,173,0.5)", label: "Prata" };
  return              { color: "#8B7A6B", glow: "rgba(139,122,107,0.4)", label: "Bronze" };
}

export function masteryIconUrl(_level: number): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/champion-mastery/mastery-mark.png`;
}

export function masteryLevelColor(level: number): string {
  if (level >= 10) return "#FFD700";
  if (level >= 7)  return "#C8A84B";
  if (level >= 6)  return "#9B59B6";
  if (level >= 5)  return "#E74C3C";
  if (level >= 4)  return "#00E5CC";
  return "#8B7A6B";
}

// ─── Data Dragon: JSON estático ───────────────────────────────────────────────

export async function getAllChampions(): Promise<
  Record<string, ChampionBasic>
> {
  const cacheKey = "dd:champions:pt_BR";
  const cached = getCached<Record<string, ChampionBasic>>(cacheKey);
  if (cached) return cached;
  const v = await getDDVersion();
  const res = await fetch(
    `https://ddragon.leagueoflegends.com/cdn/${v}/data/pt_BR/champion.json`,
    { next: { revalidate: 3600 } }
  );
  const json = await res.json();
  const data: Record<string, ChampionBasic> = json.data;
  setCached(cacheKey, data, 3600);
  return data;
}

// ─── Interfaces ───────────────────────────────────────────────────────────────

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

export interface Summoner {
  accountId: string;
  puuid: string;
  profileIconId: number;
  revisionDate: number;
  summonerLevel: number;
}

export interface LeagueEntry {
  leagueId: string;
  queueType: string;
  tier: string;
  rank: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  hotStreak: boolean;
  veteran: boolean;
  freshBlood: boolean;
  inactive: boolean;
}

export interface ChampionMastery {
  championId: number;
  championName: string;
  championLevel: number;
  championPoints: number;
  lastPlayTime: number;
}

export interface ChampionBasic {
  id: string;
  key: string;
  name: string;
  title: string;
  blurb: string;
  tags: string[];
  image: {
    full: string;
    sprite: string;
    group: string;
    x: number;
    y: number;
    w: number;
    h: number;
  };
  stats: Record<string, number>;
}

export interface MatchDto {
  metadata: { matchId: string; participants: string[] };
  info: MatchInfo;
}

export interface MatchInfo {
  gameId: number;
  /**
   * Duração em SEGUNDOS (normalizado pelo MatchDtoSchema).
   * Partidas antes do patch 11.20 retornavam em ms — o schema converte automaticamente.
   */
  gameDuration: number;
  gameMode: string;
  queueId: number;
  /** Epoch em milissegundos */
  gameStartTimestamp: number;
  participants: MatchParticipant[];
  teams: MatchTeam[];
}

export interface MatchTeam {
  teamId: 100 | 200;
  win: boolean;
  objectives: {
    baron: { kills: number };
    dragon: { kills: number };
    tower: { kills: number };
  };
}

export interface MatchParticipant {
  puuid: string;
  /**
   * ID do participante (1–10). Determina o time e slot de pick no draft.
   * 1–5 = Blue Side, 6–10 = Red Side.
   * Use getPickOrderSlot(participantId) de lib/riot-tournament.ts para mapear.
   */
  participantId: number;
  /**
   * @deprecated Campo em processo de descontinuação pela Riot (nov/2023).
   * Para contas novas pode retornar UUID aleatório em vez do nome do jogador.
   * Use riotIdGameName + riotIdTagLine para exibição.
   */
  summonerName?: string;
  /** Nome da parte do Riot ID (ex: "Faker"). Disponível em partidas recentes. */
  riotIdGameName?: string;
  /** Tag da parte do Riot ID (ex: "KR1"). Disponível em partidas recentes. */
  riotIdTagLine?: string;
  championName: string;
  championId: number;
  kills: number;
  deaths: number;
  assists: number;
  win: boolean;
  teamId: 100 | 200;
  totalDamageDealtToChampions: number;
  goldEarned: number;
  totalMinionsKilled: number;
  neutralMinionsKilled: number;
  visionScore: number;
  item0: number;
  item1: number;
  item2: number;
  item3: number;
  item4: number;
  item5: number;
  item6: number;
  pentaKills: number;
  individualPosition: string;
  teamPosition: string;
}
