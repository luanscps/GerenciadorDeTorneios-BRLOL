// app/torneios/[slug]/partidas/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

type TeamRef = { id: string; name: string; tag: string; logo_url: string | null } | null

type Partida = {
  id: string
  round: number
  match_number: number
  status: string
  score_a: number | null
  score_b: number | null
  scheduled_at: string | null
  finished_at: string | null
  best_of: number
  fase_id: string | null
  team_a: TeamRef
  team_b: TeamRef
  winner: { id: string; name: string; tag: string } | null
}

export default async function PartidasPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .single()

  if (!torneio) notFound()

  // Usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  const { data: raw } = await supabase
    .from('matches')
    .select(`
      id, round, match_number, status, score_a, score_b,
      scheduled_at, finished_at, best_of, fase_id,
      team_a:teams!team_a_id(id, name, tag, logo_url),
      team_b:teams!team_b_id(id, name, tag, logo_url),
      winner:teams!winner_id(id, name, tag)
    `)
    .eq('tournament_id', torneio.id)
    .order('round')
    .order('match_number')

  const partidas = (raw ?? []) as unknown as Partida[]

  const { data: fases } = await supabase
    .from('fases')
    .select('id, name, type, order, status')
    .eq('tournament_id', torneio.id)
    .order('order')

  // IDs dos times do usuário logado (para destacar suas partidas)
  let userTeamIds: string[] = []
  if (user) {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('profile_id', user.id)
      .eq('status', 'accepted')
    userTeamIds = (memberships ?? []).map(m => m.team_id)
  }

  const STATUS_LABEL: Record<string, string> = {
    SCHEDULED:   'Agendada',
    IN_PROGRESS: 'Ao Vivo 🔴',
    FINISHED:    'Finalizada',
    // fallbacks minúsculos (legado)
    pending:   'Agendada',
    ongoing:   'Ao Vivo 🔴',
    finished:  'Finalizada',
    cancelled: 'Cancelada',
  }
  const STATUS_COLOR: Record<string, string> = {
    SCHEDULED:   'text-gray-400 bg-gray-800/40 border-gray-700/40',
    IN_PROGRESS: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/40',
    FINISHED:    'text-green-400 bg-green-900/20 border-green-700/40',
    pending:     'text-gray-400 bg-gray-800/40 border-gray-700/40',
    ongoing:     'text-yellow-400 bg-yellow-900/20 border-yellow-700/40',
    finished:    'text-green-400 bg-green-900/20 border-green-700/40',
    cancelled:   'text-red-400 bg-red-900/20 border-red-700/40',
  }

  const porRound: Record<number, Partida[]> = {}
  partidas.forEach(p => {
    if (!porRound[p.round]) porRound[p.round] = []
    porRound[p.round].push(p)
  })

  const total       = partidas.length
  const finalizadas = partidas.filter(p => ['finished', 'FINISHED'].includes(p.status)).length
  const aoVivo      = partidas.filter(p => ['ongoing', 'IN_PROGRESS'].includes(p.status)).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-lol">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-gray-400 text-sm mb-1">
              <Link href={`/torneios/${slug}`} className="hover:text-white transition-colors">← {torneio.name}</Link>
            </p>
            <h1 className="text-2xl font-bold text-white">⚔️ Partidas</h1>
          </div>
          <div className="flex gap-6 text-center">
            <div><p className="text-xl font-bold text-white">{total}</p><p className="text-gray-400 text-xs">Total</p></div>
            <div><p className="text-xl font-bold text-green-400">{finalizadas}</p><p className="text-gray-400 text-xs">Finalizadas</p></div>
            {aoVivo > 0 && <div><p className="text-xl font-bold text-yellow-400">{aoVivo}</p><p className="text-gray-400 text-xs">Ao Vivo</p></div>}
          </div>
        </div>

        {(fases ?? []).length > 1 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-[#1E3A5F] flex-wrap">
            {fases!.map(f => (
              <span key={f.id} className={`text-xs px-3 py-1 rounded-full border font-medium ${
                f.status === 'active' ? 'border-[#C8A84B] text-[#C8A84B] bg-[#C8A84B]/10' : 'border-[#1E3A5F] text-gray-400'
              }`}>{f.name}</span>
            ))}
          </div>
        )}
      </div>

      {total === 0 && (
        <div className="card-lol text-center py-16">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="text-white font-bold">Partidas ainda não foram geradas</p>
          <p className="text-gray-400 text-sm mt-1">Aguarde o organizador configurar as fases e gerar o chaveamento.</p>
        </div>
      )}

      {Object.entries(porRound).map(([round, matches]) => (
        <section key={round}>
          <h2 className="text-gray-400 font-semibold text-sm uppercase tracking-wider mb-3">Round {round}</h2>
          <div className="space-y-3">
            {matches.map((p) => {
              const fase = (fases ?? []).find(f => f.id === p.fase_id)
              const isMyMatch = userTeamIds.includes(p.team_a?.id ?? '') || userTeamIds.includes(p.team_b?.id ?? '')
              const isLive    = ['ongoing', 'IN_PROGRESS'].includes(p.status)
              const isDone    = ['finished', 'FINISHED'].includes(p.status)

              return (
                <div
                  key={p.id}
                  className={`card-lol ${
                    isLive    ? 'border border-yellow-700/40' :
                    isMyMatch ? 'border border-[#C8A84B]/30' : ''
                  }`}
                >
                  {/* Badge "Sua Partida" */}
                  {isMyMatch && (
                    <div className="mb-2">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#C8A84B]/10 border border-[#C8A84B]/40 text-[#C8A84B]">
                        ⭐ Sua Partida
                      </span>
                    </div>
                  )}

                  <div className="flex items-center gap-4 flex-wrap">
                    {/* Time A */}
                    <div className="flex items-center gap-2 flex-1 justify-end min-w-0">
                      {p.team_a?.logo_url && (
                        <img src={p.team_a.logo_url} alt={p.team_a.name ?? ''} className="w-7 h-7 rounded-full object-cover" />
                      )}
                      <p className={`font-bold truncate ${ p.winner?.id === p.team_a?.id ? 'text-[#C8A84B]' : 'text-white' }`}>
                        [{p.team_a?.tag}] {p.team_a?.name}
                        {p.winner?.id === p.team_a?.id && ' 🏆'}
                      </p>
                    </div>

                    {/* Placar central */}
                    <div className="text-center flex-shrink-0 w-20">
                      {isDone ? (
                        <p className="text-white font-bold text-xl">{p.score_a} × {p.score_b}</p>
                      ) : (
                        <div>
                          <p className="text-gray-500 text-sm font-bold">VS</p>
                          {p.best_of > 1 && <p className="text-gray-600 text-xs">MD{p.best_of}</p>}
                        </div>
                      )}
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border mt-1 inline-block ${STATUS_COLOR[p.status] ?? STATUS_COLOR.pending}`}>
                        {STATUS_LABEL[p.status] ?? p.status}
                      </span>
                    </div>

                    {/* Time B */}
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <p className={`font-bold truncate ${ p.winner?.id === p.team_b?.id ? 'text-[#C8A84B]' : 'text-white' }`}>
                        [{p.team_b?.tag}] {p.team_b?.name}
                        {p.winner?.id === p.team_b?.id && ' 🏆'}
                      </p>
                      {p.team_b?.logo_url && (
                        <img src={p.team_b.logo_url} alt={p.team_b.name ?? ''} className="w-7 h-7 rounded-full object-cover" />
                      )}
                    </div>

                    {/* Info + botão lobby */}
                    <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                      <div className="text-right text-xs text-gray-500">
                        {fase && <p>{fase.name}</p>}
                        {p.scheduled_at && !isDone && (
                          <p>{new Date(p.scheduled_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        )}
                        {p.finished_at && (
                          <p>{new Date(p.finished_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}</p>
                        )}
                      </div>
                      {/* Botão Lobby — sempre visível */}
                      <Link
                        href={`/torneios/${slug}/partidas/${p.id}`}
                        className={`text-[11px] font-bold px-3 py-1 rounded border transition-colors whitespace-nowrap ${
                          isLive
                            ? 'border-yellow-600/60 text-yellow-400 bg-yellow-900/20 hover:bg-yellow-900/40'
                            : isDone
                              ? 'border-[#1E3A5F] text-gray-400 hover:text-white hover:border-gray-500'
                              : 'border-[#C8A84B]/50 text-[#C8A84B] bg-[#C8A84B]/5 hover:bg-[#C8A84B]/15'
                        }`}
                      >
                        {isLive ? '🔴 Ver Ao Vivo' : isDone ? 'Ver Resultado' : 'Acessar Lobby →'}
                      </Link>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
