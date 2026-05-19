'use client';
import { useState, useEffect, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MID: 'Mid', ADC: 'ADC', SUPPORT: 'Suporte',
};

const TIER_COLORS: Record<string, string> = {
  IRON: 'text-gray-400', BRONZE: 'text-amber-700', SILVER: 'text-gray-300',
  GOLD: 'text-yellow-400', PLATINUM: 'text-teal-400', EMERALD: 'text-emerald-400',
  DIAMOND: 'text-blue-400', MASTER: 'text-purple-400', GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-yellow-300', UNRANKED: 'text-gray-500',
};

// dispute_status enum real: OPEN | UNDER_REVIEW | RESOLVED | DISMISSED
const DISPUTE_STATUS_LABEL: Record<string, string> = {
  OPEN:         'Aberta',
  UNDER_REVIEW: 'Em análise',
  RESOLVED:     'Resolvida',
  DISMISSED:    'Indeferida',
};
const DISPUTE_STATUS_COLOR: Record<string, string> = {
  OPEN:         'text-yellow-400 bg-yellow-400/10 border-yellow-500/30',
  UNDER_REVIEW: 'text-blue-400 bg-blue-400/10 border-blue-500/30',
  RESOLVED:     'text-green-400 bg-green-400/10 border-green-500/30',
  DISMISSED:    'text-red-400 bg-red-400/10 border-red-500/30',
};

const INSC_STATUS_COLOR: Record<string, string> = {
  PENDING:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  APPROVED: 'text-green-400 bg-green-400/10 border-green-400/30',
  REJECTED: 'text-red-400 bg-red-400/10 border-red-400/30',
};

interface PlayerInfo {
  id: string;
  summoner_name: string | null;
  tag_line: string | null;
  tier: string | null;
  rank: string | null;
  lp: number | null;
  wins: number | null;
  losses: number | null;
  role: string | null;
  profile_icon_id: number | null;
}

interface RiotAccount {
  id: string;
  game_name: string;
  tag_line: string;
}

interface TeamMember {
  id: string;
  team_role: string;
  lane: string | null;
  profile_id: string | null;
  riot_account: RiotAccount | null;
}

interface Inscricao {
  id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  tournament_id: string;
  tournaments: { id: string; name: string; status: string } | null;
}

interface ProximaPartida {
  id: string;
  round: number;
  match_number: number;
  scheduled_at: string | null;
  best_of: number;
  team_a: { id: string; name: string; tag: string } | null;
  team_b: { id: string; name: string; tag: string } | null;
  tournament: { id: string; name: string; slug: string | null } | null;
}

interface Disputa {
  id: string;
  status: string;
  reason: string;
  evidence_url: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
  match: {
    id: string;
    round: number;
    match_number: number;
    team_a: { name: string; tag: string } | null;
    team_b: { name: string; tag: string } | null;
  } | null;
  tournament: { id: string; name: string; slug: string | null } | null;
}

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  owner_id: string;
  team_members: TeamMember[];
  inscricoes: Inscricao[];
}

