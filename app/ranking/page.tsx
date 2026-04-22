import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

const TIER_ORDER = [
  'CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'EMERALD',
  'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'IRON', 'UNRANKED',
]

const TIER_COLORS: Record<string, string> = {
  CHALLENGER: 'text-yellow-300',
  GRANDMASTER: 'text-red-400',
  MASTER: 'text-purple-400',
  DIAMOND: 'text-blue-400',
  EMERALD: 'text-emerald-400',
  PLATINUM: 'text-teal-400',
  GOLD: 'text-yellow-500',
  SILVER: 'text-gray-400',
  BRONZE: 'text-orange-700',
  IRON: 'text-gray-500',
  UNRANKED: 'text-gray-600',
}

export default async function RankingPage() {
  const supabase = await createClient()

  // Buscar players com stats agregadas
  const { data: players } = await supabase
    .from('players')
    .select(`
      id, summoner_name, tagline, tier, rank, lp, wins, losses,
      team_id,
      teams(name, tag)
    `)
    .order('lp', { ascending: false })
    .order('tier')
    .limit(100)

  // Buscar stats de cada player
  const playerIds = (players ?? []).map((p) => p.id)
  const { data: statsRaw } = playerIds.length
    ? await supabase
        .from('player_stats')
        .select('player_id, kills, deaths, assists, is_mvp')
        .in('player_id', playerIds)
    : { data: [] }

  // Agregar stats
  const statsMap: Record<string, { kills: number; deaths: number; assists: number; mvps: number; games: number }> = {}
  for (const s of statsRaw ?? []) {
    if (!statsMap[s.player_id]) {
      statsMap[s.player_id] = { kills: 0, deaths: 0, assists: 0, mvps: 0, games: 0 }
    }
    statsMap[s.player_id].kills += s.kills ?? 0
    statsMap[s.player_id].deaths += s.deaths ?? 0
    statsMap[s.player_id].assists += s.assists ?? 0
    statsMap[s.player_id].mvps += s.is_mvp ? 1 : 0
    statsMap[s.player_id].games += 1
  }

  // Ordenar por KDA desc
  const playersWithKDA = (players ?? []).map((p) => {
    const stats = statsMap[p.id]
    const kda = stats && stats.deaths > 0
      ? (stats.kills + stats.assists) / stats.deaths
      : stats ? stats.kills + stats.assists : 0
    const winrate = (p.wins ?? 0) + (p.losses ?? 0) > 0
      ? Math.round(((p.wins ?? 0) / ((p.wins ?? 0) + (p.losses ?? 0))) * 100)
      : null
    return { ...p, kda, stats, winrate }
  }).sort((a, b) => b.kda - a.kda)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-white">🏆 Leaderboard Global</h1>
        <p className="text-gray-500 text-sm">Top {playersWithKDA.length} invocadores</p>
      </div>

      {/* Podium top 3 */}
      {playersWithKDA.length >= 3 && (
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[1, 0, 2].map((pos) => {
            const p = playersWithKDA[pos]
            if (!p) return null
            const isFirst = pos === 0
            return (
              <div
                key={p.id}
                className={`card-lol p-4 text-center ${
                  isFirst ? 'border-[#C89B3C] ring-1 ring-[#C89B3C]/30' : ''
                } ${pos === 1 ? 'order-2' : pos === 0 ? 'order-1' : 'order-3'}`}
              >
                <div className="text-3xl mb-1">
                  {pos === 0 ? '🥇' : pos === 1 ? '🥈' : '🥉'}
                </div>
                <div className="text-[#C89B3C] font-bold">{p.summoner_name}</div>
                <div className="text-gray-500 text-xs">{p.tagline}</div>
                <div className={`text-xs font-bold mt-1 ${TIER_COLORS[p.tier ?? 'UNRANKED']}`}>
                  {p.tier} {p.rank} {p.lp}LP
                </div>
                <div className="text-white font-bold mt-2">{p.kda.toFixed(2)} KDA</div>
              </div>
            )
          })}
        </div>
      )}

      <div className="card-lol overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-[#1E3A5F]">
              <th className="text-left pb-3 w-12">#</th>
              <th className="text-left pb-3">Invocador</th>
              <th className="text-left pb-3">Time</th>
              <th className="text-left pb-3">Tier/Rank</th>
              <th className="text-right pb-3">KDA</th>
              <th className="text-right pb-3">Winrate</th>
              <th className="text-right pb-3">MVPs</th>
              <th className="text-right pb-3">Partidas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E3A5F]">
            {playersWithKDA.map((player, i) => (
              <tr key={player.id} className="hover:bg-[#1E3A5F]/30 transition-colors">
                <td className="py-3">
                  <span className={`font-bold ${
                    i === 0 ? 'text-yellow-400' :
                    i === 1 ? 'text-gray-300' :
                    i === 2 ? 'text-orange-600' :
                    'text-gray-600'
                  }`}>{i + 1}</span>
                </td>
                <td className="py-3">
                  <Link href={`/jogadores/${player.summoner_name}-${player.tagline}`} className="hover:text-[#C89B3C] transition-colors">
                    <span className="font-medium text-white">{player.summoner_name}</span>
                    <span className="text-gray-500 text-xs ml-1">#{player.tagline}</span>
                  </Link>
                </td>
                <td className="py-3 text-gray-400">
                  {player.teams ? (
                    <span>[{(player.teams as any).tag}] {(player.teams as any).name}</span>
                  ) : <span className="text-gray-600">-</span>}
                </td>
                <td className="py-3">
                  <span className={`font-bold ${TIER_COLORS[player.tier ?? 'UNRANKED']}`}>
                    {player.tier ?? 'UNRANKED'}
                  </span>
                  {player.rank && <span className="text-gray-400 text-xs ml-1">{player.rank}</span>}
                  {player.lp != null && <span className="text-gray-500 text-xs ml-1">{player.lp}LP</span>}
                </td>
                <td className="py-3 text-right">
                  <span className={`font-bold ${
                    player.kda >= 4 ? 'text-yellow-400' :
                    player.kda >= 3 ? 'text-green-400' :
                    player.kda >= 2 ? 'text-blue-400' :
                    'text-gray-400'
                  }`}>{player.kda.toFixed(2)}</span>
                </td>
                <td className="py-3 text-right text-gray-300">
                  {player.winrate != null ? `${player.winrate}%` : '-'}
                </td>
                <td className="py-3 text-right text-[#C89B3C]">
                  {player.stats?.mvps ?? 0}
                </td>
                <td className="py-3 text-right text-gray-400">
                  {player.stats?.games ?? 0}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {playersWithKDA.length === 0 && (
          <div className="py-16 text-center text-gray-500">
            <p className="text-lg">Nenhum jogador registrado ainda</p>
          </div>
        )}
      </div>
    </div>
  )
}
