import React from 'react';
import { notFound } from 'next/navigation';
import PlayerStatsCard from '@/components/profile/PlayerStatsCard';
import MatchHistoryRow from '@/components/profile/MatchHistoryRow';

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
  params: { summonerName: string };
}) {
  const data = await getPlayerProfile(params.summonerName);
  if (!data) return notFound();

  return (
    <main className="min-h-screen bg-[#050E1A] py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <PlayerStatsCard
          summonerName={data.summonerName}
          tagLine={data.tagLine}
          profileIconId={data.profileIconId}
          summonerLevel={data.summonerLevel}
          rankedSolo={data.rankedSolo}
          rankedFlex={data.rankedFlex}
          DD_VERSION={DD_VERSION}
        />

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Historico de Partidas</h2>
          <div className="space-y-2">
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
            
                />
              ))
            ) : (
              <p className="text-gray-500 text-sm">Nenhuma partida encontrada.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
