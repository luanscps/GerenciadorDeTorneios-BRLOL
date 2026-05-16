'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import InvitePlayerForm from '@/components/times/InvitePlayerForm';
import { cancelarConvite, removerJogador, listarConvitesEnviados } from '@/lib/actions/roster';

const ROLE_LABELS: Record<string, string> = {
  TOP: 'Top', JUNGLE: 'Jungle', MID: 'Mid', ADC: 'ADC', SUPPORT: 'Suporte',
};
const TIER_COLORS: Record<string, string> = {
  IRON: 'text-gray-400', BRONZE: 'text-amber-700', SILVER: 'text-gray-300',
  GOLD: 'text-yellow-400', PLATINUM: 'text-teal-400', EMERALD: 'text-emerald-400',
  DIAMOND: 'text-blue-400', MASTER: 'text-purple-400', GRANDMASTER: 'text-red-400',
  CHALLENGER: 'text-yellow-300', UNRANKED: 'text-gray-500',
};
const INVITE_STATUS_STYLE: Record<string, string> = {
  PENDING:   'text-yellow-400 bg-yellow-400/10 border-yellow-400/30',
  ACCEPTED:  'text-green-400 bg-green-400/10 border-green-400/30',
  REJECTED:  'text-red-400 bg-red-400/10 border-red-400/30',
  CANCELLED: 'text-gray-500 bg-gray-500/10 border-gray-500/30',
};
const INVITE_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Aguardando', ACCEPTED: 'Aceito', REJECTED: 'Recusado', CANCELLED: 'Cancelado',
};

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
    puuid: string | null;
  } | null;
}

// Fonte de verdade do roster — team_members
interface TeamMember {
  id: string;
  team_role: string;
  lane: string | null;
  riot_account: RiotAccount | null;
}

interface InvitedProfile {
  riot_game_name: string | null;
  riot_tagline: string | null;
}

interface Invite {
  id: string;
  invited_profile: InvitedProfile | null;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
}

// Tipo bruto do Supabase: join via FK retorna invited_profile como array
interface _RawInvite {
  id: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  invited_profile: InvitedProfile | InvitedProfile[] | null;
}

// Normaliza invited_profile de array para objeto — mesmo padrão do convites/page.tsx
function normalizeInvites(raw: unknown[]): Invite[] {
  return (raw as _RawInvite[]).map((inv) => ({
    ...inv,
    invited_profile: (Array.isArray(inv.invited_profile)
      ? inv.invited_profile[0]
      : inv.invited_profile) as InvitedProfile | null,
  }));
}

interface Team {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  owner_id: string;
  team_members: TeamMember[];
}

