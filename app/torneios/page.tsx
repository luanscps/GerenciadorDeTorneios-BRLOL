import { createClient } from '@/lib/supabase/server';
import { TournamentCard } from '@/components/tournament/TournamentCard';

const STATUS_LABELS: Record<string, string> = {
  DRAFT:      'Rascunho',
  OPEN:       'Inscrições Abertas',
  CHECKIN:    'Check-in',
  ONGOING:    'Em Andamento',
  FINISHED:   'Encerrado',
  CANCELLED:  'Cancelado',
};

const BRACKET_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Eliminação Simples',
  DOUBLE_ELIMINATION: 'Dupla Eliminação',
  ROUND_ROBIN:        'Round Robin',
  SWISS:              'Suíço',
};

export default async function TorneiosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; bracket?: string }>;
}) {
  const { status, bracket } = await searchParams;
  const supabase = await createClient();

  // Usuário logado para saber se mostra botão de criar
  const { data: { user } } = await supabase.auth.getUser();

  // Conta quantos torneios não-cancelados o usuário já possui
  let userTournamentCount = 0;
  if (user) {
    const { count } = await supabase
      .from('tournaments')
      .select('id', { count: 'exact', head: true })
      .eq('organizer_id', user.id)
      .neq('status', 'CANCELLED');
    userTournamentCount = count ?? 0;
  }

  const canCreate = !!user && userTournamentCount < 2;

  let query = supabase
    .from('tournaments')
    .select('*')
    .order('starts_at', { ascending: false });

  if (status)  query = query.eq('status', status);
  if (bracket) query = query.eq('bracket_type', bracket);

  const { data: tournaments } = await query;

  const statuses = ['OPEN', 'CHECKIN', 'ONGOING', 'FINISHED'];
  const brackets = ['SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS'];

  const btnBase     = 'px-3 py-1 rounded text-sm border transition-colors';
  const btnActive   = 'border-[#C8A84B] text-[#C8A84B] bg-[#C8A84B]/10';
  const btnInactive = 'border-[#1E3A5F] text-gray-400 hover:border-[#C8A84B]/50';

  return (
    <div className="space-y-8">

      {/* Header com título e botão criar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">🏆 Torneios</h1>
          <p className="text-gray-400 text-sm mt-0.5">Encontre e participe de torneios de LoL</p>
        </div>

        {/* Botão criar — visível apenas para logados com menos de 2 torneios */}
        {user ? (
          canCreate ? (
            <a
              href="/organizador/torneios/novo"
              className="btn-gold px-5 py-2.5 text-sm font-semibold whitespace-nowrap"
            >
              + Criar Torneio
            </a>
          ) : (
            <div className="text-right">
              <span className="btn-outline-gold px-5 py-2.5 text-sm opacity-50 cursor-not-allowed">
                + Criar Torneio
              </span>
              <p className="text-yellow-500/70 text-xs mt-1">
                Limite de 2 torneios por conta atingido
              </p>
            </div>
          )
        ) : (
          <a
            href="/login"
            className="btn-outline-gold px-5 py-2.5 text-sm whitespace-nowrap"
          >
            Entrar para criar
          </a>
        )}
      </div>

      {/* Filtros */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs text-gray-500 mr-1">Status:</span>
          <a href="/torneios" className={`${btnBase} ${!status && !bracket ? btnActive : btnInactive}`}>Todos</a>
          {statuses.map((s) => (
            <a key={s}
              href={`/torneios?status=${s}${bracket ? `&bracket=${bracket}` : ''}`}
              className={`${btnBase} ${status === s ? btnActive : btnInactive}`}>
              {STATUS_LABELS[s]}
            </a>
          ))}
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <span className="text-xs text-gray-500 mr-1">Formato:</span>
          <a href={status ? `/torneios?status=${status}` : '/torneios'}
            className={`${btnBase} ${!bracket ? btnActive : btnInactive}`}>Todos</a>
          {brackets.map((b) => (
            <a key={b}
              href={`/torneios?bracket=${b}${status ? `&status=${status}` : ''}`}
              className={`${btnBase} ${bracket === b ? btnActive : btnInactive}`}>
              {BRACKET_LABELS[b]}
            </a>
          ))}
        </div>
      </div>

      {/* Grid de torneios */}
      {tournaments && tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      ) : (
        <div className="card-lol text-center py-20 space-y-4">
          <p className="text-4xl">🏆</p>
          <p className="text-gray-300 text-lg font-semibold">Nenhum torneio encontrado</p>
          {(status || bracket) ? (
            <a href="/torneios" className="text-[#C8A84B] text-sm hover:underline inline-block">
              Limpar filtros
            </a>
          ) : canCreate ? (
            <a href="/organizador/torneios/novo" className="btn-gold px-6 py-2.5 text-sm inline-block">
              Seja o primeiro! Criar torneio
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
