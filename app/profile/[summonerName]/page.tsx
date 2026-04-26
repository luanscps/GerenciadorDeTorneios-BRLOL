import React from 'react';
import { notFound } from 'next/navigation';
import ProfileHeader from '@/components/profile/ProfileHeader';
import RankedCards from '@/components/profile/RankedCards';
import MatchHistoryRow from '@/components/profile/MatchHistoryRow';
import ChampionStatsTable from '@/components/profile/ChampionStatsTable';

const DD_VERSION = '14.10.1';

async function getPlayerProfile(summonerName: string) {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL}/api/profile/${encodeURIComponent(summonerName)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ summonerName: string }>;
}) {
  const { summonerName } = await params;
  const data = await getPlayerProfile(summonerName);
  if (!data) return notFound();

  // Calcula estatísticas agregadas por campeão
  const champStats: Record<string, { games: number; wins: number; kills: number; deaths: number; assists: number }> = {};
  if (data.matchHistory) {
    for (const m of data.matchHistory) {
      if (!champStats[m.championName]) {
        champStats[m.championName] = { games: 0, wins: 0, kills: 0, deaths: 0, assists: 0 };
      }
      const c = champStats[m.championName];
      c.games++;
      if (m.win) c.wins++;
      c.kills += m.kills;
      c.deaths += m.deaths;
      c.assists += m.assists;
    }
  }
  const champList = Object.entries(champStats)
    .map(([name, s]) => ({
      name,
      games: s.games,
      wr: s.games > 0 ? Math.round((s.wins / s.games) * 100) : 0,
      kda: s.deaths === 0 ? 'Perfect' : ((s.kills + s.assists) / s.deaths).toFixed(2),
      kills: +(s.kills / s.games).toFixed(1),
      deaths: +(s.deaths / s.games).toFixed(1),
      assists: +(s.assists / s.games).toFixed(1),
    }))
    .sort((a, b) => b.games - a.games)
    .slice(0, 5);

  return (
    <main className="min-h-screen bg-[#0A0E17]">
      {/* Banner top */}
      <div className="h-32 w-full bg-gradient-to-r from-[#0D1B2E] via-[#091528] to-[#0D1B2E] relative overflow-hidden">
        <div className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #C89B3C 0, #C89B3C 1px, transparent 0, transparent 50%)',
            backgroundSize: '20px 20px'
          }}
        />
      </div>

      <div className="max-w-5xl mx-auto px-4 -mt-10 pb-16">
        {/* Header: avatar + nome + nível */}
        <ProfileHeader
          summonerName={data.summonerName}
          tagLine={data.tagLine}
          profileIconId={data.profileIconId}
          summonerLevel={data.summonerLevel}
          DD_VERSION={DD_VERSION}
        />

        {/* Ranked cards */}
        <div className="mt-6">
          <RankedCards rankedSolo={data.rankedSolo} rankedFlex={data.rankedFlex} />
        </div>

        {/* Grid principal */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
          {/* Campeões mais jogados */}
          <div>
            <h3 className="text-[#A0AEC0] text-xs font-semibold uppercase tracking-widest mb-2 px-1">Campeões (últimas 20)</h3>
            <ChampionStatsTable champions={champList} DD_VERSION={DD_VERSION} />
          </div>

          {/* Histórico de partidas */}
          <div>
            <h3 className="text-[#A0AEC0] text-xs font-semibold uppercase tracking-widest mb-2 px-1">Histórico de Partidas</h3>
            <div className="space-y-1.5">
              {data.matchHistory?.length > 0 ? (
                data.matchHistory.map((match: any) => (
                  <MatchHistoryRow
                    key={match.matchId}
                    championName={match.championName}
                    teamPosition={match.teamPosition}
                    gameMode={match.gameMode}
                    kills={match.kills}
                    deaths={match.deaths}
                    assists={match.assists}
                    win={match.win}
                    gameDuration={match.minutes * 60}
                    cs={match.cs ?? 0}
                    vision={match.vision ?? 0}
                    DD_VERSION={DD_VERSION}
                  />
                ))
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-[#4A5568]">
                  <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6l4 2m5-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="mt-3 text-sm">Nenhuma partida encontrada.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
