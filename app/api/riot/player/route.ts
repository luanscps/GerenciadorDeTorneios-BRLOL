/**
 * /api/riot/player
 * Busca dados completos de um jogador pelo Riot ID (gameName + tagLine).
 *
 * Fluxo correto conforme documentação Riot API v5:
 * 1. ACCOUNT-V1 (regional: americas)  → PUUID
 * 2. SUMMONER-V4 (platform: br1)       → summonerLevel, profileIconId
 * 3. LEAGUE-V4   (platform: br1)       → rank RANKED_SOLO_5x5
 *    Usa /entries/by-puuid/{puuid} (moderno) em vez de /entries/by-summoner/{id} (legado)
 *
 * Roteamento:
 * - getRegionalUrl() → americas.api.riotgames.com  (respeita RIOT_REGION env var)
 * - getPlatformUrl() → br1.api.riotgames.com        (respeita RIOT_REGION env var)
 *
 * Nunca usa summonerName para lookup — campo deprecated pela Riot desde nov/2023.
 */
import { NextRequest, NextResponse } from 'next/server';
import { getRegionalUrl, getPlatformUrl } from '@/lib/riot';

export async function GET(req: NextRequest) {
  const gameName = req.nextUrl.searchParams.get('gameName');
  const tagLine  = req.nextUrl.searchParams.get('tagLine');
  const RIOT_KEY = process.env.RIOT_API_KEY;

  if (!gameName || !tagLine) {
    return NextResponse.json(
      { error: 'Parâmetros inválidos. Informe gameName e tagLine.' },
      { status: 400 }
    );
  }

  if (!RIOT_KEY) {
    return NextResponse.json(
      { error: 'Riot API Key não configurada no servidor.' },
      { status: 500 }
    );
  }

  try {
    // ── 1. ACCOUNT-V1: PUUID via Riot ID (regional host) ─────────────────────
    const accountRes = await fetch(
      `${getRegionalUrl()}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`,
      {
        headers: { 'X-Riot-Token': RIOT_KEY },
        next: { revalidate: 300 },
      }
    );

    if (!accountRes.ok) {
      const body = await accountRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: body?.status?.message ?? 'Conta Riot não encontrada' },
        { status: 404 }
      );
    }

    const account = await accountRes.json();

    // ── 2. SUMMONER-V4: dados do invocador via PUUID (platform host) ──────────
    const summonerRes = await fetch(
      `${getPlatformUrl()}/lol/summoner/v4/summoners/by-puuid/${account.puuid}`,
      {
        headers: { 'X-Riot-Token': RIOT_KEY },
        next: { revalidate: 300 },
      }
    );
    const summoner = summonerRes.ok ? await summonerRes.json() : null;

    // ── 3. LEAGUE-V4: rank via PUUID (platform host) ──────────────────────────
    // Usa /entries/by-puuid (moderno) — não precisa mais do summonerID
    let rankData: any = null;
    const rankRes = await fetch(
      `${getPlatformUrl()}/lol/league/v4/entries/by-puuid/${account.puuid}`,
      {
        headers: { 'X-Riot-Token': RIOT_KEY },
        next: { revalidate: 300 },
      }
    );
    if (rankRes.ok) {
      const ranks: any[] = await rankRes.json();
      rankData = ranks.find((r) => r.queueType === 'RANKED_SOLO_5x5') ?? null;
    }

    return NextResponse.json({
      puuid:         account.puuid,
      gameName:      account.gameName,
      tagLine:       account.tagLine,
      profileIconId: summoner?.profileIconId ?? null,
      summonerLevel: summoner?.summonerLevel ?? null,
      tier:          rankData?.tier ?? 'UNRANKED',
      rank:          rankData?.rank ?? '',
      lp:            rankData?.leaguePoints ?? 0,
      wins:          rankData?.wins ?? 0,
      losses:        rankData?.losses ?? 0,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? 'Erro interno' },
      { status: 500 }
    );
  }
}
