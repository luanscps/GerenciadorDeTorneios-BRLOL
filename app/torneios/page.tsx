import { createClient } from '@/lib/supabase/server';
import { TournamentCard } from '@/components/tournament/TournamentCard';

const STATUS_LABELS: Record<string, string> = {
  draft:     'Rascunho',
  open:      'Inscricoes Abertas',
  checkin:   'Check-in',
  ongoing:   'Em Andamento',
  finished:  'Encerrado',
  cancelled: 'Cancelado',
};

const BRACKET_LABELS: Record<string, string> = {
  SINGLE_ELIMINATION: 'Eliminacao Simples',
  ROUND_ROBIN:        'Round Robin',
  SWISS:              'Swiss',
};

export default async function TorneiosPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; bracket?: string }>;
}) {
  const { status, bracket } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from('tournaments')
    .select('*')
    .order('start_date', { ascending: false }); // ← corrigido: era starts_at

  if (status)  query = query.eq('status', status);
  if (bracket) query = query.eq('bracket_type', bracket);

  const { data: tournaments } = await query;

  const statuses = ['open', 'checkin', 'ongoing', 'finished'];
  const brackets = ['SINGLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS'];

  const btnBase     = 'px-3 py-1 rounded text-sm border transition-colors';
  const btnActive   = 'border-[#C8A84B] text-[#C8A84B] bg-[#C8A84B]/10';
  const btnInactive = 'border-[#1E3A5F] text-gray-400 hover:border-[#C8A84B]/50';

  return (
    <div className="space-y-8">
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

      {tournaments && tournaments.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tournaments.map((t) => <TournamentCard key={t.id} tournament={t} />)}
        </div>
      ) : (
        <div className="card-lol text-center py-20">
          <p className="text-gray-400 text-lg">Nenhum torneio encontrado.</p>
          {(status || bracket) && (
            <a href="/torneios" className="text-[#C8A84B] text-sm hover:underline mt-2 inline-block">
              Limpar filtros
            </a>
          )}
        </div>
      )}
    </div>
  );
}
