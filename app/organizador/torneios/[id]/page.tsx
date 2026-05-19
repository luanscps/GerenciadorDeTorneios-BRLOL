// app/organizador/torneios/[id]/page.tsx — Painel do Torneio (visão geral)
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Rascunho', OPEN: 'Inscrições Abertas',
  IN_PROGRESS: 'Em Andamento', FINISHED: 'Finalizado', CANCELLED: 'Cancelado',
}
const STATUS_COLOR: Record<string, string> = {
  DRAFT: 'bg-gray-700/50 text-gray-300 border-gray-600/40',
  OPEN: 'bg-green-900/30 text-green-400 border-green-600/40',
  IN_PROGRESS: 'bg-yellow-900/30 text-yellow-400 border-yellow-600/40',
  FINISHED: 'bg-blue-900/30 text-blue-400 border-blue-600/40',
  CANCELLED: 'bg-red-900/30 text-red-400 border-red-600/40',
}

export default async function TorneioPainelPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, slug, status, max_teams, start_date, end_date, description, min_members, max_members, prize_pool')
    .eq('id', id)
    .eq('organizer_id', user.id)
    .single()

  if (!torneio) redirect('/organizador')

  const { count: totalInscritos } = await supabase
    .from('inscricoes')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)

  const { count: pendentes } = await supabase
    .from('inscricoes')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)
    .eq('status', 'PENDING')

  const { count: aprovados } = await supabase
    .from('inscricoes')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)
    .eq('status', 'APPROVED')

  // Contador de disputas abertas para badge no card
  const { count: disputasAbertas } = await supabase
    .from('disputes')
    .select('id', { count: 'exact', head: true })
    .eq('tournament_id', id)
    .in('status', ['PENDING', 'REVIEWING'])

  const statusClass = STATUS_COLOR[torneio.status] ?? STATUS_COLOR.DRAFT

  const navCards = [
    { href: `/organizador/torneios/${id}/editar`,       emoji: '✏️',  label: 'Editar',        desc: 'Dados, regras e status' },
    { href: `/organizador/torneios/${id}/inscricoes`,   emoji: '📋',  label: 'Inscrições',     desc: `${pendentes ?? 0} pendente(s)` },
    { href: `/organizador/torneios/${id}/checkin`,      emoji: '✅',  label: 'Check-in',      desc: 'Confirmar presença' },
    { href: `/organizador/torneios/${id}/fases`,        emoji: '🏗️', label: 'Fases',         desc: 'Bracket e grupos' },
    { href: `/organizador/torneios/${id}/partidas`,     emoji: '⚔️',  label: 'Partidas',      desc: `${disputasAbertas ?? 0} disputa(s)` },
    { href: `/organizador/torneios/${id}/comunicados`,  emoji: '📣',  label: 'Comunicados',   desc: 'Avisos para os times' },
  ]

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-2">
        <Link href="/organizador" className="hover:text-[#C8A84B] transition-colors">Meus Torneios</Link>
        <span>/</span>
        <span className="text-gray-400">{torneio.name}</span>
      </nav>

      {/* Header */}
      <div className="card-lol space-y-3">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-black text-white leading-tight">{torneio.name}</h1>
            <p className="text-gray-500 text-sm mt-0.5">/{torneio.slug}</p>
          </div>
          <span className={`text-xs font-black uppercase px-3 py-1.5 rounded-full border ${statusClass}`}>
            {STATUS_LABEL[torneio.status] ?? torneio.status}
          </span>
        </div>

        {torneio.description && (
          <p className="text-gray-400 text-sm">{torneio.description}</p>
        )}

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-[#0A1628] rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{aprovados ?? 0}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Times aprovados</p>
          </div>
          <div className="bg-[#0A1628] rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-white">{torneio.max_teams}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Vagas totais</p>
          </div>
          <div className="bg-[#0A1628] rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${
              (pendentes ?? 0) > 0 ? 'text-yellow-400' : 'text-white'
            }`}>{pendentes ?? 0}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Pendentes</p>
          </div>
          <div className="bg-[#0A1628] rounded-xl p-3 text-center">
            <p className={`text-2xl font-black ${
              (disputasAbertas ?? 0) > 0 ? 'text-red-400' : 'text-white'
            }`}>{disputasAbertas ?? 0}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-0.5">Disputas abertas</p>
          </div>
        </div>

        {/* Datas */}
        {(torneio.start_date || torneio.end_date) && (
          <div className="flex gap-4 text-xs text-gray-400 pt-1">
            {torneio.start_date && (
              <span>📅 Início: <strong className="text-gray-300">{new Date(torneio.start_date).toLocaleDateString('pt-BR', { dateStyle: 'short' })}</strong></span>
            )}
            {torneio.end_date && (
              <span>🏁 Término: <strong className="text-gray-300">{new Date(torneio.end_date).toLocaleDateString('pt-BR', { dateStyle: 'short' })}</strong></span>
            )}
            {torneio.prize_pool && (
              <span>🏅 Prêmio: <strong className="text-gray-300">{torneio.prize_pool}</strong></span>
            )}
          </div>
        )}
      </div>

      {/* Cards de navegação */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {navCards.map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="card-lol flex flex-col items-center text-center gap-2 py-5 px-3 hover:border-[#C8A84B]/50 hover:bg-[#C8A84B]/5 transition-all group"
          >
            <span className="text-3xl">{card.emoji}</span>
            <span className="text-white text-sm font-bold group-hover:text-[#C8A84B] transition-colors">{card.label}</span>
            <span className="text-gray-500 text-[10px] leading-tight">{card.desc}</span>
          </Link>
        ))}
      </div>

      {/* Link para página pública */}
      <div className="text-center">
        <Link
          href={`/torneios/${torneio.slug ?? id}`}
          target="_blank"
          className="text-sm text-gray-500 hover:text-[#C8A84B] transition-colors"
        >
          Ver página pública do torneio →
        </Link>
      </div>
    </div>
  )
}
