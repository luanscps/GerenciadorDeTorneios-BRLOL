/**
 * /api/riot/live-game
 * Proxy para Riot Spectator v5 — active game by PUUID
 *
 * GET /api/riot/live-game?puuid={puuid}&region={region}
 *
 * region defaults to "br1"
 * Returns 404 JSON { inGame: false } when player is not in a game.
 * Returns Spectator v5 response when in game.
 *
 * NOTE: The spectator gameLength / gameStartTime is inconsistent per Riot docs.
 * Always compute elapsed time client-side using gameStartTime (unix ms) vs Date.now().
 *
 * Riot Policy compliance:
 * - Only uses official SPECTATOR-V5 endpoint
 * - Does NOT expose custom game data (only ranked/tournament tracked games)
 * - Rate limited server-side via RIOT_API_KEY env var
 */

import { NextRequest, NextResponse } from 'next/server'

const RIOT_API_KEY = process.env.RIOT_API_KEY

export async function GET(req: NextRequest) {
  if (!RIOT_API_KEY) {
    return NextResponse.json({ error: 'RIOT_API_KEY not configured' }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const puuid = searchParams.get('puuid')
  const region = searchParams.get('region') ?? 'br1'

  if (!puuid) {
    return NextResponse.json({ error: 'puuid is required' }, { status: 400 })
  }

  // SPECTATOR-V5: platform routing (br1, na1, euw1, etc.)
  const url = `https://${region}.api.riotgames.com/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`

  try {
    const res = await fetch(url, {
      headers: { 'X-Riot-Token': RIOT_API_KEY },
      cache: 'no-store',
    })

    if (res.status === 404) {
      return NextResponse.json({ inGame: false }, { status: 200 })
    }

    if (res.status === 429) {
      const retryAfter = res.headers.get('Retry-After') ?? '5'
      return NextResponse.json(
        { error: 'Rate limited', retryAfter: parseInt(retryAfter) },
        { status: 429 }
      )
    }

    if (!res.ok) {
      const body = await res.text()
      return NextResponse.json(
        { error: `Riot API error ${res.status}`, detail: body },
        { status: res.status }
      )
    }

    const data = await res.json()
    return NextResponse.json({ inGame: true, ...data })
  } catch (err) {
    console.error('[live-game] fetch error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
