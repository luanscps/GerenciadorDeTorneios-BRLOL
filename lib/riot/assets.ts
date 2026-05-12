/**
 * lib/riot/assets.ts
 *
 * Central de URLs de assets do ecossistema Riot Games.
 * Combina Data Dragon (DDragon) e CommunityDragon (CDragon/latest).
 *
 * Regras:
 *  - DDragon   → ícones de campeão (square), spells, profile icons
 *  - CDragon   → circle HUD, ranked emblems, lane/role icons, level borders
 *  - Sempre usa `latest` no CDragon para garantir assets do patch atual
 *  - Singletons de Promise para versão e mapa de campeões (sem race condition)
 */

// ─────────────────────────────────────────────────────────────────────────────
// Constantes base
// ─────────────────────────────────────────────────────────────────────────────

const DDRAGON_BASE = 'https://ddragon.leagueoflegends.com';
const CDRAGON_BASE = 'https://raw.communitydragon.org/latest';
const CDRAGON_CLASH = `${CDRAGON_BASE}/plugins/rcp-fe-lol-clash/global/default/assets/images/position-icons`;
const CDRAGON_RANKED = `${CDRAGON_BASE}/game/assets/loadouts/regalia/crests/ranked`;
const CDRAGON_HUD = (nameLower: string) =>
  `${CDRAGON_BASE}/game/assets/characters/${nameLower}/hud`;

/**
 * Base do diretório de molduras/rings de nível (themed-level-ring).
 * Fonte: rcp-fe-lol-static-assets/global/default/images/uikit/themed-level-ring/
 */
const CDRAGON_LEVEL_RING = `${CDRAGON_BASE}/plugins/rcp-fe-lol-static-assets/global/default/images/uikit/themed-level-ring`;

const DD_VERSION_FALLBACK = '15.10.1';

// ─────────────────────────────────────────────────────────────────────────────
// Seção 1 — DDragon Version Resolver (singleton Promise — sem race condition)
// ─────────────────────────────────────────────────────────────────────────────

let _versionPromise: Promise<string> | null = null;

/**
 * Retorna a versão mais recente do DDragon.
 * A Promise é criada uma única vez e reutilizada em todas as chamadas subsequentes.
 */
