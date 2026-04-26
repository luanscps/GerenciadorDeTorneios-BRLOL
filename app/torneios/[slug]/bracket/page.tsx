import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import Link from 'next/link';

export default async function BracketPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, status, max_teams')
    .eq('slug', slug)
    .single();

  if (!torneio) notFound();

  const { data: matches } = await supabase
    .from('matches')
    .select(`
      id, round, match_number, status, score_a, score_b,
      team_a:teams!team_a_id(id, name, tag),
      team_b:teams!team_b_id(id, name, tag),
      winner:teams!winner_id(id, name, tag)
    `)
    .eq('tournament_id', torneio.id)
    .order('round')
    .order('match_number');

  const rounds = matches
    ? Array.from(new Set(matches.map((m: any) => m.round))).sort((a, b) => a - b)
    : [];

  const roundLabel = (r: number, total: number) => {
    const remaining = total - r;
    if (remaining === 0) return 'Grande Final';
    if (remaining === 1) return 'Semi-finais';
    if (remaining === 2) return 'Quartas de Final';
    return `Round ${r}`;
  };

  const totalRounds = rounds.length;

  return (
    <div className="min-h-screen bg-[#050D1A] text-white">
      <div className="max-w-6xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link href={`/torneios/${slug}`} className="text-gray-400 hover:text-white text-sm">← Voltar</Link>
          <div>
            <h1 className="text-2xl font-bold text-white">🏆 Bracket — {torneio.name}</h1>
            <p className="text-xs text-gray-400 mt-0.5">
              {matches?.length ?? 0} partidas · {rounds.length} rodadas
            </p>
          </div>
        </div>

        {/* Bracket vazio */}
        {(!matches || matches.length === 0) && (
          <div className="text-center py-24">
            <p className="text-6xl mb-4">⏳</p>
            <p className="text-gray-400 text-lg">Bracket ainda não foi gerado.</p>
            <p className="text-gray-500 text-sm mt-2">Aguarde o administrador iniciar o torneio.</p>
          </div>
        )}

        {/* Rounds */}
        {rounds.length > 0 && (
          <div className="flex gap-6 overflow-x-auto pb-4">
            {rounds.map((round) => {
              const roundMatches = (matches ?? []).filter((m: any) => m.round === round);
              return (
                <div key={round} className="flex-shrink-0 w-64">
                  <h2 className="text-center text-[#C8A84B] font-bold text-sm mb-4 uppercase tracking-wider">
                    {roundLabel(round, totalRounds)}
                  </h2>
                  <div className="space-y-4">
                    {roundMatches.map((match: any) => {
                      const teamA = match.team_a as any;
                      const teamB = match.team_b as any;
                      const winner = match.winner as any;
                      const finished = match.status === 'finished';
                      return (
                        <div key={match.id} className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg overflow-hidden">
                          {/* Time A */}
                          <div className={`flex items-center justify-between px-3 py-2 border-b border-[#1E3A5F] ${
                            finished && winner?.id === teamA?.id
                              ? 'bg-[#C8A84B]/10'
                              : ''
                          }`}>
                            <span className={`text-sm font-medium ${
                              finished
                                ? winner?.id === teamA?.id
                                  ? 'text-[#C8A84B] font-bold'
                                  : 'text-gray-500'
                                : 'text-white'
                            }`}>
                              {teamA ? (
                                <>
                                  <span className="text-xs mr-1">[{teamA.tag}]</span>
                                  {teamA.name}
                                </>
                              ) : (
                                <span className="text-gray-600 italic">A definir</span>
                              )}
                            </span>
                            {finished && (
                              <span className={`text-sm font-bold ${
                                winner?.id === teamA?.id ? 'text-[#C8A84B]' : 'text-gray-600'
                              }`}>
                                {match.score_a ?? 0}
                              </span>
                            )}
                          </div>
                          {/* Time B */}
                          <div className={`flex items-center justify-between px-3 py-2 ${
                            finished && winner?.id === teamB?.id
                              ? 'bg-[#C8A84B]/10'
                              : ''
                          }`}>
                            <span className={`text-sm font-medium ${
                              finished
                                ? winner?.id === teamB?.id
                                  ? 'text-[#C8A84B] font-bold'
                                  : 'text-gray-500'
                                : 'text-white'
                            }`}>
                              {teamB ? (
                                <>
                                  <span className="text-xs mr-1">[{teamB.tag}]</span>
                                  {teamB.name}
                                </>
                              ) : (
                                <span className="text-gray-600 italic">A definir</span>
                              )}
                            </span>
                            {finished && (
                              <span className={`text-sm font-bold ${
                                winner?.id === teamB?.id ? 'text-[#C8A84B]' : 'text-gray-600'
                              }`}>
                                {match.score_b ?? 0}
                              </span>
                            )}
                          </div>
                          {/* Status badge */}
                          <div className="px-3 py-1.5 bg-[#050D1A] flex items-center justify-between">
                            <span className={`text-xs ${
                              finished ? 'text-green-400' : 'text-yellow-400'
                            }`}>
                              {finished ? '✅ Finalizada' : '⏳ Aguardando'}
                            </span>
                            {finished && winner && (
                              <span className="text-xs text-[#C8A84B] font-bold">
                                🏆 {winner.name}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
