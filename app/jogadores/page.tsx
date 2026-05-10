import { createClient } from '@/lib/supabase/server';
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

const TIER_EMBLEMS: Record<string, string> = {
  CHALLENGER:  'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-challenger.png',
  GRANDMASTER: 'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-grandmaster.png',
  MASTER:      'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-master.png',
  DIAMOND:     'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-diamond.png',
  EMERALD:     'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-emerald.png',
  PLATINUM:    'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-platinum.png',
  GOLD:        'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-gold.png',
  SILVER:      'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-silver.png',
  BRONZE:      'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-bronze.png',
  IRON:        'https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblems/emblem-iron.png',
};

const ROLE_LABELS: Record<string, string> = {
  top: 'Top', jungle: 'Jungle', mid: 'Mid', adc: 'ADC', support: 'Support',
};

function splitRiotId(
  summoner_name: string | null | undefined,
  tag_line: string | null | undefined,
): { gameName: string; tagLine: string } | null {
  if (!summoner_name) return null;
  const raw = summoner_name.trim();
  const hashIdx = raw.indexOf('#');
  if (hashIdx !== -1) {
    const namePart = raw.slice(0, hashIdx).trim();
    const tagPart  = (tag_line ?? raw.slice(hashIdx + 1)).trim();
    if (!namePart || !tagPart) return null;
    return { gameName: namePart, tagLine: tagPart };
  }
  if (tag_line?.trim()) {
    return { gameName: raw, tagLine: tag_line.trim() };
  }
  return null;
}

