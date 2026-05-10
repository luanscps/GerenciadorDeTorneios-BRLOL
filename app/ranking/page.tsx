import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const TIER_ORDER = [
  'CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'EMERALD',
  'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'IRON', 'UNRANKED',
];

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
};

export default async function RankingPage({
  searchParams,
}: {
  searchParams: Promise<{ tier?: string }>;
}) {
  const { tier } = await searchParams;
  const supabase = await createClient();

  // Fix 1: removido team_id e teams(name, tag) que causavam erro pois a coluna team_id foi removida
  let query = supabase
    .from('players')
    .select('id, summoner_name, tag_line, tier, rank, lp, wins, losses')
    .order('lp', { ascending: false })
    .order('tier')
    .limit(100);
  if (tier) query = query.eq('tier', tier);
  const { data: players } = await query;

  const playerIds = (players ?? []).map((p) => p.id);
  const { data: statsRaw } = playerIds.length
    ? await supabase
        .from('player_stats')
        .select('player_id, kills, deaths, assists, is_mvp')
        .in('player_id', playerIds)
    : { data: [] };

  const statsMap: Record<string, { kills: number; deaths: number; assists: number; mvps: number; games: number }> = {};
  for (const s of statsRaw ?? []) {
    if (!statsMap[s.player_id]) statsMap[s.player_id] = { kills: 0, deaths: 0, assists: 0, mvps: 0, games: 0 };
    statsMap[s.player_id].kills += s.kills ?? 0;
    statsMap[s.player_id].deaths += s.deaths ?? 0;
    statsMap[s.player_id].assists += s.assists ?? 0;
    statsMap[s.player_id].mvps += s.is_mvp ? 1 : 0;
    statsMap[s.player_id].games += 1;
  }

  const playersWithKDA = (players ?? []).map((p) => {
    const stats = statsMap[p.id];
    const kda = stats && stats.deaths > 0 ? (stats.kills + stats.assists) / stats.deaths : stats ? stats.kills + stats.assists : 0;
    const winrate = (p.wins ?? 0) + (p.losses ?? 0) > 0 ? Math.round(((p.wins ?? 0) / ((p.wins ?? 0) + (p.losses ?? 0))) * 100) : null;
    return { ...p, kda, stats, winrate };
  }).sort((a, b) => b.kda - a.kda);

  const btnBase = 'px-3 py-1 rounded text-xs border transition-colors';
  const btnActive = 'border-[#C8A84B] text-[#C8A84B] bg-[#C8A84B]/10';
  const btnInactive = 'border-[#1E3A5F] text-gray-400 hover:border-[#C8A84B]/50';

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">🏆 Leaderboard Global</h1>
          <p className="text-gray-400 text-sm mt-1">Top {playersWithKDA.length} invocadores{tier ? ` — Tier: ${tier}` : ''}</p>
        </div>
      </div>

      {/* Filtro de Tier */}
      <div className="flex flex-wrap gap-2 items-center">
        <span className="text-xs text-gray-500">Tier:</span>
        <a href="/ranking" className={`${btnBase} ${!tier ? btnActive : btnInactive}`}>Todos</a>
        {TIER_ORDER.map((t) => (
          <a key={t} href={`/ranking?tier=${t}`}
            className={`${btnBase} ${tier === t ? btnActive : btnInactive} ${TIER_COLORS[t]}`}>
            {t}
          </a>
        ))}
      </div>

      {/* Podium top 3 */}
      {!tier && playersWithKDA.length >= 3 && (
        <div className="flex justify-center items-end gap-4">
          {[1, 0, 2].map((pos) => {
            const p = playersWithKDA[pos];
            if (!p) return null;
            return (
              <div key={pos} className={`text-center p-4 rounded-lg border ${
                pos === 0 ? 'border-yellow-400 bg-yellow-400/10 scale-110' :
                pos === 1 ? 'border-gray-400 bg-gray-400/10' : 'border-orange-700 bg-orange-700/10'
              }`}>
                <div className="text-2xl">{pos === 0 ? '🥇' : pos === 1 ? '🥈' : '🥉'}</div>
                <div className="font-bold text-white text-sm mt-1">{p.summoner_name}</div>
                <div className="text-xs text-gray-400">#{p.tag_line}</div>
                <div className={`text-xs mt-1 font-semibold ${
                  TIER_COLORS[(p.tier ?? 'UNRANKED').toUpperCase()] ?? 'text-gray-600'
                }`}>
                  {p.tier ?? 'UNRANKED'} {p.rank ?? ''}
                </div>
                <div className="text-xs text-gray-500">{p.lp ?? 0} LP</div>
                {p.winrate != null && (
                  <div className="text-xs mt-1" style={{ color: p.winrate >= 50 ? '#2AC56F' : '#CD4545' }}>
                    {p.winrate}% WR
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Tabela */}
      {playersWithKDA.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-4xl mb-3">📋</p>
          <p className="text-gray-500">Nenhum jogador encontrado{tier ? ` para o tier ${tier}` : ''}.</p>
        </div>
      ) : (
        <div className="rounded-xl overflow-hidden" style={{ background: '#0D1B2E', border: '1px solid #1E3A5F' }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid #1E3A5F' }}>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider w-10">#</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">Invocador</th>
                <th className="px-4 py-3 text-left text-xs text-gray-500 font-semibold uppercase tracking-wider">Tier</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">LP</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">KDA</th>
                <th className="px-4 py-3 text-right text-xs text-gray-500 font-semibold uppercase tracking-wider">WR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1E3A5F]/40">
              {playersWithKDA.map((p, i) => (
                <tr key={p.id} className="hover:bg-[#0A1428]/60 transition-colors">
                  <td className="px-4 py-3 text-gray-600 tabular-nums">{i + 1}</td>
                  <td className="px-4 py-3">
                    <span className="text-white font-medium">{p.summoner_name}</span>
                    <span className="text-gray-600 text-xs ml-1">#{p.tag_line}</span>
                  </td>
                  <td className={`px-4 py-3 font-semibold ${
                    TIER_COLORS[(p.tier ?? 'UNRANKED').toUpperCase()] ?? 'text-gray-600'
                  }`}>
                    {p.tier ?? 'UNRANKED'} {p.rank ?? ''}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums text-gray-300">{p.lp ?? 0}</td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    <span style={{ color: p.kda >= 3 ? '#2AC56F' : p.kda >= 2 ? '#C8A84B' : '#CD4545' }}>
                      {p.kda.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {p.winrate != null ? (
                      <span style={{ color: p.winrate >= 50 ? '#2AC56F' : '#CD4545' }}>{p.winrate}%</span>
                    ) : <span className="text-gray-600">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