export default function RosterPage() {
  const params   = useParams();
  const teamId   = params.id as string;
  const router   = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [team, setTeam]       = useState<Team | null>(null);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [removing, setRemoving]     = useState<string | null>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }

    // Roster via team_members → riot_accounts → players (stats de perfil)
    const { data, error: err } = await supabase
      .from('teams')
      .select(`
        id, name, tag, logo_url, owner_id,
        team_members (
          id, team_role, lane,
          riot_account:riot_accounts (
            id, game_name, tag_line,
            player:players ( id, tier, rank, lp, wins, losses, puuid )
          )
        )
      `)
      .eq('id', teamId)
      .single();

    if (err || !data) { setError('Time não encontrado.'); setLoading(false); return; }
    if (data.owner_id !== user.id) { setError('Apenas o capitão pode gerenciar o roster.'); setLoading(false); return; }

    setTeam(data as unknown as Team);

    const { data: invData } = await listarConvitesEnviados(teamId);
    // Supabase retorna invited_profile como array via FK join — normaliza para objeto
    setInvites(invData ? normalizeInvites(invData as unknown[]) : []);
    setLoading(false);
  }, [supabase, router, teamId]);

  useEffect(() => { loadData(); }, [loadData]);

  // playerId aqui é players.id — removerJogador resolve o profile_id internamente
  async function handleRemove(playerId: string) {
    if (!confirm('Remover este jogador do time?')) return;
    setRemoving(playerId);
    const res = await removerJogador(playerId, teamId);
    if (res.error) alert(res.error);
    else await loadData();
    setRemoving(null);
  }

  async function handleCancelInvite(inviteId: string) {
    setCancelling(inviteId);
    const res = await cancelarConvite(inviteId, teamId);
    if (res.error) alert(res.error);
    else await loadData();
    setCancelling(null);
  }

  if (loading) return (
    <main className="min-h-screen bg-[#050E1A] flex items-center justify-center">
      <p className="text-gray-400 animate-pulse">Carregando roster...</p>
    </main>
  );

  if (error) return (
    <main className="min-h-screen bg-[#050E1A] flex items-center justify-center">
      <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-8 text-center space-y-3">
        <p className="text-4xl">⚠️</p>
        <p className="text-red-400">{error}</p>
        <Link href="/dashboard" className="text-blue-400 text-sm hover:underline">Voltar ao Dashboard</Link>
      </div>
    </main>
  );

  if (!team) return null;

  const members        = team.team_members ?? [];
  const pendingInvites = invites.filter(i => i.status === 'PENDING');
  const historyInvites = invites.filter(i => i.status !== 'PENDING');
  const slots          = Array.from({ length: 5 }, (_, i) => members[i] ?? null);

  return (
    <main className="min-h-screen bg-[#050E1A] py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-lg">
              👥
            </div>
            <div>
              <h1 className="text-white font-bold text-xl">Roster — [{team.tag}] {team.name}</h1>
              <p className="text-gray-500 text-xs">{members.length}/5 jogadores</p>
            </div>
          </div>
          <Link
            href={`/dashboard/times/${teamId}`}
            className="text-xs text-gray-400 hover:text-blue-400 border border-[#1E3A5F] px-3 py-1.5 rounded-lg transition-colors"
          >
            ← Painel
          </Link>
        </div>

        {/* Vagas visuais */}
        <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4 space-y-2">
          <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">Slots do Time</h2>
          {slots.map((member, i) => {
            if (!member) {
              return (
                <div key={`empty-${i}`} className="flex items-center gap-3 bg-[#0D1E35]/60 border border-dashed border-[#1E3A5F] rounded-lg px-3 py-2">
                  <div className="w-8 h-8 rounded-full border border-dashed border-[#2A4060] flex items-center justify-center text-gray-600 text-sm">
                    {i + 1}
                  </div>
                  <p className="text-gray-600 text-sm italic">Vaga aberta</p>
                </div>
              );
            }
            const ra    = member.riot_account;
            const player = ra?.player;
            const lane  = member.lane ?? '';
            const tier  = player?.tier ?? 'UNRANKED';
            const tierColor = TIER_COLORS[tier.toUpperCase()] ?? 'text-gray-400';
            const total = (player?.wins ?? 0) + (player?.losses ?? 0);
            const wr    = total > 0 ? Math.round(((player?.wins ?? 0) / total) * 100) : 0;
            // ID para remoção: players.id (resolvido internamente em removerJogador)
            const playerDbId = player?.id ?? '';
            return (
              <div key={member.id} className="flex items-center gap-3 bg-[#0D1E35] border border-[#1E3A5F] rounded-lg px-3 py-2">
                <div className="w-8 h-8 rounded-full bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-xs font-bold text-blue-400">
                  {lane?.slice(0, 1) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white text-sm font-semibold truncate">
                    {ra?.game_name ?? '—'}
                    <span className="text-gray-500 font-normal"> #{ra?.tag_line ?? ''}</span>
                  </p>
                  <p className={`text-xs ${tierColor}`}>
                    {ROLE_LABELS[lane] ?? lane} · {tier} {player?.rank ?? ''} · {player?.lp ?? 0} LP · {wr}% WR
                  </p>
                </div>
                <button
                  onClick={() => handleRemove(playerDbId)}
                  disabled={removing === playerDbId}
                  className="text-xs text-red-400 hover:text-red-300 border border-red-400/30 hover:border-red-400/60 px-2 py-1 rounded transition-colors disabled:opacity-40"
                >
                  {removing === playerDbId ? '...' : 'Remover'}
                </button>
              </div>
            );
          })}
        </div>

        {/* Formulário de convite */}
        <InvitePlayerForm
          teamId={teamId}
          currentCount={members.length}
          onInviteSent={loadData}
        />

        {/* Convites pendentes */}
        {pendingInvites.length > 0 && (
          <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4 space-y-2">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">
              ⏳ Convites Aguardando Resposta ({pendingInvites.length})
            </h2>
            {pendingInvites.map(inv => {
              const gameName = inv.invited_profile?.riot_game_name ?? '—';
              const tagline  = inv.invited_profile?.riot_tagline ?? '';
              return (
                <div key={inv.id} className="flex items-center gap-3 bg-[#0D1E35] border border-yellow-400/20 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {gameName}
                      <span className="text-gray-500 font-normal"> #{tagline}</span>
                    </p>
                    <p className="text-gray-500 text-xs">
                      {ROLE_LABELS[inv.role] ?? inv.role} · Expira {new Date(inv.expires_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-xs text-yellow-400 bg-yellow-400/10 border border-yellow-400/30 px-2 py-0.5 rounded-full">
                    Aguardando
                  </span>
                  <button
                    onClick={() => handleCancelInvite(inv.id)}
                    disabled={cancelling === inv.id}
                    className="text-xs text-gray-500 hover:text-red-400 transition-colors disabled:opacity-40"
                  >
                    {cancelling === inv.id ? '...' : 'Cancelar'}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* Histórico de convites */}
        {historyInvites.length > 0 && (
          <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-xl p-4 space-y-2">
            <h2 className="text-gray-400 text-xs uppercase tracking-wider font-semibold mb-3">
              📋 Histórico de Convites
            </h2>
            {historyInvites.map(inv => {
              const style    = INVITE_STATUS_STYLE[inv.status] ?? 'text-gray-400';
              const gameName = inv.invited_profile?.riot_game_name ?? '—';
              const tagline  = inv.invited_profile?.riot_tagline ?? '';
              return (
                <div key={inv.id} className="flex items-center gap-3 bg-[#0D1E35] border border-[#1E3A5F] rounded-lg px-3 py-2 opacity-70">
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">
                      {gameName}
                      <span className="text-gray-500 font-normal"> #{tagline}</span>
                    </p>
                    <p className="text-gray-500 text-xs">
                      {ROLE_LABELS[inv.role] ?? inv.role} · {new Date(inv.created_at).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className={`text-xs border px-2 py-0.5 rounded-full ${style}`}>
                    {INVITE_STATUS_LABEL[inv.status] ?? inv.status}
                  </span>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </main>
  );
}
