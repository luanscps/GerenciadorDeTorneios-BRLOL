/**
 * riot-assets.ts
 * Centralized helper for Data Dragon (DDragon) and CommunityDragon asset URLs.
 * - DDragon: official Riot CDN, versioned — use for champions, items, summoner spells
 * - CommunityDragon: community CDN — use for rank emblems, perk/rune icons, loading screens
 *
 * IMPORTANT: Always call getDDragonVersion() once at app startup and cache it.
 * Never hardcode a patch version — use the version from /api/riot/ddragon-version.
 */

// ─── Data Dragon ────────────────────────────────────────────────────────────

const DD_BASE = 'https://ddragon.leagueoflegends.com'

/** Champion square icon (e.g. "Aatrox", "MissFortune") */
export function ddChampionIcon(championName: string, version: string): string {
  return `${DD_BASE}/cdn/${version}/img/champion/${championName}.png`
}

/** Champion splash art — skinNum 0 = default */
export function ddChampionSplash(championName: string, skinNum = 0): string {
  return `${DD_BASE}/cdn/img/champion/splash/${championName}_${skinNum}.jpg`
}

/** Champion loading screen art */
export function ddChampionLoading(championName: string, skinNum = 0): string {
  return `${DD_BASE}/cdn/img/champion/loading/${championName}_${skinNum}.jpg`
}

/** Summoner spell icon (e.g. "SummonerFlash", "SummonerDot") */
export function ddSummonerSpell(spellId: string, version: string): string {
  return `${DD_BASE}/cdn/${version}/img/spell/${spellId}.png`
}

/** Item icon by item ID number */
export function ddItem(itemId: number, version: string): string {
  return `${DD_BASE}/cdn/${version}/img/item/${itemId}.png`
}

/** Profile icon by icon ID */
export function ddProfileIcon(iconId: number, version: string): string {
  return `${DD_BASE}/cdn/${version}/img/profileicon/${iconId}.png`
}

// ─── CommunityDragon ─────────────────────────────────────────────────────────
// Supports "latest" as version alias — no version lock needed

const CD_BASE = 'https://cdn.communitydragon.org'

/**
 * Rank emblem image.
 * tier: "iron"|"bronze"|"silver"|"gold"|"platinum"|"emerald"|"diamond"|"master"|"grandmaster"|"challenger"
 */
export function cdRankEmblem(tier: string): string {
  return `${CD_BASE}/latest/plugins/rcp-fe-lol-shared/global/default/images/ranked-emblem/emblem-${tier.toLowerCase()}.png`
}

/** Perk/rune icon by perk ID (e.g. 8005, 8021) */
export function cdPerkIcon(perkId: number): string {
  return `${CD_BASE}/latest/plugins/rcp-fe-lol-game-data/global/default/v1/perk-images/styles/${perkId}.png`
}

/** Champion square icon by numeric champion ID (alternative to DDragon by name) */
export function cdChampionSquare(championId: number): string {
  return `${CD_BASE}/latest/champion/${championId}/square`
}

/** Champion centered portrait (higher quality than DDragon square) */
export function cdChampionPortrait(championId: number): string {
  return `${CD_BASE}/latest/champion/${championId}/portrait`
}

// ─── Champion ID ↔ Name mapping helper ────────────────────────────────────────

let _champMap: Record<number, string> | null = null

/**
 * Returns a cached map of { championId → championName }.
 * Fetched from DDragon champion.json once per session.
 */
export async function getChampionMap(version: string): Promise<Record<number, string>> {
  if (_champMap) return _champMap

  const url = `${DD_BASE}/cdn/${version}/data/en_US/champion.json`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  const data = await res.json()

  _champMap = {}
  for (const [name, champ] of Object.entries(data.data as Record<string, { key: string }>)) {
    _champMap[parseInt(champ.key)] = name
  }

  return _champMap
}

/** Returns champion name string from numeric ID. Falls back to empty string if not found. */
export async function championNameById(championId: number, version: string): Promise<string> {
  const map = await getChampionMap(version)
  return map[championId] ?? ''
}

// ─── Summoner spell ID → spell key mapping ────────────────────────────────────

let _spellMap: Record<number, string> | null = null

export async function getSummonerSpellMap(version: string): Promise<Record<number, string>> {
  if (_spellMap) return _spellMap

  const url = `${DD_BASE}/cdn/${version}/data/en_US/summoner.json`
  const res = await fetch(url, { next: { revalidate: 3600 } })
  const data = await res.json()

  _spellMap = {}
  for (const spell of Object.values(data.data as Record<string, { key: string; id: string }>)) {
    _spellMap[parseInt(spell.key)] = spell.id
  }

  return _spellMap
}

export async function summonerSpellIconUrl(spellId: number, version: string): Promise<string> {
  const map = await getSummonerSpellMap(version)
  const spellKey = map[spellId]
  if (!spellKey) return ''
  return ddSummonerSpell(spellKey, version)
}
