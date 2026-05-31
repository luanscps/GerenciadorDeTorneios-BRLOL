import React from 'react';
import Link from 'next/link';

// Mapeamento tier → cor usando tokens CSS definidos em globals.css
const TIER_COLOR_VAR: Record<string, string> = {
  IRON:         'var(--text-muted)',
  BRONZE:       '#CD7F32',
  SILVER:       'var(--text-muted)',
  GOLD:         'var(--gold)',
  PLATINUM:     '#4FC3C3',
  EMERALD:      '#50C878',
  DIAMOND:      'var(--blue-lol)',
  MASTER:       '#9B59B6',
  GRANDMASTER:  'var(--loss)',
  CHALLENGER:   'var(--gold-hover)',
};

const ROLE_LABELS: Record<string, string> = {
  TOP:     'Top',
  JUNGLE:  'Jungle',
  MID:     'Mid',
  ADC:     'ADC',
  SUPPORT: 'Suporte',
};

const TIER_EMBLEM: Record<string, string> = {
  IRON:         'iron',
  BRONZE:       'bronze',
  SILVER:       'silver',
  GOLD:         'gold',
  PLATINUM:     'platinum',
  EMERALD:      'emerald',
  DIAMOND:      'diamond',
  MASTER:       'master',
  GRANDMASTER:  'grandmaster',
  CHALLENGER:   'challenger',
};

interface PlayerCardProps {
  summonerName: string;
  tagLine: string;
  role: string;
  tier: string;
  rank: string;
  lp: number;
  wins: number;
  losses: number;
  wr: number;
  puuid?: string | null;
  profileIconId?: number | null;
  topChampionId?: string | null;
  team?: { id: string; name: string; tag: string; logoUrl: string | null } | null;
  DD_VERSION: string;
  linkToProfile?: boolean;
  // Props explícitas para montar a rota correta /jogadores/[gameName]/[tagLine]
  gameName?: string | null;
}

export default function PlayerCard({
  summonerName,
  tagLine,
  role,
  tier,
  rank,
  lp,
  wins,
  losses,
  wr,
  puuid,
  profileIconId,
  topChampionId,
  team,
  DD_VERSION,
  linkToProfile = true,
  gameName,
}: PlayerCardProps) {
  const tierColor   = TIER_COLOR_VAR[tier?.toUpperCase()] ?? 'var(--text)';
  const roleLabel   = ROLE_LABELS[role?.toUpperCase()] ?? role;
  const tierKey     = TIER_EMBLEM[tier?.toUpperCase()] ?? null;

  // Rota correta: /jogadores/[gameName]/[tagLine]
  // Fallback para summonerName caso gameName não seja passado explicitamente
  const routeName   = gameName ?? summonerName;
  const profileHref = `/jogadores/${encodeURIComponent(routeName)}/${encodeURIComponent(tagLine)}`;

  const profileIconUrl = profileIconId
    ? `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/profileicon/${profileIconId}.png`
    : null;

  const rankEmblemUrl = tierKey
    ? `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-${tierKey}.png`
    : null;

  const championIconUrl = topChampionId
    ? `https://ddragon.leagueoflegends.com/cdn/${DD_VERSION}/img/champion/${topChampionId}.png`
    : null;

  const nameEl = (
    <span style={{ color: 'var(--text)', fontWeight: 600, fontSize: 'var(--text-base)' }}>
      {summonerName}
      <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: 'var(--text-sm)' }}>
        {' '}#{tagLine}
      </span>
    </span>
  );

  return (
    <div
      style={{
        background:    'var(--surface)',
        border:        '1px solid var(--border)',
        borderRadius:  'var(--radius-lg)',
        padding:       'var(--sp-4)',
        display:       'flex',
        alignItems:    'flex-start',
        gap:           'var(--sp-4)',
        transition:    'box-shadow var(--ease-ui), border-color var(--ease-ui)',
      }}
      className="hover:border-[var(--border-gold)] hover:shadow-[var(--shadow-md)]"
    >
      {/* Ícone de perfil */}
      <div style={{ flexShrink: 0, position: 'relative', width: 56, height: 56 }}>
        {profileIconUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={profileIconUrl}
              alt={`Ícone de ${summonerName}`}
              width={56}
              height={56}
              style={{ borderRadius: '50%', width: 56, height: 56, objectFit: 'cover' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            {/* Moldura sobreposta via Community Dragon */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/regalia/regalia-profile-frame-gold.png"
              alt=""
              aria-hidden="true"
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none' }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          </>
        ) : (
          <div
            style={{
              width: 56, height: 56,
              borderRadius: '50%',
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-sm)', fontWeight: 700 }}>
              {role?.slice(0, 1) || '?'}
            </span>
          </div>
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Nome + role */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)', flexWrap: 'wrap' }}>
          {linkToProfile ? (
            <Link href={profileHref} style={{ textDecoration: 'none' }} className="hover:underline">
              {nameEl}
            </Link>
          ) : (
            nameEl
          )}
          <span
            style={{
              color:         'var(--text-faint)',
              fontSize:      'var(--text-xs)',
              background:    'var(--surface-2)',
              border:        '1px solid var(--border-soft)',
              borderRadius:  'var(--radius-sm)',
              padding:       '2px 8px',
            }}
          >
            {roleLabel}
          </span>
        </div>

        {/* Emblema de rank + stats */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-3)', marginBottom: 'var(--sp-2)' }}>
          {rankEmblemUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={rankEmblemUrl}
              alt={`Emblema ${tier}`}
              width={40}
              height={40}
              style={{ width: 40, height: 40, objectFit: 'contain', flexShrink: 0 }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontWeight: 700, fontSize: 'var(--text-sm)', color: tierColor }}>
              {tier} {rank}
            </span>
            <span style={{ color: 'var(--text-faint)', fontSize: 'var(--text-xs)' }}>
              {lp} LP
            </span>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
            {wins}V/{losses}D
          </span>
          <span
            style={{
              fontSize:   'var(--text-xs)',
              fontWeight: 600,
              color:      wr >= 50 ? 'var(--win)' : 'var(--loss)',
              background: wr >= 50 ? 'var(--win-dim)' : 'var(--loss-dim)',
              border:     `1px solid ${wr >= 50 ? 'rgba(34,197,94,0.3)' : 'rgba(239,68,68,0.3)'}`,
              borderRadius: 'var(--radius-full)',
              padding:    '2px 8px',
            }}
          >
            {wr}% WR
          </span>
        </div>

        {/* Campeão mais jogado */}
        {championIconUrl && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', marginBottom: 'var(--sp-1)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={championIconUrl}
              alt={topChampionId ?? 'campeão'}
              width={24}
              height={24}
              style={{
                width: 24, height: 24,
                borderRadius: 'var(--radius-sm)',
                objectFit: 'cover',
                border: '1px solid var(--border)',
              }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
            />
            <span style={{ color: 'var(--text-muted)', fontSize: 'var(--text-xs)' }}>
              {topChampionId}
            </span>
          </div>
        )}

        {/* Time */}
        {team && (
          <div style={{ marginTop: 'var(--sp-1)' }}>
            <Link
              href={`/times/${team.tag}`}
              style={{
                fontSize:       'var(--text-xs)',
                color:          'var(--text-muted)',
                textDecoration: 'none',
                transition:     'color var(--ease-ui)',
              }}
              className="hover:text-[var(--blue-lol)]"
            >
              {team.name} [{team.tag}]
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
