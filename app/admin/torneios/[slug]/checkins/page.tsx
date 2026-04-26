import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DesfazerCheckinButton } from '@/components/admin/DesfazerCheckinButton';

export default async function AdminCheckinPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const supabase = await createClient();
  const { slug } = await params;

  // Verifica admin
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
  if (!profile?.is_admin) redirect('/dashboard?error=acesso_negado');

  // Busca torneio pelo ID (slug aqui é o UUID do torneio, conforme padrão do projeto)
  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id, name, status')
    .eq('id', slug)
    .single();

  if (!tournament) redirect('/admin/torneios');

  // Busca inscrições com check-in
  const { data: inscricoes } = await supabase
    .from('inscricoes')
    .select(`
      id, status, checked_in, checked_in_at,
      teams ( id, name, tag ),
      profiles:checked_in_by ( full_name, email )
    `)
    .eq('tournament_id', tournament.id)
    .order('checked_in', { ascending: false })
    .order('checked_in_at', { ascending: true });

  const total     = inscricoes?.length ?? 0;
  const checkedIn = inscricoes?.filter((i: any) => i.checked_in).length ?? 0;
  const pending   = inscricoes?.filter((i: any) => !i.checked_in && i.status === 'APPROVED').length ?? 0;

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/torneios/${slug}`} className="text-gray-400 hover:text-white text-sm">← Voltar</Link>
        <div>
          <h1 className="text-2xl font-bold text-white">📋 Check-ins</h1>
          <p className="text-gray-400 text-sm">{tournament.name}</p>
        </div>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-lol text-center">
          <p className="text-3xl font-bold text-white">{total}</p>
          <p className="text-gray-400 text-xs mt-1">Total Inscritos</p>
        </div>
        <div className="card-lol text-center">
          <p className="text-3xl font-bold text-green-400">{checkedIn}</p>
          <p className="text-gray-400 text-xs mt-1">Check-in Feito</p>
        </div>
        <div className="card-lol text-center">
          <p className="text-3xl font-bold text-yellow-400">{pending}</p>
          <p className="text-gray-400 text-xs mt-1">Aguardando</p>
        </div>
      </div>

      {/* Tabela */}
      <div className="card-lol overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 text-xs uppercase border-b border-[#1E3A5F]">
              <th className="text-left py-2 pr-4">Time</th>
              <th className="text-left py-2 pr-4">Status Insc.</th>
              <th className="text-left py-2 pr-4">Check-in</th>
              <th className="text-left py-2 pr-4">Quando</th>
              <th className="text-left py-2">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#1E3A5F]">
            {(inscricoes ?? []).map((insc: any) => {
              const team = insc.teams as any;
              return (
                <tr key={insc.id} className="hover:bg-[#0D1E35]">
                  <td className="py-3 pr-4">
                    <p className="text-white font-medium">
                      <span className="text-[#C8A84B]">[{team?.tag}]</span> {team?.name}
                    </p>
                  </td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${
                      insc.status === 'APPROVED' ? 'bg-green-400/10 text-green-400 border border-green-400/30' :
                      insc.status === 'PENDING'  ? 'bg-yellow-400/10 text-yellow-400 border border-yellow-400/30' :
                      'bg-red-400/10 text-red-400 border border-red-400/30'
                    }`}>
                      {insc.status}
                    </span>
                  </td>
                  <td className="py-3 pr-4">
                    {insc.checked_in
                      ? <span className="text-green-400 font-semibold">✅ Confirmado</span>
                      : <span className="text-gray-500">— Pendente</span>
                    }
                  </td>
                  <td className="py-3 pr-4 text-gray-400 text-xs">
                    {insc.checked_in_at
                      ? new Date(insc.checked_in_at).toLocaleString('pt-BR')
                      : '—'
                    }
                  </td>
                  <td className="py-3">
                    {insc.checked_in && (
                      <DesfazerCheckinButton inscricaoId={insc.id} />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {(!inscricoes || inscricoes.length === 0) && (
          <p className="text-gray-500 text-sm text-center py-8">Nenhuma inscrição neste torneio.</p>
        )}
      </div>
    </div>
  );
}
