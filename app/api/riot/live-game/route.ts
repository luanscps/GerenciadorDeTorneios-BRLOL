import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/riot/live-game?puuid=<puuid>
 *
 * Proxy para a Riot Spectator API v5.
 * Endpoint: GET /lol/spectator/v5/active-games/by-summoner/{encryptedPUUID}
 * Retorna os dados da partida ao vivo ou 404 se não estiver em jogo.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const puuid = searchParams.get('puuid');

  if (!puuid) {
    return NextResponse.json({ error: 'puuid required' }, { status: 400 });
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: 'RIOT_API_KEY not set' }, { status: 500 });
  }

  // Região padrão BR1 — pode ser parametrizado futuramente
  const region = searchParams.get('region') ?? 'br1';
  const url = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`;

  try {
    const riotRes = await fetch(url, {
      headers: { 'X-Riot-Token': apiKey },
      next: { revalidate: 0 }, // sem cache
    });

    if (riotRes.status === 404) {
      return NextResponse.json(null, { status: 404 });
    }

    if (!riotRes.ok) {
      const text = await riotRes.text();
      return NextResponse.json({ error: `Riot API error: ${riotRes.status}`, detail: text }, { status: riotRes.status });
    }

    const data = await riotRes.json();

    // Normaliza para o formato que o frontend espera
    const normalized = {
      gameId: data.gameId,
      gameStatus: data.gameStatus ?? 'IN_GAME',
      gameLength: data.gameLength ?? 0,
      participants: (data.participants ?? []).map((p: any) => ({
        puuid: p.puuid,
        summonerName: p.summonerName ?? p.riotId ?? '',
        championId: p.championId,
        teamId: p.teamId,
        spell1Id: p.spell1Id,
        spell2Id: p.spell2Id,
        perks: p.perks,
      })),
      bannedChampions: (data.bannedChampions ?? []).map((b: any) => ({
        championId: b.championId,
        teamId: b.teamId,
        pickTurn: b.pickTurn,
      })),
    };

    return NextResponse.json(normalized);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
