import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Gamepad2, Shield } from 'lucide-react';

const TIER_COLORS: Record<string, string> = {
  CHALLENGER:  'text-yellow-300',
  GRANDMASTER: 'text-red-400',
  MASTER:      'text-purple-400',
  DIAMOND:     'text-blue-400',
  EMERALD:     'text-emerald-400',
  PLATINUM:    'text-teal-400',
  GOLD:        'text-yellow-500',
  SILVER:      'text-gray-400',
  BRONZE:      'text-orange-700',
  IRON:        'text-gray-500',
  UNRANKED:    'text-gray-600',
};

/* winrate inline color usando tokens CSS */
function winrateColor(wr: number): string {
  if (wr >= 60) return 'var(--win)';
  if (wr >= 50) return 'var(--gold)';
  return 'var(--loss)';
}

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

  /* estilos de botão de filtro via tokens CSS */
  const filterBtnBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 12px',
    borderRadius: 'var(--radius-full)',
    fontSize: 'var(--text-xs)',
    fontWeight: 600,
    fontFamily: 'var(--font-display)',
    border: '1px solid var(--border)',
    color: 'var(--text-muted)',
    background: 'transparent',
    transition: 'border-color var(--ease-ui), color var(--ease-ui), background var(--ease-ui)',
    textDecoration: 'none',
    whiteSpace: 'nowrap' as const,
    cursor: 'pointer',
  };
  const filterBtnActive: React.CSSProperties = {
    ...filterBtnBase,
    border: '1px solid var(--border-gold)',
    color: 'var(--gold)',
    background: 'var(--gold-dim)',
  };

  return (
    <main className="min-h-screen" style={{ background: 'var(--bg)', paddingTop: 'var(--sp-10)', paddingBottom: 'var(--sp-10)', paddingInline: 'var(--sp-4)' }}>
      <div style={{ maxWidth: 'var(--content-default)', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 'var(--sp-8)' }}>

        {/* Cabeçalho */}
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 800, color: 'var(--text)' }}>
            Jogadores
          </h1>
          <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)', marginTop: 'var(--sp-1)' }}>
            {players?.length ?? 0} jogador{players?.length !== 1 ? 'es' : ''} encontrado{players?.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Filtros */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>

          {/* Busca */}
          <form method="GET" action="/jogadores">
            {role && <input type="hidden" name="role" value={role} />}
            {tier && <input type="hidden" name="tier" value={tier} />}
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por summoner name..."
              className="input-lol"
              style={{ maxWidth: 320 }}
            />
          </form>

          {/* Filtro Role */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginRight: 'var(--sp-1)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Role:</span>
            <Link href={buildQuery({ role: undefined })} style={!role ? filterBtnActive : filterBtnBase}>Todos</Link>
            {roles.map((r) => (
              <Link key={r} href={buildQuery({ role: r })} style={role === r ? filterBtnActive : filterBtnBase}>
                {ROLE_LABELS[r] ?? r}
              </Link>
            ))}
          </div>

          {/* Filtro Tier */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 'var(--sp-2)' }}>
            <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)', marginRight: 'var(--sp-1)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Tier:</span>
            <Link href={buildQuery({ tier: undefined })} style={!tier ? filterBtnActive : filterBtnBase}>Todos</Link>
            {tiers.map((t) => (
              <Link
                key={t}
                href={buildQuery({ tier: t })}
                className={TIER_COLORS[t]}
                style={tier?.toUpperCase() === t ? { ...filterBtnActive } : { ...filterBtnBase }}
              >
                {t[0] + t.slice(1).toLowerCase()}
              </Link>
            ))}
          </div>
        </div>

        {/* Lista */}
        {(players ?? []).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 'var(--sp-16) var(--sp-8)' }}>
            <div
              className="mx-auto mb-4 flex items-center justify-center"
              style={{
                width: 56,
                height: 56,
                borderRadius: 'var(--radius-xl)',
                background: 'var(--gold-dim)',
                border: '1px solid var(--border-gold)',
                color: 'var(--gold)',
                margin: '0 auto var(--sp-4)',
              }}
            >
              <Gamepad2 size={24} />
            </div>
            <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text)', marginBottom: 'var(--sp-2)' }}>
              Nenhum jogador encontrado.
            </p>
            <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-muted)' }}>
              Tente ajustar os filtros ou a busca.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
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
                <div
                  className="card-sm group"
                  style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-4)' }}
                >
                  {/* Número ranking */}
                  <span style={{
                    fontSize: 'var(--text-xs)',
                    color: 'var(--text-faint)',
                    width: 24,
                    textAlign: 'right',
                    flexShrink: 0,
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 600,
                  }}>
                    {idx + 1}
                  </span>

                  {/* Emblema tier */}
                  <div style={{ width: 40, height: 40, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {emblem ? (
                      <img src={emblem} width={40} height={40} alt={player.tier ?? ''} loading="lazy" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                    ) : (
                      <div style={{
                        width: 32, height: 32, borderRadius: 'var(--radius-full)',
                        background: 'var(--surface-3)', border: '1px solid var(--border-soft)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'var(--text-faint)',
                      }}>
                        <Shield size={14} />
                      </div>
                    )}
                  </div>

                  {/* Nome + tag + role */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 'var(--text-sm)',
                        fontWeight: 600,
                        color: 'var(--text)',
                        fontFamily: 'var(--font-display)',
                        transition: 'color var(--ease-ui)',
                      }} className="group-hover:text-[var(--gold)]">
                        {displayName}
                      </span>
                      {displayTag && (
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>#{displayTag}</span>
                      )}
                      {player.role && (
                        <span className="badge-gold" style={{ fontSize: '0.65rem' }}>
                          {ROLE_LABELS[player.role] ?? player.role}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Tier + LP */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p className={`text-sm font-semibold ${TIER_COLORS[player.tier ?? 'UNRANKED']}`}>
                      {player.tier ?? 'UNRANKED'} {player.rank ?? ''}
                    </p>
                    {player.lp != null && (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{player.lp} LP</p>
                    )}
                  </div>

                  {/* Winrate — oculto em mobile */}
                  <div style={{ textAlign: 'right', flexShrink: 0, minWidth: 64 }} className="hidden sm:block">
                    {winrate !== null ? (
                      <>
                        <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-muted)' }}>{player.wins}V {player.losses}D</p>
                        <p style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: winrateColor(winrate) }}>
                          {winrate}% WR
                        </p>
                      </>
                    ) : (
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-faint)' }}>—</p>
                    )}
                  </div>

                  {/* CTA */}
                  {href && (
                    <div style={{ flexShrink: 0 }}>
                      <span className="badge-gold" style={{ fontSize: 'var(--text-xs)', whiteSpace: 'nowrap' }}>
                        Ver Perfil →
                      </span>
                    </div>
                  )}
                </div>
              );

              return href ? (
                <Link key={player.id} href={href} style={{ display: 'block', textDecoration: 'none' }}>
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
