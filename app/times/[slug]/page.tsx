import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import TeamCard from '@/components/profile/TeamCard';

const DD_VERSION = '14.10.1';

async function getTime(slug: string) {
  const supabase = createClient();
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
  params: { slug: string };
}) {
  const time = await getTime(params.slug);
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
                Torneio:{' '}
                <Link
                  href={`/torneios/${torneio.id}`}
                  className="text-blue-400 hover:underline"
                >
                  {torneio.name}
                </Link>
              </p>
            )}
          </div>
        </div>

        <TeamCard
          team={{
            id: time.id,
            name: time.name,
            tag: time.tag,
            logoUrl: time.logo_url,
            players: (time.players as any[]) ?? [],
          }}
          DD_VERSION={DD_VERSION}
        />
      </div>
    </main>
  );
}