export default function PainelCapitaoPage() {
  const params   = useParams();
  const teamId   = params.id as string;
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [team, setTeam]                 = useState<Team | null>(null);
  const [playerMap, setPlayerMap]       = useState<Record<string, PlayerInfo>>({});
  const [proximasPartidas, setProximas] = useState<ProximaPartida[]>([]);
  const [disputas, setDisputas]         = useState<Disputa[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [savingLane, setSavingLane]     = useState<string | null>(null);
  const [savedLane, setSavedLane]       = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const { data, error: err } = await supabase
        .from('teams')
        .select(`
          id, name, tag, logo_url, owner_id,
          team_members (
            id, team_role, lane, profile_id,
            riot_account:riot_accounts ( id, game_name, tag_line )
          ),
          inscricoes (
            id, status, checked_in, checked_in_at, tournament_id,
            tournaments ( id, name, status )
          )
        `)
        .eq('id', teamId)
        .single();

      if (err || !data) { setError('Time não encontrado.'); setLoading(false); return; }
      if (data.owner_id !== user.id) { setError('Apenas o capitão pode acessar este painel.'); setLoading(false); return; }

      const teamData = data as unknown as Team;
      setTeam(teamData);

      const profileIds = (teamData.team_members ?? [])
        .map(m => m.profile_id)
        .filter(Boolean) as string[];

      const riotIds = (teamData.team_members ?? [])
        .map(m => m.riot_account)
        .filter(Boolean) as RiotAccount[];

      if (profileIds.length > 0 || riotIds.length > 0) {
        let playersQuery = supabase
          .from('players')
          .select('id, summoner_name, tag_line, tier, rank, lp, wins, losses, role, profile_icon_id, profile_id');

        if (profileIds.length > 0) {
          playersQuery = playersQuery.in('profile_id', profileIds);
        } else {
          const names = riotIds.map(r => r.game_name);
          playersQuery = playersQuery.in('summoner_name', names);
        }

        const { data: playersData } = await playersQuery;
        const map: Record<string, PlayerInfo> = {};
        for (const p of playersData ?? []) {
          if ((p as any).profile_id) map[(p as any).profile_id] = p as PlayerInfo;
          const key = `${(p.summoner_name ?? '').toLowerCase()}#${(p.tag_line ?? '').toLowerCase()}`;
          if (key !== '#') map[key] = p as PlayerInfo;
        }
        setPlayerMap(map);
      }

      // Próximas partidas SCHEDULED
      const { data: partidas } = await supabase
        .from('matches')
        .select(`
          id, round, match_number, scheduled_at, best_of,
          team_a:teams!team_a_id ( id, name, tag ),
          team_b:teams!team_b_id ( id, name, tag ),
          tournament:tournaments ( id, name, slug )
        `)
        .eq('status', 'SCHEDULED')
        .or(`team_a_id.eq.${teamId},team_b_id.eq.${teamId}`)
        .order('scheduled_at', { ascending: true })
        .limit(5);

      setProximas((partidas ?? []) as unknown as ProximaPartida[]);

      // Disputas do time — dispute_status enum: OPEN | UNDER_REVIEW | RESOLVED | DISMISSED
      const { data: disp } = await supabase
        .from('disputes')
        .select(`
          id, status, reason, evidence_url, resolution_notes,
          created_at, resolved_at,
          match:matches (
            id, round, match_number,
            team_a:teams!team_a_id ( name, tag ),
            team_b:teams!team_b_id ( name, tag )
          ),
          tournament:tournaments ( id, name, slug )
        `)
        .eq('team_id', teamId)
        .order('created_at', { ascending: false })
        .limit(10);

      setDisputas((disp ?? []) as unknown as Disputa[]);
      setLoading(false);
    }
    load();
  }, [supabase, router, teamId]);

  async function handleLaneChange(memberId: string, newLane: string) {
    setSavingLane(memberId);
    setSavedLane(null);
    const { error: updateErr } = await supabase
      .from('team_members')
      .update({ lane: newLane })
      .eq('id', memberId);
    if (!updateErr) {
      setTeam(prev => prev ? {
        ...prev,
        team_members: prev.team_members.map(m =>
          m.id === memberId ? { ...m, lane: newLane } : m
        ),
      } : prev);
      setSavedLane(memberId);
      setTimeout(() => setSavedLane(null), 2000);
    }
    setSavingLane(null);
  }

  if (loading) return (
    <main className="min-h-screen bg-[#050E1A] flex items-center justify-center">
      <p className="text-gray-400">Carregando painel...</p>
    </main>
  );

  if (error) return (
    <main className="min-h-screen bg-[#050E1A] flex items-center justify-center">
      <div className="card-lol text-center space-y-3">
        <p className="text-4xl">⚠️</p>
        <p className="text-red-400">{error}</p>
        <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">Voltar ao Dashboard</Link>
      </div>
    </main>
  );

  if (!team) return null;

  const members    = team.team_members ?? [];
  const inscricoes = (team.inscricoes ?? []) as Inscricao[];
  const inscAtivas = inscricoes
    .filter(i => i.status !== 'REJECTED')
    .sort((a, b) => {
      const order: Record<string, number> = { APPROVED: 0, PENDING: 1 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });

  // dispute_status abertas: OPEN | UNDER_REVIEW
  const disputasAbertas   = disputas.filter(d => d.status === 'OPEN' || d.status === 'UNDER_REVIEW');
  // dispute_status resolvidas: RESOLVED | DISMISSED
  const disputasResolvidas = disputas.filter(d => d.status === 'RESOLVED' || d.status === 'DISMISSED');

  return (
    <main className="min-h-screen bg-[#050E1A] py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-xl">
            🛡️
          </div>
          <div>
            <h1 className="text-white font-bold text-2xl">[{team.tag}] {team.name}</h1>
            <p className="text-gray-500 text-sm">Painel do Capitão</p>
          </div>
        </div>

        {/* Inscrições */}
        {inscAtivas.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-white font-bold text-sm uppercase tracking-wider">🏆 Torneios</h2>
            {inscAtivas.map(insc => (
              <div
                key={insc.id}
                className={`border rounded-xl p-4 ${
                  INSC_STATUS_COLOR[insc.status] ?? 'text-gray-400 bg-[#1E2A3A] border-[#1E3A5F]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs uppercase tracking-wider font-semibold mb-1">
                      {insc.status === 'APPROVED' ? 'Aprovado' : insc.status === 'PENDING' ? 'Aguardando aprovação' : insc.status}
                    </p>
                    {(insc.tournaments as any)?.name && (
                      <p className="font-bold">{(insc.tournaments as any).name}</p>
                    )}
                    {insc.checked_in && insc.checked_in_at && (
                      <p className="text-xs mt-1 opacity-60">
                        ✅ Check-in: {new Date(insc.checked_in_at).toLocaleString('pt-BR')}
                      </p>
                    )}
                  </div>
                  {insc.status === 'APPROVED' && !insc.checked_in && (
                    <Link
                      href={`/dashboard/times/${teamId}/checkin`}
                      className="btn-gold px-4 py-2 text-sm font-bold whitespace-nowrap"
                    >
                      📋 Fazer Check-in
                    </Link>
                  )}
                  {insc.status === 'APPROVED' && insc.checked_in && (
                    <Link
                      href={`/torneios/${(insc.tournaments as any)?.id ?? insc.tournament_id}`}
                      className="btn-outline-gold px-4 py-2 text-sm font-bold whitespace-nowrap"
                    >
                      Ver Torneio
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Próximas partidas */}
        {proximasPartidas.length > 0 && (
          <div className="card-lol space-y-3">
            <h2 className="text-white font-bold mb-2">⚔️ Próximas Partidas</h2>
            {proximasPartidas.map(p => {
              const adversario = p.team_a?.id === teamId ? p.team_b : p.team_a;
              const ehTimeA    = p.team_a?.id === teamId;
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between bg-[#0D1E35] border border-[#1E3A5F] rounded-lg p-3 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-semibold">
                      {ehTimeA ? `[${team.tag}]` : `[${adversario?.tag ?? '?'}]`}
                      <span className="text-gray-500 mx-1">vs</span>
                      {ehTimeA ? `[${adversario?.tag ?? 'TBD'}]` : `[${team.tag}]`}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      Rodada {p.round} · Partida {p.match_number} · BO{p.best_of}
                      {p.tournament?.name && ` · ${p.tournament.name}`}
                    </p>
                    {p.scheduled_at && (
                      <p className="text-[#C8A84B] text-xs mt-0.5">
                        📍 {new Date(p.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Disputas abertas */}
        {disputasAbertas.length > 0 && (
          <div className="card-lol space-y-3">
            <h2 className="text-white font-bold mb-2">⚠️ Disputas Abertas ({disputasAbertas.length})</h2>
            {disputasAbertas.map(d => (
              <div
                key={d.id}
                className={`border rounded-lg p-3 text-sm ${
                  DISPUTE_STATUS_COLOR[d.status] ?? 'text-gray-400 bg-[#1E2A3A] border-[#1E3A5F]'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold">
                      {DISPUTE_STATUS_LABEL[d.status] ?? d.status}
                      {d.tournament?.name && (
                        <span className="text-xs font-normal opacity-70 ml-2">{d.tournament.name}</span>
                      )}
                    </p>
                    {d.match && (
                      <p className="text-xs opacity-70 mt-0.5">
                        Rodada {d.match.round} · {d.match.team_a?.tag ?? '?'} vs {d.match.team_b?.tag ?? '?'}
                      </p>
                    )}
                    <p className="text-xs opacity-60 mt-1 truncate">{d.reason}</p>
                  </div>
                  <span className="text-xs opacity-50 whitespace-nowrap">
                    {new Date(d.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Disputas resolvidas */}
        {disputasResolvidas.length > 0 && (
          <details className="card-lol cursor-pointer">
            <summary className="text-white font-bold text-sm select-none">
              📜 Disputas Resolvidas ({disputasResolvidas.length})
            </summary>
            <div className="mt-3 space-y-2">
              {disputasResolvidas.map(d => (
                <div
                  key={d.id}
                  className={`border rounded-lg p-3 text-sm ${
                    DISPUTE_STATUS_COLOR[d.status] ?? 'text-gray-400 bg-[#1E2A3A] border-[#1E3A5F]'
                  }`}
                >
                  <p className="font-semibold">
                    {DISPUTE_STATUS_LABEL[d.status]}
                    {d.tournament?.name && (
                      <span className="text-xs font-normal opacity-70 ml-2">{d.tournament.name}</span>
                    )}
                  </p>
                  {d.resolution_notes && (
                    <p className="text-xs opacity-70 mt-1">{d.resolution_notes}</p>
                  )}
                </div>
              ))}
            </div>
          </details>
        )}

        {/* Roster */}
        <div className="card-lol space-y-3">
          <h2 className="text-white font-bold mb-2">👥 Jogadores ({members.length}/5)</h2>

          {members.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">Nenhum jogador no time ainda.</p>
          )}

          {members.map(m => {
            const ra = m.riot_account;
            const playerByProfile = m.profile_id ? playerMap[m.profile_id] : null;
            const nameKey = `${(ra?.game_name ?? '').toLowerCase()}#${(ra?.tag_line ?? '').toLowerCase()}`;
            const playerByName = nameKey !== '#' ? playerMap[nameKey] : null;
            const player = playerByProfile ?? playerByName ?? null;

            const summonerName = ra?.game_name ?? player?.summoner_name ?? '—';
            const tagLine      = ra?.tag_line  ?? player?.tag_line      ?? '';
            const lane         = m.lane ?? player?.role ?? '';
            const tier         = (player?.tier ?? 'UNRANKED').toUpperCase();
            const tierColor    = TIER_COLORS[tier] ?? 'text-gray-400';
            const total        = (player?.wins ?? 0) + (player?.losses ?? 0);
            const wr           = total > 0 ? Math.round(((player?.wins ?? 0) / total) * 100) : 0;
            const justSaved    = savedLane === m.id;

            return (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-[#0D1E35] border border-[#1E3A5F] rounded-lg p-3"
              >
                <div className="w-9 h-9 rounded-full bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-xs font-bold text-gray-400">
                  {(lane as string)?.slice(0, 1) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {summonerName}
                    <span className="text-gray-500 font-normal"> #{tagLine}</span>
                  </p>
                  <p className={`text-xs ${tierColor}`}>
                    {tier} {player?.rank ?? ''} · {player?.lp ?? 0} LP · {player?.wins ?? 0}W/{player?.losses ?? 0}L · {wr}% WR
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {justSaved && (
                    <span className="text-green-400 text-xs">✓ Salvo</span>
                  )}
                  <select
                    value={lane}
                    onChange={e => handleLaneChange(m.id, e.target.value)}
                    disabled={savingLane === m.id}
                    className={`bg-[#1E2A3A] border text-gray-300 text-xs rounded px-2 py-1 transition-colors ${
                      justSaved ? 'border-green-500/50' : 'border-[#1E3A5F]'
                    }`}
                  >
                    {Object.entries(ROLE_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

        {/* Ações */}
        <div className="flex gap-3">
          <Link href="/dashboard" className="btn-outline-gold flex-1 py-3 text-center text-sm">
            ← Dashboard
          </Link>
          <Link href={`/dashboard/times/${teamId}/roster`} className="btn-gold flex-1 py-3 text-center text-sm">
            Gerenciar Roster
          </Link>
        </div>

      </div>
    </main>
  );
}
