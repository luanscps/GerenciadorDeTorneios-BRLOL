import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

const TIER_ORDER: Record<string, number> = {
  CHALLENGER: 1,
  GRANDMASTER: 2,
  MASTER: 3,
  DIAMOND: 4,
  EMERALD: 5,
  PLATINUM: 6,
  GOLD: 7,
  SILVER: 8,
  BRONZE: 9,
  IRON: 10,
  UNRANKED: 11,
};

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

const ROLE_LABELS: Record<string, string> = {
  top: 'Top',
  jungle: 'Jungle',
  mid: 'Mid',
  adc: 'ADC',
  support: 'Support',
};

export default async function JogadoresPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; tier?: string; q?: string }>;
}) {
  const { role, tier, q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('players')
    .select(
      'id, summoner_name, tagline, role, tier, rank, lp, wins, losses, puuid, team_id, teams(id, name, tag)'
    )
    .order('lp', { ascending: false });

  if (role) query = query.eq('role', role);
  if (tier) query = query.eq('tier', tier.toUpperCase());
  if (q) query = query.ilike('summoner_name', `%${q}%`);

  const { data: players } = await query.limit(100);

  const roles = ['top', 'jungle', 'mid', 'adc', 'support'];
  const tiers = ['CHALLENGER', 'GRANDMASTER', 'MASTER', 'DIAMOND', 'EMERALD', 'PLATINUM', 'GOLD', 'SILVER', 'BRONZE', 'IRON'];

  const btnBase = 'px-3 py-1 rounded text-xs border transition-colors';
  const btnActive = 'border-[#C8A84B] text-[#C8A84B] bg-[#C8A84B]/10';
  const btnInactive = 'border-[#1E3A5F] text-gray-400 hover:border-[#C8A84B]/50';

  function buildQuery(patch: Record<string, string | undefined>) {
    const params = new URLSearchParams();
    if (role) params.set('role', role);
    if (tier) params.set('tier', tier);
    if (q) params.set('q', q);
    Object.entries(patch).forEach(([k, v]) => {
      if (v === undefined) params.delete(k);
      else params.set(k, v);
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

        {/* Filters */}
        <div className="space-y-3">
          {/* Search */}
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

          {/* Role Filter */}
          <div className="flex items-center flex-wrap gap-2">
            <span className="text-xs text-gray-500 mr-1">Role:</span>
            <Link href={buildQuery({ role: undefined })} className={`${btnBase} ${!role ? btnActive : btnInactive}`}>Todos</Link>
            {roles.map((r) => (
              <Link key={r} href={buildQuery({ role: r })} className={`${btnBase} ${role === r ? btnActive : btnInactive}`}>
                {ROLE_LABELS[r] ?? r}
              </Link>
            ))}
          </div>

          {/* Tier Filter */}
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

        {/* Players List */}
        {(players ?? []).length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhum jogador encontrado.</p>
        ) : (
          <div className="grid gap-3">
            {(players ?? []).map((player, idx) => {
              const winrate =
                (player.wins ?? 0) + (player.losses ?? 0) > 0
                  ? Math.round(
                      ((player.wins ?? 0) /
                        ((player.wins ?? 0) + (player.losses ?? 0))) *
                        100
                    )
                  : null;

              return (
                <div
                  key={player.id}
                  className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 flex items-center gap-4"
                >
                  {/* Rank position */}
                  <span className="text-gray-600 text-sm w-6 text-right flex-shrink-0">{idx + 1}</span>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-white font-semibold text-sm">
                        {player.summoner_name}
                      </span>
                      {player.tagline && (
                        <span className="text-gray-500 text-xs">#{player.tagline}</span>
                      )}
                      {player.role && (
                        <span className="text-xs text-[#C8A84B] bg-[#C8A84B]/10 border border-[#C8A84B]/20 rounded px-1.5 py-0.5">
                          {ROLE_LABELS[player.role] ?? player.role}
                        </span>
                      )}
                    </div>
                    {(player.teams as any) && (
                      <Link
                        href={`/times/${(player.teams as any).id}`}
                        className="text-xs text-blue-400 hover:underline mt-0.5 block"
                      >
                        [{(player.teams as any).tag}] {(player.teams as any).name}
                      </Link>
                    )}
                  </div>

                  {/* Tier / LP */}
                  <div className="text-right flex-shrink-0">
                    <p className={`text-sm font-semibold ${TIER_COLORS[player.tier ?? 'UNRANKED']}`}>
                      {player.tier ?? 'UNRANKED'} {player.rank ?? ''}
                    </p>
                    {player.lp != null && (
                      <p className="text-xs text-gray-400">{player.lp} LP</p>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="text-right flex-shrink-0 hidden sm:block">
                    {winrate !== null ? (
                      <>
                        <p className="text-xs text-white">
                          {player.wins}V {player.losses}D
                        </p>
                        <p className={`text-xs font-semibold ${
                          winrate >= 60 ? 'text-green-400' : winrate >= 50 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {winrate}% WR
                        </p>
                      </>
                    ) : (
                      <p className="text-xs text-gray-600">Sem partidas</p>
                    )}
                  </div>

                  {/* Profile link */}
                  {player.puuid && (
                    <Link
                      href={`/jogadores/${player.puuid}`}
                      className="text-xs text-gray-500 hover:text-[#C8A84B] flex-shrink-0"
                    >
                      Ver &rarr;
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