export function getDDVersion(): Promise<string> {
  if (!_versionPromise) {
    _versionPromise = fetch(`${DDRAGON_BASE}/api/versions.json`)
      .then((r) => r.json() as Promise<string[]>)
      .then((versions) => versions[0] ?? DD_VERSION_FALLBACK)
      .catch(() => DD_VERSION_FALLBACK);
  }
  return _versionPromise;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seção 2 — Champion Map Resolver (singleton Promise)
//
// Retorna Record<championId, champKey>:
//   ex: { 103: 'Ahri', 62: 'MonkeyKing', 1: 'Annie' }
//
// NOTA: O campo `key` do champion.json é o nome do arquivo de asset (não o displayName).
//       Wukong → 'MonkeyKing', Nunu → 'Nunu', etc.
// ─────────────────────────────────────────────────────────────────────────────

let _champMapPromise: Promise<Record<number, string>> | null = null;

/**
 * Retorna o mapa completo championId → champKey (nome de arquivo DDragon/CDragon).
 * Usa pt_BR para consistência com o restante do projeto.
 */
export function getChampionMap(): Promise<Record<number, string>> {
  if (!_champMapPromise) {
    _champMapPromise = getDDVersion().then((version) =>
      fetch(
        `${DDRAGON_BASE}/cdn/${version}/data/pt_BR/champion.json`
      )
        .then((r) => r.json())
        .then((json: { data: Record<string, { key: string }> }) => {
          const map: Record<number, string> = {};
          for (const champKey of Object.keys(json.data)) {
            // champKey = 'Ahri', 'MonkeyKing' etc.
            // json.data[champKey].key = ID numérico como string ('103', '62')
            map[Number(json.data[champKey].key)] = champKey;
          }
          return map;
        })
        .catch(() => ({} as Record<number, string>))
    );
  }
  return _champMapPromise;
}

/**
 * Força o reset dos singletons — útil em testes ou para forçar refetch após patch.
 * Em produção não é necessário chamar.
 */
export function resetAssetCaches(): void {
  _versionPromise = null;
  _champMapPromise = null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seção 3 — DDragon URLs
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Ícone quadrado de campeão — 48x48px (DDragon).
 * Usado em bans e como fallback quando CDragon circle falha.
 * @param champKey  ex: 'Ahri', 'MonkeyKing'
 * @param version   retorno de getDDVersion()
 */
export function champSquareUrl(champKey: string, version: string): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/champion/${champKey}.png`;
}

/**
 * Mapa de summoner spell ID → nome de arquivo DDragon.
 */
export const SPELL_KEY: Record<number, string> = {
  1:  'SummonerBoost',
  3:  'SummonerExhaust',
  4:  'SummonerFlash',
  6:  'SummonerHaste',
  7:  'SummonerHeal',
  11: 'SummonerSmite',
  12: 'SummonerTeleport',
  13: 'SummonerMana',
  14: 'SummonerDot',
  21: 'SummonerBarrier',
  32: 'SummonerSnowball',
};

/**
 * URL do ícone de summoner spell (DDragon).
 * @param spellId  ex: 4 (Flash), 11 (Smite)
 * @param version  retorno de getDDVersion()
 */
export function spellIconUrl(spellId: number, version: string): string {
  const key = SPELL_KEY[spellId] ?? 'SummonerFlash';
  return `${DDRAGON_BASE}/cdn/${version}/img/spell/${key}.png`;
}

/**
 * URL do profile icon (DDragon).
 * @param iconId   número do ícone de perfil
 * @param version  retorno de getDDVersion()
 */
export function profileIconUrl(iconId: number | string, version: string): string {
  return `${DDRAGON_BASE}/cdn/${version}/img/profileicon/${iconId}.png`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Seção 4 — CommunityDragon URLs (sempre `latest`)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retrato circular de HUD do campeão (CDragon latest).
 * Resolução maior e mais suave que o square do DDragon.
 * Fallback recomendado: champSquareUrl()
 *
 * @param champKey  ex: 'Ahri', 'MonkeyKing' (case-insensitive — normalizado para lower)
 *
 * Exemplos:
 *   champCircleUrl('Ahri')       → .../ahri/hud/ahri_circle.png
 *   champCircleUrl('MonkeyKing') → .../monkeyking/hud/monkeyking_circle.png
 */
export function champCircleUrl(champKey: string): string {
  const name = champKey.toLowerCase();
  return `${CDRAGON_HUD(name)}/${name}_circle.png`;
}

/**
 * Emblema de ranked em alta resolução (CDragon latest).
 * Fallback recomendado: texto colorido (comportamento anterior).
 *
 * @param tier  ex: 'GOLD', 'PLATINUM', 'CHALLENGER' (case-insensitive)
 *
 * Tiers válidos: iron, bronze, silver, gold, platinum, emerald,
 *                diamond, master, grandmaster, challenger
 */
export function rankEmblemUrl(tier: string): string {
  return `${CDRAGON_RANKED}/ranked-emblem-${tier.toLowerCase()}.png`;
}

/**
 * Mapeamento de lane/role → slug do arquivo de ícone CDragon Clash.
 */
export const LANE_SLUG: Record<string, string> = {
  // lowercase (Supabase/DB)
  top:     'position-top',
  jungle:  'position-jungle',
  mid:     'position-middle',
  bot:     'position-bottom',
  bottom:  'position-bottom',
  support: 'position-utility',
  utility: 'position-utility',
  fill:    'position-fill',
  // UPPERCASE (Riot API)
  TOP:     'position-top',
  JUNGLE:  'position-jungle',
  MID:     'position-middle',
  MIDDLE:  'position-middle',
  BOTTOM:  'position-bottom',
  BOT:     'position-bottom',
  UTILITY: 'position-utility',
  SUPPORT: 'position-utility',
  FILL:    'position-fill',
};

/**
 * URL do ícone de lane/role (CDragon Clash, latest).
 * Fallback recomendado: texto label (LANE_LABELS do componente).
 *
 * @param lane  ex: 'top', 'MID', 'JUNGLE', 'UTILITY'
 */
export function laneIconUrl(lane: string): string {
  const slug = LANE_SLUG[lane] ?? 'position-fill';
  return `${CDRAGON_CLASH}/${slug}.png`;
}

/**
 * Mapeamento de lane/role → label em português.
 */
export const LANE_LABEL: Record<string, string> = {
  top:     'Top',   TOP:     'Top',
  jungle:  'Jg',   JUNGLE:  'Jg',
  mid:     'Mid',  MID:     'Mid',  MIDDLE: 'Mid',
  bot:     'Bot',  BOTTOM:  'Bot',  BOT:    'Bot',
  bottom:  'Bot',
  support: 'Sup',  UTILITY: 'Sup',  SUPPORT: 'Sup', utility: 'Sup',
  fill:    'Fill', FILL:    'Fill',
};

// ─────────────────────────────────────────────────────────────────────────────
// Seção 5 — Helpers compostos
// ─────────────────────────────────────────────────────────────────────────────

export interface ChampAssets {
  /** URL do retrato circular (CDragon HUD) — preferido no lobby */
  circleUrl: string | null;
  /** URL do ícone quadrado (DDragon) — fallback */
  squareUrl: string | null;
  /** champKey resolvido — ex: 'Ahri', 'MonkeyKing' */
  champKey:  string | null;
}

/**
 * Resolve todos os assets de um campeão pelo ID.
 * Faz getDDVersion() + getChampionMap() em paralelo (Promise.all).
 *
 * Uso:
 *   const assets = await resolveChampAssets(103); // Ahri
 *   // assets.circleUrl → CDragon HUD circle
 *   // assets.squareUrl → DDragon square (fallback)
 */
export async function resolveChampAssets(championId: number): Promise<ChampAssets> {
  if (championId <= 0) return { circleUrl: null, squareUrl: null, champKey: null };

  const [version, champMap] = await Promise.all([getDDVersion(), getChampionMap()]);
  const key = champMap[championId] ?? null;

  if (!key) return { circleUrl: null, squareUrl: null, champKey: null };

  return {
    circleUrl: champCircleUrl(key),
    squareUrl: champSquareUrl(key, version),
    champKey:  key,
  };
}

/**
 * Inicializa versão + mapa de campeões em paralelo.
 * Chamar no mount do componente para pré-aquecer os caches.
 * Retorna [version, champMap].
 */
export async function initRiotAssets(): Promise<[string, Record<number, string>]> {
  return Promise.all([getDDVersion(), getChampionMap()]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Seção 6 — Cores de tier (centralizadas aqui, fora do componente)
// ─────────────────────────────────────────────────────────────────────────────

export const TIER_COLOR: Record<string, string> = {
  IRON:         '#6B7280',
  BRONZE:       '#92400E',
  SILVER:       '#9CA3AF',
  GOLD:         '#C8A84B',
  PLATINUM:     '#10B981',
  EMERALD:      '#059669',
  DIAMOND:      '#60A5FA',
  MASTER:       '#A78BFA',
  GRANDMASTER:  '#F87171',
  CHALLENGER:   '#FCD34D',
  UNRANKED:     '#4A5568',
};

export const TIER_SHORT: Record<string, string> = {
  IRON: 'I', BRONZE: 'B', SILVER: 'S', GOLD: 'G',
  PLATINUM: 'P', EMERALD: 'E', DIAMOND: 'D',
  MASTER: 'M', GRANDMASTER: 'GM', CHALLENGER: 'C',
  UNRANKED: '—',
};

// ─────────────────────────────────────────────────────────────────────────────
// Seção 7 — Level Border / Ring (CDragon themed-level-ring)
//
// Fonte da lógica: rcp-fe-lol-uikit.js → getThemeFromLevel()
// Extraído diretamente do cliente LoL (não é estimativa).
//
// Mapeamento oficial level → themeIndex:
//   1–29  → theme 1
//   30–49 → theme 2
//   50+   → Math.floor(level / 25) + 1, máximo 21
//
// Temas disponíveis: 1–21 (21 = cap para level 500+)
//
// Assets disponíveis por tema:
//   theme-N-border.png          → moldura do ícone de perfil (uso principal)
//   theme-N-ring.png            → anel de XP girando ao redor do ícone
//   theme-N-simplified-border.png → versão sem detalhes (ex: loading screen)
//   theme-N-social-border.png   → versão para chat/social panel (menor, quadrada)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Retorna o themeIndex oficial do cliente LoL baseado no summonerLevel.
 *
 * Lógica extraída de:
 *   rcp-fe-lol-uikit/global/default/rcp-fe-lol-uikit.js → getThemeFromLevel()
 *
 * @param level  summonerLevel da conta (ex: 419)
 * @returns      themeIndex entre 1 e 21
 */
export function getThemeFromLevel(level: number): number {
  if (level >= 1 && level <= 29) return 1;
  if (level >= 30 && level <= 49) return 2;
  return Math.min(Math.floor(level / 25) + 1, 21);
}

/**
 * URL da moldura (border) do ícone de perfil baseada no summonerLevel.
 * Asset: theme-N-border.png — a moldura principal exibida na página de perfil.
 *
 * Uso recomendado:
 *   <img src={profileBorderUrl(summonerLevel)} alt="Level border" />
 *
 * @param level  summonerLevel da conta
 */
export function profileBorderUrl(level: number): string {
  const theme = getThemeFromLevel(level);
  return `${CDRAGON_LEVEL_RING}/theme-${theme}-border.png`;
}

/**
 * URL do anel de XP (ring) do ícone de perfil baseado no summonerLevel.
 * Asset: theme-N-ring.png — anel circular que envolve o ícone e exibe progresso de XP.
 *
 * Uso recomendado: sobrepor ao redor do ícone (position: absolute, inset: -N%).
 *
 * @param level  summonerLevel da conta
 */
export function profileRingUrl(level: number): string {
  const theme = getThemeFromLevel(level);
  return `${CDRAGON_LEVEL_RING}/theme-${theme}-ring.png`;
}
