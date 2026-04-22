import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TeamCard from '@/components/profile/TeamCard';

const DD_VERSION = '14.10.1';

async function getTime(slug: string) {
  const supabase = await createClient();
  // slug pode ser o tag do time (ex: "TSM") ou o id
  const { data, error } = await supabase
    .from('teams')
    .select(`
      id, name, tag, logo_url, created_at,
      tournaments ( id, name, status ),
      players (
        id, summoner_name, tag_line, role,
        tier, rank, lp, wins, losses, puuid
      )
    `)
    .or(`tag.ilike.${slug},id.eq.${slug}`)
    .single();
  if (error || !data) return null;
  return data;
}

export default async function TimePublicPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const time = await getTime(slug);
  if (!time) return notFound();

  const torneio = (time.tournaments as any)?.[0];

  return (
    <main className="min-h-screen bg-[#050E1A] py-10 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-8">
          {time.logo_url && (
            <img
              src={time.logo_url}
              alt={time.name}
              width={72}
              height={72}
              className="rounded-xl border border-[#1E3A5F]"
            />
          )}
          <div>
            <h1 className="text-3xl font-bold text-white">
              {time.name}
              <span className="text-gray-400 text-xl font-normal ml-2">[{time.tag}]</span>
            </h1>
            {torneio && (
              <p className="text-gray-400 text-sm mt-1">
                Torneio: <Link href={`/torneios/${torneio.id}`} className="text-blue-400 hover:underline">{torneio.name}</Link>
              </p>
            )}
          </div>
        </div>

        <section>
          <h2 className="text-white font-semibold text-lg mb-3">Jogadores</h2>
          <div className="space-y-2">
            {(time.players as any[])?.length > 0 ? (
              (time.players as any[]).map((p) => (
                <Link
                  key={p.id}
                  href={`/jogadores/${p.puuid}`}
                  className="flex items-center gap-3 bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-3 hover:border-[#C8A84B]/50 transition-colors"
                >
                  <div>
                    <p className="text-white text-sm font-medium">{p.summoner_name}<span className="text-gray-400 text-xs ml-1">#{p.tag_line}</span></p>
                    <p className="text-gray-400 text-xs">{p.role || '—'} · {p.tier ? `${p.tier} ${p.rank}` : 'Unranked'}</p>
                  </div>
                </Link>
              ))
            ) : (
              <p className="text-gray-400 text-sm">Nenhum jogador cadastrado.</p>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