export default async function JogadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; tier?: string; q?: string }>;
}) {
  const { role, tier, q } = await searchParams;
  const supabase = await createClient();

  // Fix 3: removido team_id e teams(id, name, tag) — coluna team_id foi dropada na migration
  let query = supabase
    .from('players')
    .select('id, summoner_name, tag_line, role, tier, rank, lp, wins, losses, puuid')
    .order('lp', { ascending: false });

  if (role) query = query.eq('role', role);
  if (tier) query = query.eq('tier', tier.toUpperCase());
  if (q)    query = query.ilike('summoner_name', `%${q}%`);

  const { data: players } = await query.limit(100);

  const roles = ['top', 'jungle', 'mid', 'adc', 'support'];
  const tiers = ['CHALLENGER','GRANDMASTER','MASTER','DIAMOND','EMERALD','PLATINUM','GOLD','SILVER','BRONZE','IRON'];

  const btnBase     = 'px-3 py-1 rounded text-xs border transition-colors';
  const btnActive   = 'border-[#C8A84B] text-[#C8A84B] bg-[#C8A84B]/10';
  const btnInactive = 'border-[#1E3A5F] text-gray-400 hover:border-[#C8A84B]/50';

  function buildQuery(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (tier) params.set('tier', tier);
    if (q)    params.set('q', q);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined) params.delete(k); else params.set(k, v);
    });
    const str = params.toString();
    return '/jogadores' + (str ? '?' + str : '');
  }

  return (
    <main className="min-h-screen bg-[#050E1A] py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">

        <div>
          <h1 className="text-3xl font-bold text-white">Jogadores</h1>
          <p className="text-gray-400 text-sm mt-1">
            {players?.length ?? 0} jogador{players?.length !== 1 ? 'es' : ''} encontrado{players?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          <form method="GET" action="/jogadores">
            {role && <input type="hidden" name="role" value={role} />}
            {tier && <input type="hidden" name="tier" value={tier} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por summoner name..."
              className="w-full md:w-80 bg-[#0D1B2E] border border-[#1E3A5F] rounded px-3 py-2 text-white text-sm placeholder-gray-500 focus:border-[#C8A84B] outline-none"
            />
          </form>

          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs text-gray-500 mr-1">Role:</span>
            <Link href={buildQuery({ role: undefined })} className={`${btnBase} ${!role ? btnActive : btnInactive}`}>Todos</Link>
            {roles.map((r) => (
              <Link key={r} href={buildQuery({ role: r })} className={`${btnBase} ${role === r ? btnActive : btnInactive}`}>
                {ROLE_LABELS[r] ?? r}
              </Link>
            ))}
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs text-gray-500 mr-1">Tier:</span>
            <Link href={buildQuery({ tier: undefined })} className={`${btnBase} ${!tier ? btnActive : btnInactive}`}>Todos</Link>
            {tiers.map((t) => (
              <Link key={t} href={buildQuery({ tier: t })} className={`${btnBase} ${tier?.toUpperCase() === t ? btnActive : btnInactive} ${TIER_COLORS[t]}`}>
                {t[0] + t.slice(1).toLowerCase()}
              </Link>
            ))}
          </div>
        </div>

        {/* Lista */}
        {(players ?? []).length === 0 ? (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">🎮</p>
            <p className="text-gray-500 text-sm">Nenhum jogador encontrado.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {(players ?? []).map((player, idx) => {
              const total   = (player.wins ?? 0) + (player.losses ?? 0);
              const winrate = total > 0 ? Math.round(((player.wins ?? 0) / total) * 100) : null;
              const emblem  = TIER_EMBLEMS[player.tier ?? ''] ?? null;

              const riotId  = splitRiotId(player.summoner_name, player.tag_line);
              const href    = riotId
                ? `/jogadores/${encodeURIComponent(riotId.gameName)}/${encodeURIComponent(riotId.tagLine)}`
                : null;

              const displayName = riotId?.gameName ?? player.summoner_name ?? '?';
              const displayTag  = riotId?.tagLine  ?? player.tag_line      ?? '';

              const cardContent = (
                <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 flex items-center gap-4 hover:border-[#C8A84B]/40 hover:bg-[#0F2035] transition-all group">
                  <span className="text-gray-600 text-sm w-6 text-right flex-shrink-0 font-mono">{idx + 1}</span>

                  <div className="w-10 h-10 flex-shrink-0 flex items-center justify-center">
                    {emblem ? (
                      <img src={emblem} width={40} height={40} alt={player.tier ?? ''} className="w-10 h-10 object-contain" />
                    ) : (
                      <div className="w-8 h-8 rounded-full bg-[#1E3A5F]/50 flex items-center justify-center">
                        <span className="text-gray-600 text-xs">🎮</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm group-hover:text-[#C8A84B] transition-colors">
                        {displayName}
                      </span>
                      {displayTag && (
                        <span className="text-gray-500 text-xs">#{displayTag}</span>
                      )}
                      {player.role && (
                        <span className="text-xs text-[#C8A84B] bg-[#C8A84B]/10 border border-[#C8A84B]/20 rounded px-1.5 py-0.5">
                          {ROLE_LABELS[player.role] ?? player.role}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${TIER_COLORS[player.tier ?? 'UNRANKED']}`}>
                      {player.tier ?? 'UNRANKED'} {player.rank ?? ''}
                    </p>
                    {player.lp != null && (
                      <p className="text-xs text-gray-400">{player.lp} LP</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0 hidden sm:block min-w-[64px]">
                    {winrate !== null ? (
                      <>
                        <p className="text-xs text-white">{player.wins}V {player.losses}D</p>
                        <p className={`text-xs font-semibold ${
                          winrate >= 60 ? 'text-green-400' : winrate >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>{winrate}% WR</p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-600">—</p>
                    )}
                  </div>

                  {href && (
                    <div className="flex-shrink-0">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#C8A84B] bg-[#C8A84B]/10 border border-[#C8A84B]/30 rounded-lg px-3 py-1.5 group-hover:bg-[#C8A84B]/20 transition-colors whitespace-nowrap">
                        Ver Perfil →
                      </span>
                    </div>
                  )}
                </div>
              );

              return href ? (
                <Link key={player.id} href={href} className="block">
                  {cardContent}
                </Link>
              ) : (
                <div key={player.id}>{cardContent}</div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
