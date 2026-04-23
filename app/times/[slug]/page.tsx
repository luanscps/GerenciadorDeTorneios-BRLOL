import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

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

export default async function TimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: team } = await supabase
    .from('teams')
    .select('*')
    .eq('id', slug)
    .single();

  if (!team) notFound();

  const { data: players } = await supabase
    .from('players')
    .select('id, summoner_name, tagline, tier, rank, lp, wins, losses')
    .eq('team_id', slug)
    .order('lp', { ascending: false });

  const { data: matchesA } = await supabase
    .from('matches')
    .select(`
      id, round, status, score_a, score_b, format, scheduled_at, winner_team_id,
      team_a_id, team_b_id,
      team_b:teams!matches_team_b_id_fkey(name, tag),
      tournaments(name, id)
    `)
    .eq('team_a_id', slug)
    .in('status', ['FINISHED', 'IN_PROGRESS', 'SCHEDULED'])
    .order('scheduled_at', { ascending: false })
    .limit(20);

  const { data: matchesB } = await supabase
    .from('matches')
    .select(`
      id, round, status, score_a, score_b, format, scheduled_at, winner_team_id,
      team_a_id, team_b_id,
      team_a:teams!matches_team_a_id_fkey(name, tag),
      tournaments(name, id)
    `)
    .eq('team_b_id', slug)
    .in('status', ['FINISHED', 'IN_PROGRESS', 'SCHEDULED'])
    .order('scheduled_at', { ascending: false })
    .limit(20);

  const allMatches = [
    ...(matchesA ?? []).map((m) => ({ ...m, side: 'A' as const })),
    ...(matchesB ?? []).map((m) => ({ ...m, side: 'B' as const })),
  ].sort((a, b) =>
    new Date(b.scheduled_at ?? 0).getTime() - new Date(a.scheduled_at ?? 0).getTime()
  );

  const wins = allMatches.filter(
    (m) => m.status === 'FINISHED' && m.winner_team_id === slug
  ).length;
  const losses = allMatches.filter(
    (m) => m.status === 'FINISHED' && m.winner_team_id && m.winner_team_id !== slug
  ).length;
  const winrate = wins + losses > 0 ? Math.round((wins / (wins + losses)) * 100) : null;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start gap-6">
        {team.logo_url ? (
          <img src={team.logo_url} alt={team.name}
            className="w-20 h-20 rounded-lg object-cover border border-[#1E3A5F]" />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-[#1E3A5F] flex items-center justify-center text-2xl font-bold text-[#C8A84B]">
            {team.tag?.[0] ?? '?'}
          </div>
        )}
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-white">{team.name}</h1>
            <span className="text-sm text-[#C8A84B] border border-[#C8A84B]/30 px-2 py-0.5 rounded">
              [{team.tag}]
            </span>
          </div>
          {team.description && (
            <p className="text-gray-400 text-sm mt-2 max-w-lg">{team.description}</p>
          )}
          <div className="flex items-center gap-4 mt-3 text-sm">
            <span className="text-green-400 font-semibold">{wins}V</span>
            <span className="text-red-400 font-semibold">{losses}D</span>
            {winrate !== null && (
              <span className="text-gray-300">{winrate}% winrate</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Roster */}
        <div className="lg:col-span-1">
          <h2 className="text-lg font-bold text-[#C8A84B] mb-4">👥 Roster</h2>
          {(players ?? []).length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhum jogador cadastrado.</p>
          ) : (
            <div className="space-y-2">
              {(players ?? []).map((player) => (
                <div key={player.id}
                  className="flex items-center justify-between p-3 bg-[#0D1B2E] rounded-lg border border-[#1E3A5F] hover:border-[#C8A84B]/30 transition-colors">
                  <div>
                    <p className="text-white text-sm font-semibold">{player.summoner_name}</p>
                    <p className="text-gray-500 text-xs">#{player.tagline}</p>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold ${TIER_COLORS[player.tier ?? 'UNRANKED']}`}>
                      {player.tier ?? 'UNRANKED'}
                    </span>
                    {player.rank && (
                      <span className="text-gray-500 text-xs ml-1">{player.rank}</span>
                    )}
                    {player.lp != null && (
                      <p className="text-gray-600 text-xs">{player.lp} LP</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Historico */}
        <div className="lg:col-span-2">
          <h2 className="text-lg font-bold text-[#C8A84B] mb-4">📊 Historico de Partidas</h2>
          {allMatches.length === 0 ? (
            <div className="text-center py-12 text-gray-500 bg-[#0D1B2E] rounded-lg border border-[#1E3A5F]">
              Nenhuma partida registrada.
            </div>
          ) : (
            <div className="space-y-2">
              {allMatches.map((match) => {
                const isA = match.side === 'A';
                const opponent = isA ? (match as any).team_b : (match as any).team_a;
                const myScore = isA ? match.score_a : match.score_b;
                const oppScore = isA ? match.score_b : match.score_a;
                const finished = match.status === 'FINISHED';
                const won = finished && match.winner_team_id === slug;
                const lost = finished && match.winner_team_id && match.winner_team_id !== slug;

                return (
                  <div key={match.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                      won ? 'border-green-500/30 bg-green-500/5' :
                      lost ? 'border-red-500/30 bg-red-500/5' :
                      'border-[#1E3A5F] bg-[#0D1B2E]'
                    }`}>
                    <div className="flex items-center gap-3">
                      <span className={`text-xs font-bold w-8 ${
                        won ? 'text-green-400' : lost ? 'text-red-400' : 'text-gray-400'
                      }`}>
                        {won ? 'VIT' : lost ? 'DER' : match.status === 'IN_PROGRESS' ? 'LIVE' : 'AGD'}
                      </span>
                      <div>
                        <p className="text-white text-sm">
                          vs {opponent?.name ?? 'TBD'}
                          <span className="text-gray-500 text-xs ml-1">[{opponent?.tag ?? '?'}]</span>
                        </p>
                        {(match as any).tournaments && (
                          <Link href={`/torneios/${(match as any).tournaments.id}`}
                            className="text-xs text-gray-500 hover:text-[#C8A84B]">
                            {(match as any).tournaments.name}
                          </Link>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      {finished && (
                        <p className={`text-sm font-bold ${won ? 'text-green-400' : 'text-red-400'}`}>
                          {myScore ?? 0} x {oppScore ?? 0}
                        </p>
                      )}
                      <p className="text-xs text-gray-500">
                        {match.format ?? 'BO1'}
                        {match.scheduled_at && (
                          <span className="ml-2">
                            {new Date(match.scheduled_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}