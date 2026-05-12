// app/torneios/[slug]/partidas/page.tsx
import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'

// ─── Tipos ───────────────────────────────────────────────────────────────────

type TeamRef = { id: string; name: string; tag: string; logo_url: string | null } | null

type Partida = {
  id: string
  round: number
  match_order: number      // fix: era match_number (coluna inexistente)
  match_number: number | null
  status: string
  score_a: number | null
  score_b: number | null
  scheduled_at: string | null
  finished_at: string | null
  best_of: number
  stage_id: string | null  // fix: era fase_id (coluna inexistente)
  team_a: TeamRef
  team_b: TeamRef
  winner: { id: string; name: string; tag: string } | null
}

type Stage = {
  id: string
  name: string
  stage_order: number
  bracket_type: string | null
  best_of: number
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default async function PartidasPublicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  // Torneio
  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, slug, status')
    .eq('slug', slug)
    .single()

  if (!torneio) notFound()

  // Usuário logado
  const { data: { user } } = await supabase.auth.getUser()

  // ── Query principal de partidas ──────────────────────────────────────────
  // fix: colunas corretas — stage_id (não fase_id), match_order (não match_number)
  const { data: raw } = await supabase
    .from('matches')
    .select(`
      id, round, match_order, match_number, status, score_a, score_b,
      scheduled_at, finished_at, best_of, stage_id,
      team_a:teams!team_a_id(id, name, tag, logo_url),
      team_b:teams!team_b_id(id, name, tag, logo_url),
      winner:teams!winner_id(id, name, tag)
    `)
    .eq('tournament_id', torneio.id)
    .order('round')
    .order('match_order')

  const partidas = (raw ?? []) as unknown as Partida[]

  // ── Stages (fix: era 'fases' — tabela inexistente; real: 'tournament_stages') ──
  const { data: stagesRaw } = await supabase
    .from('tournament_stages')
    .select('id, name, stage_order, bracket_type, best_of')
    .eq('tournament_id', torneio.id)
    .order('stage_order')

  const stages: Stage[] = stagesRaw ?? []

  // ── Times do usuário logado (para destacar suas partidas) ────────────────
  let userTeamIds: string[] = []
  if (user) {
    const { data: memberships } = await supabase
      .from('team_members')
      .select('team_id')
      .eq('profile_id', user.id)
      .eq('status', 'accepted')
    userTeamIds = (memberships ?? []).map(m => m.team_id)
  }

  // ── Agrupamento por stage → round ────────────────────────────────────────
  // Partidas sem stage_id ficam em grupo separado "Sem fase"
  const SEM_STAGE = '__sem_stage__'

  type GrupoStage = {
    stage: Stage | null
    porRound: Record<number, Partida[]>
  }

  const grupos: Record<string, GrupoStage> = {}

  // Garante que stages com matches apareçam em ordem
  stages.forEach(s => {
    grupos[s.id] = { stage: s, porRound: {} }
  })

  partidas.forEach(p => {
    const key = p.stage_id ?? SEM_STAGE
    if (!grupos[key]) grupos[key] = { stage: null, porRound: {} }
    const round = p.round ?? 1
    if (!grupos[key].porRound[round]) grupos[key].porRound[round] = []
    grupos[key].porRound[round].push(p)
  })

  // ── Estatísticas ─────────────────────────────────────────────────────────
  const total       = partidas.length
  const finalizadas = partidas.filter(p => ['finished', 'FINISHED'].includes(p.status)).length
  const aoVivo      = partidas.filter(p => ['ongoing', 'IN_PROGRESS'].includes(p.status)).length
  const agendadas   = partidas.filter(p => ['pending', 'SCHEDULED'].includes(p.status)).length

  // ── Labels e cores de status ─────────────────────────────────────────────
  const STATUS_LABEL: Record<string, string> = {
    SCHEDULED:   'Agendada',
    IN_PROGRESS: 'Ao Vivo 🔴',
    FINISHED:    'Finalizada',
    pending:     'Agendada',
    ongoing:     'Ao Vivo 🔴',
    finished:    'Finalizada',
    cancelled:   'Cancelada',
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

  const BRACKET_LABEL: Record<string, string> = {
    SINGLE_ELIMINATION: 'Eliminação Simples',
    DOUBLE_ELIMINATION: 'Eliminação Dupla',
    ROUND_ROBIN:        'Round Robin',
    SWISS:              'Sistema Suíço',
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="card-lol">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-gray-400 text-sm mb-1">
              <Link href={`/torneios/${slug}`} className="hover:text-white transition-colors">
                ← {torneio.name}
              </Link>
            </p>
            <h1 className="text-2xl font-bold text-white">⚔️ Partidas</h1>
          </div>

          {/* Contadores */}
          <div className="flex gap-5 text-center">
            <div>
              <p className="text-xl font-bold text-white">{total}</p>
              <p className="text-gray-400 text-xs">Total</p>
            </div>
            <div>
              <p className="text-xl font-bold text-green-400">{finalizadas}</p>
              <p className="text-gray-400 text-xs">Finalizadas</p>
            </div>
            {agendadas > 0 && (
              <div>
                <p className="text-xl font-bold text-gray-400">{agendadas}</p>
                <p className="text-gray-400 text-xs">Agendadas</p>
              </div>
            )}
            {aoVivo > 0 && (
              <div>
                <p className="text-xl font-bold text-yellow-400">{aoVivo}</p>
                <p className="text-gray-400 text-xs">Ao Vivo</p>
              </div>
            )}
          </div>
        </div>

        {/* Tabs de stages (mostra só se tiver mais de 1) */}
        {stages.length > 1 && (
          <div className="flex gap-2 mt-4 pt-4 border-t border-[#1E3A5F] flex-wrap">
            {stages.map(s => (
              <span
                key={s.id}
                className="text-xs px-3 py-1 rounded-full border font-medium border-[#1E3A5F] text-gray-400"
              >
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* ── Empty state ────────────────────────────────────────────────── */}
      {total === 0 && (
        <div className="card-lol text-center py-16">
          <p className="text-4xl mb-3">⚔️</p>
          <p className="text-white font-bold">Partidas ainda não foram geradas</p>
          <p className="text-gray-400 text-sm mt-1">
            Aguarde o organizador configurar as fases e gerar o chaveamento.
          </p>
        </div>
      )}

      {/* ── Grupos por Stage → Round ────────────────────────────────────── */}
      {Object.entries(grupos).map(([stageKey, grupo]) => {
        const roundEntries = Object.entries(grupo.porRound)
        if (roundEntries.length === 0) return null

        return (
          <div key={stageKey} className="space-y-4">

            {/* Cabeçalho do Stage */}
            {grupo.stage && (
              <div className="flex items-center gap-3">
                <h2 className="text-white font-bold text-base">{grupo.stage.name}</h2>
                {grupo.stage.bracket_type && (
                  <span className="text-[10px] text-gray-500 border border-[#1E3A5F] px-2 py-0.5 rounded-full">
                    {BRACKET_LABEL[grupo.stage.bracket_type] ?? grupo.stage.bracket_type}
                  </span>
                )}
                {grupo.stage.best_of > 1 && (
                  <span className="text-[10px] text-[#C8A84B] border border-[#C8A84B]/30 px-2 py-0.5 rounded-full">
                    MD{grupo.stage.best_of}
                  </span>
                )}
              </div>
            )}

            {/* Rounds dentro do stage */}
            {roundEntries
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([round, matches]) => (
                <section key={round}>
                  <h3 className="text-gray-500 font-semibold text-xs uppercase tracking-wider mb-2 ml-1">
                    Round {round}
                  </h3>

                  <div className="space-y-3">
                    {matches
                      .sort((a, b) => (a.match_order ?? 0) - (b.match_order ?? 0))
                      .map((p) => {
                        const isMyMatch = userTeamIds.includes(p.team_a?.id ?? '') || userTeamIds.includes(p.team_b?.id ?? '')
                        const isLive    = ['ongoing', 'IN_PROGRESS'].includes(p.status)
                        const isDone    = ['finished', 'FINISHED'].includes(p.status)

                        return (
                          <div
                            key={p.id}
                            className={`card-lol transition-colors ${
                              isLive    ? 'border border-yellow-700/40' :
                              isMyMatch ? 'border border-[#C8A84B]/30'  : ''
                            }`}
                          >
                            {/* Badge Sua Partida */}
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
                                  <img
                                    src={p.team_a.logo_url}
                                    alt={p.team_a.name ?? ''}
                                    className="w-7 h-7 rounded-full object-cover"
                                  />
                                )}
                                <p className={`font-bold truncate ${
                                  p.winner?.id === p.team_a?.id ? 'text-[#C8A84B]' : 'text-white'
                                }`}>
                                  {p.team_a?.tag ? `[${p.team_a.tag}] ` : ''}{p.team_a?.name ?? 'TBD'}
                                  {p.winner?.id === p.team_a?.id && ' 🏆'}
                                </p>
                              </div>

                              {/* Placar central */}
                              <div className="text-center flex-shrink-0 w-24">
                                {isDone ? (
                                  <p className="text-white font-bold text-xl">
                                    {p.score_a ?? 0} × {p.score_b ?? 0}
                                  </p>
                                ) : (
                                  <div>
                                    <p className="text-gray-500 text-sm font-bold">VS</p>
                                    {p.best_of > 1 && (
                                      <p className="text-gray-600 text-xs">MD{p.best_of}</p>
                                    )}
                                  </div>
                                )}
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border mt-1 inline-block ${
                                  STATUS_COLOR[p.status] ?? STATUS_COLOR.pending
                                }`}>
                                  {STATUS_LABEL[p.status] ?? p.status}
                                </span>
                              </div>

                              {/* Time B */}
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <p className={`font-bold truncate ${
                                  p.winner?.id === p.team_b?.id ? 'text-[#C8A84B]' : 'text-white'
                                }`}>
                                  {p.team_b?.tag ? `[${p.team_b.tag}] ` : ''}{p.team_b?.name ?? 'TBD'}
                                  {p.winner?.id === p.team_b?.id && ' 🏆'}
                                </p>
                                {p.team_b?.logo_url && (
                                  <img
                                    src={p.team_b.logo_url}
                                    alt={p.team_b.name ?? ''}
                                    className="w-7 h-7 rounded-full object-cover"
                                  />
                                )}
                              </div>

                              {/* Datas + botão lobby */}
                              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                                <div className="text-right text-xs text-gray-500">
                                  {p.scheduled_at && !isDone && (
                                    <p>{new Date(p.scheduled_at).toLocaleString('pt-BR', {
                                      dateStyle: 'short', timeStyle: 'short'
                                    })}</p>
                                  )}
                                  {p.finished_at && (
                                    <p>{new Date(p.finished_at).toLocaleString('pt-BR', {
                                      dateStyle: 'short', timeStyle: 'short'
                                    })}</p>
                                  )}
                                </div>

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
              ))
            }
          </div>
        )
      })}
    </div>
  )
}
