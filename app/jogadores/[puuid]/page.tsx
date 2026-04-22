import React from 'react';
import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import PlayerCard from '@/components/profile/PlayerCard';
import MatchHistoryRow from '@/components/profile/MatchHistoryRow';
import Link from 'next/link';

const DD_VERSION = '14.10.1';

async function getJogadorByPuuid(puuid: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('players')
    .select(`
      id, summoner_name, tag_line, role,
      tier, rank, lp, wins, losses, puuid,
      team_id, teams ( id, name, tag, logo_url )
    `)
    .eq('puuid', puuid)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function JogadorPublicPage({
  params,
}: {
  params: { puuid: string };
}) {
  const jogador = await getJogadorByPuuid(params.puuid);
  if (!jogador) return notFound();

  const team = jogador.teams as any;
  const total = jogador.wins + jogador.losses;
  const wr = total > 0 ? Math.round((jogador.wins / total) * 100) : 0;

  return (
    <main className="min-h-screen bg-[#050E1A] py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <PlayerCard
          summonerName={jogador.summoner_name}
          tagLine={jogador.tag_line}
          role={jogador.role}
          tier={jogador.tier}
          rank={jogador.rank}
          lp={jogador.lp}
          wins={jogador.wins}
          losses={jogador.losses}
          wr={wr}
          team={team ? { id: team.id, name: team.name, tag: team.tag, logoUrl: team.logo_url } : null}
          DD_VERSION={DD_VERSION}
        />

        {team && (
          <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4">
            <p className="text-gray-400 text-xs mb-2">Time</p>
            <Link
              href={`/times/${team.tag}`}
              className="text-blue-400 hover:underline font-medium"
            >
              {team.name} [{team.tag}]
            </Link>
          </div>
        )}

        <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4">
          <p className="text-gray-400 text-xs mb-3">Ver historico completo de partidas</p>
          <Link
            href={`/profile/${encodeURIComponent(jogador.summoner_name + '-' + jogador.tag_line)}`}
            className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#2A4A6F] inline-block"
          >
            Abrir perfil com historico
          </Link>
        </div>
      </div>
    </main>
  );
}
