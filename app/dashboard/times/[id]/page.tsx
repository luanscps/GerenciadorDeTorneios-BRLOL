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

// Perfil do invocador vindo de riot_accounts + players (stats)
interface RiotAccount {
  id: string;
  game_name: string;
  tag_line: string;
  player: {
    id: string;
    tier: string;
    rank: string;
    lp: number;
    wins: number;
    losses: number;
    role: string | null;
    puuid: string | null;
  } | null;
}

// Vínculo time ↔ jogador — fonte de verdade do roster
interface TeamMember {
  id: string;
  team_role: string;
  lane: string | null;
  riot_account: RiotAccount | null;
}

interface Inscricao {
  id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  tournament_id: string;
  tournaments: { name: string; status: string } | null;
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

  const [team, setTeam]       = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [savingLane, setSavingLane]   = useState<string | null>(null);
  const [savedLane, setSavedLane]     = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Roster via team_members → riot_accounts → players
      const { data, error: err } = await supabase
        .from('teams')
        .select(`
          id, name, tag, logo_url, owner_id,
          team_members (
            id, team_role, lane,
            riot_account:riot_accounts (
              id, game_name, tag_line,
              player:players ( id, tier, rank, lp, wins, losses, role, puuid )
            )
          ),
          inscricoes (
            id, status, checked_in, checked_in_at, tournament_id,
            tournaments ( name, status )
          )
        `)
        .eq('id', teamId)
        .single();

      if (err || !data) { setError('Time não encontrado.'); setLoading(false); return; }
      if (data.owner_id !== user.id) { setError('Apenas o capitão pode acessar este painel.'); setLoading(false); return; }

      setTeam(data as unknown as Team);
      setLoading(false);
    }
    load();
  }, [supabase, router, teamId]);

  // Atualiza lane do jogador via team_members (lane de LoL)
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

  const members = team.team_members ?? [];
  const insc    = team.inscricoes[0] as Inscricao | undefined;

  const statusColor: Record<string, string> = {
    PENDING:  'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
    APPROVED: 'text-green-400 bg-green-400/10 border-green-400/30',
    REJECTED: 'text-red-400 bg-red-400/10 border-red-400/30',
  };

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

        {/* Status da Inscrição */}
        {insc && (
          <div className={`border rounded-xl p-4 ${statusColor[insc.status] ?? 'text-gray-400 bg-[#1E2A3A] border-[#1E3A5F]'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider font-semibold mb-1">Status da Inscrição</p>
                <p className="font-bold text-lg">{insc.status}</p>
                {(insc.tournaments as any)?.name && (
                  <p className="text-xs mt-1 opacity-70">🏆 {(insc.tournaments as any).name}</p>
                )}
              </div>
              {insc.status === 'APPROVED' && (
                <Link
                  href={`/dashboard/times/${teamId}/checkin`}
                  className="btn-gold px-4 py-2 text-sm font-bold"
                >
                  {insc.checked_in ? '✅ Check-in Feito' : '📋 Fazer Check-in'}
                </Link>
              )}
            </div>
            {insc.checked_in && insc.checked_in_at && (
              <p className="text-xs mt-2 opacity-60">
                Check-in realizado em {new Date(insc.checked_in_at).toLocaleString('pt-BR')}
              </p>
            )}
          </div>
        )}

        {/* Jogadores */}
        <div className="card-lol space-y-3">
          <h2 className="text-white font-bold mb-2">👥 Jogadores ({members.length}/5)</h2>

          {members.length === 0 && (
            <p className="text-gray-500 text-sm text-center py-4">Nenhum jogador no time ainda.</p>
          )}

          {members.map(m => {
            const ra      = m.riot_account;
            const player  = ra?.player;
            const lane    = m.lane ?? '';
            const tier    = player?.tier ?? 'UNRANKED';
            const tierColor = TIER_COLORS[tier.toUpperCase()] ?? 'text-gray-400';
            const total   = (player?.wins ?? 0) + (player?.losses ?? 0);
            const wr      = total > 0 ? Math.round(((player?.wins ?? 0) / total) * 100) : 0;
            const justSaved = savedLane === m.id;

            return (
              <div
                key={m.id}
                className="flex items-center gap-3 bg-[#0D1E35] border border-[#1E3A5F] rounded-lg p-3"
              >
                <div className="w-9 h-9 rounded-full bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-xs font-bold text-gray-400">
                  {lane?.slice(0, 1) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {ra?.game_name ?? '—'}
                    <span className="text-gray-500 font-normal"> #{ra?.tag_line ?? ''}</span>
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
          {insc?.tournament_id && (
            <Link
              href={`/torneios/${insc.tournament_id}`}
              className="btn-gold flex-1 py-3 text-center text-sm"
            >
              Ver Torneio
            </Link>
          )}
        </div>

      </div>
    </main>
  );
}
