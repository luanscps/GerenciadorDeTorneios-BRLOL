'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface MatchTeam {
  name: string
  tag: string
  logo_url?: string
}

export interface BracketMatch {
  id: string
  round: number
  match_order: number
  status: string
  score_a: number
  score_b: number
  format?: string
  scheduled_at?: string
  team_a?: MatchTeam
  team_b?: MatchTeam
  winner_team_id?: string
  team_a_id?: string
  team_b_id?: string
}

function MatchCard({ match: m }: { match: BracketMatch }) {
  const fin  = m.status === 'FINISHED'
  const live = m.status === 'IN_PROGRESS'

  return (
    <div
      className={`bg-[#0A1428] border rounded min-w-[200px] overflow-hidden transition-all ${
        live ? 'border-[#C89B3C] shadow-lg shadow-[#C89B3C]/20' : 'border-[#1E3A5F]'
      }`}
    >
      {live && (
        <div className="bg-[#C89B3C]/10 px-3 py-0.5 flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="text-[#C89B3C] text-xs font-bold">AO VIVO</span>
        </div>
      )}
      {[
        { team: m.team_a, score: m.score_a, isWin: fin && m.winner_team_id === m.team_a_id },
        { team: m.team_b, score: m.score_b, isWin: fin && m.winner_team_id === m.team_b_id },
      ].map(({ team, score, isWin }, i) => (
        <div
          key={i}
          className={`flex items-center justify-between px-3 py-2 text-sm ${
            i === 0 ? 'border-b border-[#1E3A5F]' : ''
          } ${isWin ? 'bg-[#C89B3C]/10' : ''}`}
        >
          <span
            className={`truncate max-w-[140px] ${
              team
                ? isWin
                  ? 'text-[#C89B3C] font-bold'
                  : fin
                  ? 'text-gray-400'
                  : 'text-white'
                : 'text-gray-600'
            }`}
          >
            {team ? (
              <>
                <span className="text-gray-500 text-xs mr-1">[{team.tag}]</span>
                {team.name}
              </>
            ) : (
              <span className="italic text-gray-600">A definir</span>
            )}
          </span>
          {fin && (
            <span
              className={`font-bold ml-2 shrink-0 text-base ${
                isWin ? 'text-[#C89B3C]' : 'text-gray-500'
              }`}
            >
              {score ?? 0}
            </span>
          )}
          {live && (
            <span className="font-bold ml-2 shrink-0 text-base text-[#C89B3C]">
              {score ?? 0}
            </span>
          )}
        </div>
      ))}
      {m.scheduled_at && m.status === 'SCHEDULED' && (
        <div className="px-3 py-1 text-xs text-gray-500 border-t border-[#1E3A5F]">
          {new Date(m.scheduled_at).toLocaleString('pt-BR', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })}
        </div>
      )}
    </div>
  )
}

function roundName(r: number, total: number): string {
  if (r === total)     return 'Final'
  if (r === total - 1) return 'Semifinal'
  if (r === total - 2) return 'Quartas de Final'
  if (r === total - 3) return 'Oitavas de Final'
  return 'Rodada ' + r
}

interface BracketViewProps {
  initialMatches: BracketMatch[]
  tournamentId: string
  readonly?: boolean
}

export function BracketView({ initialMatches, tournamentId, readonly = false }: BracketViewProps) {
  const [matches, setMatches] = useState<BracketMatch[]>(initialMatches)
  const router  = useRouter()
  const supabase = createClient();

  // Estabiliza referencia do callback para evitar re-subscribe desnecessario
  const handlePayload = useCallback((payload: any) => {
    if (payload.eventType === 'UPDATE') {
      setMatches(prev =>
        prev.map(m =>
          m.id === payload.new.id
            ? {
                ...m,
                status:         payload.new.status,
                score_a:        payload.new.score_a ?? m.score_a,
                score_b:        payload.new.score_b ?? m.score_b,
                winner_team_id: payload.new.winner_team_id,
              }
            : m
        )
      )
    } else if (payload.eventType === 'INSERT') {
      // Novas partidas inseridas: atualiza dados server-side sem reload completo
      router.refresh()
    }
  }, [router])

  useEffect(() => {
    if (readonly) return

    const channel = supabase
      .channel(`bracket-${tournamentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`,
        },
        handlePayload
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [tournamentId, readonly, handlePayload])

  if (matches.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-gray-500">
        <svg className="w-16 h-16 mb-4 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1}
            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
        </svg>
        <p className="text-lg">Bracket ainda não gerado</p>
        <p className="text-sm mt-1">Aguarde o início do torneio</p>
      </div>
    )
  }

  const maxRound = Math.max(...matches.map(m => m.round), 1)
  const rounds = Array.from({ length: maxRound }, (_, i) =>
    matches.filter(m => m.round === i + 1).sort((a, b) => a.match_order - b.match_order)
  )

  return (
    <div className="overflow-x-auto pb-4">
      {!readonly && (
        <div className="flex items-center gap-2 mb-4 text-xs text-gray-500">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          Atualizando ao vivo
        </div>
      )}
      <div className="flex gap-8 min-w-max">
        {rounds.map((roundMatches, i) => (
          <div key={i} className="flex flex-col">
            <p className="text-[#C89B3C] text-xs font-bold tracking-wider text-center mb-4 uppercase">
              {roundName(i + 1, maxRound)}
            </p>
            <div
              className="flex flex-col justify-around"
              style={{
                gap: `${Math.pow(2, i) * 16}px`,
                paddingTop: `${Math.pow(2, i) * 8}px`,
              }}
            >
              {roundMatches.map(match => (
                <MatchCard key={match.id} match={match} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
