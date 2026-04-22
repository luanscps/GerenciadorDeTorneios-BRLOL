import Link from 'next/link'

const DDRAGON_VERSION_FALLBACK = '14.24.1'
const CHAMPION_ICON = (name: string) =>
  `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION_FALLBACK}/img/champion/${name}.png`

interface PlayerStat {
  id: string
  player_id: string
  summoner_name?: string
  champion?: string
  kills: number
  deaths: number
  assists: number
  cs?: number
  vision_score?: number
  damage_dealt?: number
  is_mvp?: boolean
  team: 'A' | 'B'
}

interface MatchGame {
  id: string
  game_number: number
  winner_team: 'A' | 'B'
  duration_seconds?: number
  riot_match_id?: string
  player_stats: PlayerStat[]
}

interface MatchTimelineProps {
  games: MatchGame[]
  team_a_name: string
  team_b_name: string
  score_a: number
  score_b: number
  match_id: string
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function KDABadge({ kills, deaths, assists }: { kills: number; deaths: number; assists: number }) {
  const kda = deaths > 0 ? (kills + assists) / deaths : kills + assists
  const color = kda >= 4 ? 'text-yellow-400' : kda >= 3 ? 'text-green-400' : kda >= 2 ? 'text-blue-400' : 'text-gray-400'
  return (
    <span className={`font-bold text-xs ${color}`}>
      {kills}/{deaths}/{assists}
      <span className="text-gray-600 ml-1">({kda.toFixed(1)})</span>
    </span>
  )
}

export function MatchTimeline({ games, team_a_name, team_b_name, score_a, score_b, match_id }: MatchTimelineProps) {
  const totalGames = score_a + score_b
  const winner = score_a > score_b ? team_a_name : score_b > score_a ? team_b_name : null

  return (
    <div className="space-y-6">
      {/* Score header */}
      <div className="bg-[#0A1428] border border-[#1E3A5F] rounded-xl p-6 text-center">
        <div className="flex items-center justify-center gap-8">
          <div className="text-right">
            <p className="text-white font-bold text-lg">{team_a_name}</p>
            {score_a > score_b && <p className="text-[#C89B3C] text-xs">VENCEDOR</p>}
          </div>
          <div className="text-center">
            <div className="flex items-center gap-4">
              <span className={`text-4xl font-black ${score_a > score_b ? 'text-[#C89B3C]' : 'text-white'}`}>{score_a}</span>
              <span className="text-gray-500 text-2xl">:</span>
              <span className={`text-4xl font-black ${score_b > score_a ? 'text-[#C89B3C]' : 'text-white'}`}>{score_b}</span>
            </div>
            <p className="text-gray-500 text-xs mt-1">BO{totalGames <= 1 ? 1 : totalGames <= 3 ? 3 : 5}</p>
          </div>
          <div className="text-left">
            <p className="text-white font-bold text-lg">{team_b_name}</p>
            {score_b > score_a && <p className="text-[#C89B3C] text-xs">VENCEDOR</p>}
          </div>
        </div>
      </div>

      {/* Games */}
      {games.length === 0 ? (
        <div className="text-center text-gray-500 py-8">
          <p>Nenhum game registrado ainda.</p>
        </div>
      ) : (
        games.map((game) => {
          const statsA = game.player_stats.filter(p => p.team === 'A')
          const statsB = game.player_stats.filter(p => p.team === 'B')
          const mvp = game.player_stats.find(p => p.is_mvp)

          return (
            <div key={game.id} className="bg-[#0A1428] border border-[#1E3A5F] rounded-xl overflow-hidden">
              {/* Game header */}
              <div className="bg-[#0d1f3c] px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-[#C89B3C] font-bold">Game {game.game_number}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                    game.winner_team === 'A' ? 'bg-blue-900 text-blue-300' : 'bg-red-900 text-red-300'
                  }`}>
                    {game.winner_team === 'A' ? team_a_name : team_b_name} venceu
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-400">
                  {game.duration_seconds && (
                    <span>⏱ {formatDuration(game.duration_seconds)}</span>
                  )}
                  {mvp && (
                    <span className="text-yellow-400">MVP: {mvp.summoner_name ?? mvp.champion}</span>
                  )}
                </div>
              </div>

              {/* Player stats table */}
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-500 border-b border-[#1E3A5F]">
                      <th className="text-left px-4 py-2">Campeão</th>
                      <th className="text-left px-2 py-2">Invocador</th>
                      <th className="text-center px-2 py-2">KDA</th>
                      <th className="text-center px-2 py-2">CS</th>
                      <th className="text-center px-2 py-2">Visão</th>
                      <th className="text-center px-2 py-2">Dano</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* Team A */}
                    <tr>
                      <td colSpan={6} className="px-4 py-1 bg-blue-950/30 text-blue-400 text-xs font-bold">
                        {team_a_name} {game.winner_team === 'A' ? '🏆' : ''}
                      </td>
                    </tr>
                    {statsA.map((p) => (
                      <tr key={p.id} className={`border-b border-[#1E3A5F]/50 hover:bg-[#1E3A5F]/20 ${
                        p.is_mvp ? 'bg-yellow-950/20' : ''
                      }`}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {p.champion ? (
                              <img src={CHAMPION_ICON(p.champion)} alt={p.champion} className="w-7 h-7 rounded-full" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#1E3A5F]" />
                            )}
                            <span className="text-gray-300">{p.champion ?? '-'}</span>
                            {p.is_mvp && <span className="text-yellow-400">★</span>}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-white">{p.summoner_name ?? '-'}</td>
                        <td className="px-2 py-2 text-center">
                          <KDABadge kills={p.kills} deaths={p.deaths} assists={p.assists} />
                        </td>
                        <td className="px-2 py-2 text-center text-gray-400">{p.cs ?? '-'}</td>
                        <td className="px-2 py-2 text-center text-gray-400">{p.vision_score ?? '-'}</td>
                        <td className="px-2 py-2 text-center text-gray-400">
                          {p.damage_dealt ? (p.damage_dealt / 1000).toFixed(1) + 'k' : '-'}
                        </td>
                      </tr>
                    ))}

                    {/* Team B */}
                    <tr>
                      <td colSpan={6} className="px-4 py-1 bg-red-950/30 text-red-400 text-xs font-bold">
                        {team_b_name} {game.winner_team === 'B' ? '🏆' : ''}
                      </td>
                    </tr>
                    {statsB.map((p) => (
                      <tr key={p.id} className={`border-b border-[#1E3A5F]/50 hover:bg-[#1E3A5F]/20 ${
                        p.is_mvp ? 'bg-yellow-950/20' : ''
                      }`}>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {p.champion ? (
                              <img src={CHAMPION_ICON(p.champion)} alt={p.champion} className="w-7 h-7 rounded-full" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-[#1E3A5F]" />
                            )}
                            <span className="text-gray-300">{p.champion ?? '-'}</span>
                            {p.is_mvp && <span className="text-yellow-400">★</span>}
                          </div>
                        </td>
                        <td className="px-2 py-2 text-white">{p.summoner_name ?? '-'}</td>
                        <td className="px-2 py-2 text-center">
                          <KDABadge kills={p.kills} deaths={p.deaths} assists={p.assists} />
                        </td>
                        <td className="px-2 py-2 text-center text-gray-400">{p.cs ?? '-'}</td>
                        <td className="px-2 py-2 text-center text-gray-400">{p.vision_score ?? '-'}</td>
                        <td className="px-2 py-2 text-center text-gray-400">
                          {p.damage_dealt ? (p.damage_dealt / 1000).toFixed(1) + 'k' : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )
        })
      )}
    </div>
  )
}
