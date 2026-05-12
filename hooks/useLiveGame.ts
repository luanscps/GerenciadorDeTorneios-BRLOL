/**
 * useLiveGame
 * Hook que faz polling da Spectator v5 API enquanto a partida está em andamento.
 *
 * - Polling a cada POLL_INTERVAL_MS (5s por padrão)
 * - Para automaticamente quando enabled = false
 * - Expõe gameData, inGame, loading, error
 * - gameElapsedSeconds calculado client-side via gameStartTime (mais confiável que gameLength da Riot)
 *
 * Usage:
 *   const { gameData, inGame, gameElapsedSeconds } = useLiveGame({
 *     puuid: player.puuid,
 *     region: 'br1',
 *     enabled: match.status === 'ONGOING',
 *   })
 */

import { useCallback, useEffect, useRef, useState } from 'react'

const POLL_INTERVAL_MS = 5000

export interface LiveGameParticipant {
  puuid: string
  summonerId: string
  championId: number
  teamId: number           // 100 = Blue, 200 = Red
  spell1Id: number
  spell2Id: number
  perks?: {
    perkIds: number[]
    perkStyle: number
    perkSubStyle: number
  }
  summonerName?: string
  riotId?: string
}

export interface LiveGameBan {
  championId: number
  teamId: number
  pickTurn: number
}

export interface LiveGameData {
  inGame: boolean
  gameId?: number
  gameType?: string
  gameStartTime?: number   // unix ms — use this for elapsed time, NOT gameLength
  gameLength?: number      // WARNING: Riot docs say this is inconsistent/inaccurate
  mapId?: number
  participants?: LiveGameParticipant[]
  bannedChampions?: LiveGameBan[]
  gameMode?: string
  gameQueueConfigId?: number
}

interface UseLiveGameOptions {
  puuid: string | null | undefined
  region?: string
  /** Only poll when true (e.g. match.status === 'ONGOING') */
  enabled?: boolean
  pollIntervalMs?: number
}

export function useLiveGame({
  puuid,
  region = 'br1',
  enabled = true,
  pollIntervalMs = POLL_INTERVAL_MS,
}: UseLiveGameOptions) {
  const [gameData, setGameData] = useState<LiveGameData | null>(null)
  const [inGame, setInGame] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [gameElapsedSeconds, setGameElapsedSeconds] = useState(0)

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const elapsedRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const fetchGame = useCallback(async () => {
    if (!puuid || !enabled) return

    try {
      const res = await fetch(`/api/riot/live-game?puuid=${encodeURIComponent(puuid)}&region=${region}`)
      const data: LiveGameData = await res.json()

      if (res.status === 429) {
        console.warn('[useLiveGame] rate limited, backing off')
        return
      }

      setGameData(data)
      setInGame(data.inGame)
      setError(null)
    } catch (err) {
      console.error('[useLiveGame] polling error:', err)
      setError('Erro ao buscar partida ao vivo')
    } finally {
      setLoading(false)
    }
  }, [puuid, region, enabled])

  // Start/stop polling
  useEffect(() => {
    if (!enabled || !puuid) {
      if (intervalRef.current) clearInterval(intervalRef.current)
      return
    }

    setLoading(true)
    fetchGame()

    intervalRef.current = setInterval(fetchGame, pollIntervalMs)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
  }, [enabled, puuid, pollIntervalMs, fetchGame])

  // Client-side elapsed timer — more accurate than Riot's gameLength
  useEffect(() => {
    if (!inGame || !gameData?.gameStartTime) {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
      setGameElapsedSeconds(0)
      return
    }

    const tick = () => {
      const elapsed = Math.floor((Date.now() - (gameData.gameStartTime ?? 0)) / 1000)
      setGameElapsedSeconds(Math.max(0, elapsed))
    }

    tick()
    elapsedRef.current = setInterval(tick, 1000)

    return () => {
      if (elapsedRef.current) clearInterval(elapsedRef.current)
    }
  }, [inGame, gameData?.gameStartTime])

  return { gameData, inGame, loading, error, gameElapsedSeconds }
}
