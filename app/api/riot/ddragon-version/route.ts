/**
 * /api/riot/ddragon-version
 * Returns the latest Data Dragon patch version string.
 *
 * Cached for 1 hour (ISR) — DDragon versions update once per patch (~2 weeks).
 * Use this on the client to avoid hardcoding patch versions.
 *
 * GET /api/riot/ddragon-version
 * Response: { version: "16.9.1" }
 */

import { NextResponse } from 'next/server'

export const revalidate = 3600 // 1 hour cache

export async function GET() {
  try {
    const res = await fetch('https://ddragon.leagueoflegends.com/api/versions.json', {
      next: { revalidate: 3600 },
    })

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch DDragon versions' }, { status: 502 })
    }

    const versions: string[] = await res.json()
    const latest = versions[0]

    return NextResponse.json({ version: latest })
  } catch (err) {
    console.error('[ddragon-version] error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
