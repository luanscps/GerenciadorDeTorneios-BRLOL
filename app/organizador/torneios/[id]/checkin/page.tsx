import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { CheckinClient } from './checkin-client';

// Tipagem forte para evitar 'any'
type RiotAccountRow = {
  id: string;
  game_name: string;
  tag_line: string;
  puuid: string | null;
};

type TeamMemberRow = {
  id: string;
  team_role: string | null;
  riot_account: RiotAccountRow | null;
};

type TeamRow = {
  id: string;
  name: string;
  tag: string;
  logo_url: string | null;
  owner_id: string;
  team_members: TeamMemberRow[];
};

type CheckedInByRow = {
  full_name: string | null;
  email: string | null;
} | null;

type InscricaoRow = {
  id: string;
  status: string;
  checked_in: boolean;
  checked_in_at: string | null;
  teams: TeamRow | null;
  profiles: CheckedInByRow;
};

export default async function OrganizadorCheckinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // ── Auth ──────────────────────────────────────────────────────────────────
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // ── Torneio ───────────────────────────────────────────────────────────────
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status, organizer_id, created_by')
    .eq('id', id)
    .single();
  if (!tournament) notFound();

  // ── Guard: usa 'role' (schema atual), NÃO is_admin ────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, is_admin')
    .eq('id', user.id)
    .single();

  const isAdmin = profile?.is_admin === true || profile?.role === 'admin';
  const isOrganizer =
    tournament.organizer_id === user.id || tournament.created_by === user.id;

  if (!isAdmin && !isOrganizer) {
    redirect('/torneios?error=sem_permissao');
  }

  // ── Status do torneio: bloqueia checkin em torneios cancelados ────────────
  if (tournament.status === 'CANCELED') {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href={`/organizador/torneios/${id}`}
            className="text-gray-400 hover:text-white text-sm"
          >
            ← Voltar
          </Link>
          <h1 className="text-2xl font-bold text-white">📋 Check-ins</h1>
        </div>
        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-6 text-center">
          <p className="text-red-400 font-medium">Torneio cancelado — check-in indisponível.</p>
        </div>
      </div>
    );
  }

  // ── Inscrições com dados de membros e contas Riot ─────────────────────────
  const { data: inscricoes } = await supabase
    .from('inscricoes')
    .select(`
      id, status, checked_in, checked_in_at,
      teams (
        id, name, tag, logo_url, owner_id,
        team_members (
          id, team_role,
          riot_account:riot_accounts ( id, game_name, tag_line, puuid )
        )
      ),
      profiles:checked_in_by ( full_name, email )
    `)
    .eq('tournament_id', id)
    .order('checked_in', { ascending: false })
    .order('checked_in_at', { ascending: true });

  const rows = (inscricoes ?? []) as unknown as InscricaoRow[];

  const total = rows.length;
  const checkedIn = rows.filter((i) => i.checked_in).length;
  const pending = rows.filter(
    (i) => !i.checked_in && i.status === 'APPROVED'
  ).length;
  const rejected = rows.filter((i) => i.status === 'REJECTED').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/organizador/torneios/${id}`}
          className="text-gray-400 hover:text-white text-sm transition-colors"
        >
          ← Voltar
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">📋 Check-ins</h1>
          <p className="text-gray-400 text-sm">{tournament.name}</p>
        </div>
        {/* Badge de status do torneio */}
        <span
          className={`ml-auto text-xs px-3 py-1 rounded-full font-medium border ${
            tournament.status === 'ONGOING'
              ? 'bg-green-400/10 text-green-400 border-green-400/30'
              : tournament.status === 'REGISTRATION'
              ? 'bg-blue-400/10 text-blue-400 border-blue-400/30'
              : 'bg-gray-400/10 text-gray-400 border-gray-400/30'
          }`}
        >
          {tournament.status}
        </span>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-white">{total}</p>
          <p className="text-gray-400 text-xs mt-1">Total Inscritos</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{checkedIn}</p>
          <p className="text-gray-400 text-xs mt-1">Check-in Feito</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-yellow-400">{pending}</p>
          <p className="text-gray-400 text-xs mt-1">Aguardando</p>
        </div>
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4 text-center">
          <p className="text-3xl font-bold text-red-400">{rejected}</p>
          <p className="text-gray-400 text-xs mt-1">Rejeitados</p>
        </div>
      </div>

      {/* Barra de progresso */}
      {total > 0 && (
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-lg p-4">
          <div className="flex justify-between text-xs text-gray-400 mb-2">
            <span>Progresso de Check-in</span>
            <span>{checkedIn}/{total} times ({Math.round((checkedIn / total) * 100)}%)</span>
          </div>
          <div className="w-full bg-[#1E3A5F] rounded-full h-2">
            <div
              className="bg-green-400 h-2 rounded-full transition-all"
              style={{ width: `${(checkedIn / total) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Tabela Client (validação Riot lazy via spectator-v5) */}
      <CheckinClient
        inscricoes={rows}
        tournamentId={id}
        tournamentStatus={tournament.status}
      />
    </div>
  );
}
