// app/organizador/page.tsx — Dashboard do Organizador
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho', OPEN: 'Inscrições Abertas',
  IN_PROGRESS: 'Em Andamento', FINISHED: 'Finalizado', CANCELLED: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'text-gray-400', OPEN: 'text-green-400',
  IN_PROGRESS: 'text-yellow-400', FINISHED: 'text-blue-400', CANCELLED: 'text-red-400',
}

export default async function OrganizadorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Meus torneios (organizer_id = eu, ou created_by = eu)
  const { data: torneios } = await supabase
    .from('tournaments')
    .select('id, name, slug, status, max_teams, starts_at, min_members, max_members')
    .or(`organizer_id.eq.${user.id},created_by.eq.${user.id}`)
    .order('created_at', { ascending: false })

  // Inscrições pendentes nos meus torneios
  const myIds = (torneios ?? []).map((t: any) => t.id)
  const { data: pendentes } = myIds.length > 0
    ? await supabase
        .from('inscricoes')
        .select('id, tournament_id, status, teams:team_id(name, tag)')
        .in('tournament_id', myIds)
        .eq('status', 'PENDING')
    : { data: [] }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">🏆 Meus Torneios</h1>
        <Link href="/organizador/torneios/novo" className="btn-gold px-5 py-2 text-sm">
          + Criar Torneio
        </Link>
      </div>

      {/* Alertas de inscrições pendentes */}
      {pendentes && pendentes.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-5 py-4">
          <p className="text-yellow-300 font-semibold text-sm mb-2">⏳ {pendentes.length} inscrição(ens) aguardando aprovação</p>
          <div className="space-y-1">
            {(pendentes as any[]).map((p: any) => {
              const t = torneios?.find((x: any) => x.id === p.tournament_id)
              return (
                <div key={p.id} className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">[{p.teams?.tag}] {p.teams?.name} → {t?.name}</span>
                  <Link
                    href={`/organizador/torneios/${p.tournament_id}/inscricoes`}
                    className="text-yellow-400 hover:underline text-xs"
                  >Revisar →</Link>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de torneios */}
      {!torneios || torneios.length === 0 ? (
        <div className="card-lol text-center py-16 space-y-4">
          <p className="text-4xl">🏆</p>
          <h2 className="text-white font-bold text-lg">Nenhum torneio criado ainda</h2>
          <p className="text-gray-400 text-sm">Crie seu primeiro torneio e comece a competir.</p>
          <Link href="/organizador/torneios/novo" className="btn-gold inline-block px-6 py-2">
            Criar Torneio
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {(torneios as any[]).map((t: any) => (
            <div key={t.id} className="card-lol space-y-3">
              <div className="flex items-start justify-between">
                <h2 className="text-white font-bold text-base leading-tight">{t.name}</h2>
                <span className={`text-xs font-semibold ${STATUS_COLOR[t.status] ?? 'text-gray-400'}`}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
              </div>
              {t.starts_at && (
                <p className="text-gray-400 text-xs">
                  Início: {new Date(t.starts_at).toLocaleDateString('pt-BR')}
                </p>
              )}
              <p className="text-gray-500 text-xs">
                Máx {t.max_teams} times · {t.min_members}–{t.max_members} membros/time
              </p>
              <div className="flex gap-2 pt-1">
                <Link href={`/organizador/torneios/${t.id}`} className="btn-outline-gold text-xs py-1.5 flex-1 text-center">
                  Editar
                </Link>
                <Link href={`/organizador/torneios/${t.id}/inscricoes`} className="btn-outline-gold text-xs py-1.5 flex-1 text-center">
                  Inscrições
                </Link>
                <Link href={`/torneios/${t.slug ?? t.id}`} className="text-xs text-gray-500 hover:text-white transition-colors py-1.5 px-2">
                  Ver →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
