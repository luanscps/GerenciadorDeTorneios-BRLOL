import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';

async function getJogador(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('players')
    .select(`
      id, summoner_name, tag_line, role, tier, rank, lp,
      wins, losses, puuid, created_at,
      team_id, teams ( id, name, tag )
    `)
    .eq('id', id)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function AdminJogadorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const j = await getJogador(slug);
  if (!j) return notFound();

  const total = j.wins + j.losses;
  const wr = total > 0 ? Math.round((j.wins / total) * 100) : 0;

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-6">
        <Link href="/admin/jogadores" className="text-gray-400 hover:text-white text-sm">
          &larr; Jogadores
        </Link>
        <span className="text-gray-600">/</span>
        <span className="text-white text-sm">{j.summoner_name}</span>
      </div>

      <h1 className="text-2xl font-bold text-white mb-1">
        {j.summoner_name}
        <span className="text-gray-400 font-normal text-base ml-1">#{j.tag_line}</span>
      </h1>
      <p className="text-gray-500 text-xs mb-6">ID: {j.id}</p>

      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-500 text-xs mb-1">Papel</p>
            <p className="text-white font-medium">{j.role || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Time</p>
            {j.teams ? (
              <Link href="/admin/torneios" className="text-blue-400 hover:underline font-medium">
                {(j.teams as any).name} [{(j.teams as any).tag}]
              </Link>
            ) : (
              <p className="text-gray-600">Sem time</p>
            )}
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Rank</p>
            <p className="text-yellow-400 font-medium">
              {j.tier} {j.rank} — {j.lp} LP
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Win Rate</p>
            <p className="font-medium">
              <span className="text-white">{j.wins}W / {j.losses}L</span>
              <span className={`ml-2 text-sm ${wr >= 50 ? 'text-blue-400' : 'text-red-400'}`}>
                {wr}%
              </span>
            </p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">PUUID</p>
            <p className="text-gray-400 text-xs font-mono truncate">{j.puuid || '—'}</p>
          </div>
          <div>
            <p className="text-gray-500 text-xs mb-1">Cadastro</p>
            <p className="text-gray-300 text-sm">
              {new Date(j.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 flex gap-3">
        <Link
          href={`/profile/${encodeURIComponent(j.summoner_name + '-' + j.tag_line)}`}
          className="bg-[#1E3A5F] text-white px-4 py-2 rounded-lg text-sm hover:bg-[#2A4A6F]"
        >
          Ver Perfil Publico
        </Link>
      </div>
    </div>
  );
}