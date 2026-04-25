'use client'
import { useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Pendente', APPROVED: 'Aprovado', REJECTED: 'Rejeitado'
}
const STATUS_COLOR: Record<string, string> = {
  PENDING: 'text-yellow-400 bg-yellow-900/20 border-yellow-700/40',
  APPROVED: 'text-green-400 bg-green-900/20 border-green-700/40',
  REJECTED: 'text-red-400 bg-red-900/20 border-red-700/40',
}

export default function InscricoesClient({ torneio, inscricoes, minMembers }: {
  torneio: any
  inscricoes: any[]
  minMembers: number
}) {
  const supabase = useMemo(() => createClient(), [])
  const [items, setItems] = useState(inscricoes)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [notes, setNotes] = useState<Record<string, string>>({})

  async function updateStatus(inscId: string, newStatus: 'APPROVED' | 'REJECTED') {
    setLoadingId(inscId)
    const { error } = await supabase
      .from('inscricoes')
      .update({ status: newStatus, notes: notes[inscId] ?? null, reviewed_at: new Date().toISOString() })
      .eq('id', inscId)
    if (!error) {
      setItems(prev => prev.map(i => i.id === inscId ? { ...i, status: newStatus } : i))
    }
    setLoadingId(null)
  }

  const pendentes  = items.filter(i => i.status === 'PENDING')
  const aprovados  = items.filter(i => i.status === 'APPROVED')
  const rejeitados = items.filter(i => i.status === 'REJECTED')

  function TeamCard({ insc }: { insc: any }) {
    const membros = (insc.teams?.team_members ?? []).filter((m: any) => m.status === 'accepted')
    const valid = membros.length >= minMembers
    return (
      <div className="card-lol space-y-3">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-bold text-white text-base">[{insc.teams?.tag}] {insc.teams?.name}</p>
            <p className="text-gray-400 text-xs mt-0.5">
              Solicitado por {insc.profiles?.full_name ?? insc.profiles?.email}
              {' · '}
              {new Date(insc.created_at).toLocaleDateString('pt-BR')}
            </p>
          </div>
          <span className={`text-xs font-semibold px-2 py-1 rounded border ${STATUS_COLOR[insc.status]}`}>
            {STATUS_LABEL[insc.status]}
          </span>
        </div>

        {/* Membros do time */}
        <div>
          <p className="text-gray-500 text-xs font-semibold uppercase tracking-wider mb-1">
            Membros aceitos: {membros.length}/{minMembers} mínimo
            {!valid && <span className="text-red-400 ml-2">⚠️ Abaixo do mínimo</span>}
          </p>
          <div className="space-y-1">
            {membros.map((m: any) => (
              <div key={m.id} className="flex items-center gap-2 text-xs">
                <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                  m.team_role === 'captain' ? 'bg-[#C8A84B]/20 text-[#C8A84B]' : 'bg-[#1E3A5F] text-gray-300'
                }`}>
                  {m.team_role === 'captain' ? 'CAP' : m.team_role === 'substitute' ? 'SUB' : 'MBR'}
                </span>
                <span className="text-gray-300">{m.profiles?.full_name ?? m.profiles?.email}</span>
                {m.riot_accounts && (
                  <span className="text-gray-500">
                    {m.riot_accounts.game_name}#{m.riot_accounts.tag_line}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Ações (só para pendentes) */}
        {insc.status === 'PENDING' && (
          <div className="space-y-2 pt-1">
            <textarea
              value={notes[insc.id] ?? ''}
              onChange={e => setNotes(prev => ({ ...prev, [insc.id]: e.target.value }))}
              placeholder="Observação (opcional)..."
              className="input-lol w-full text-xs min-h-[56px] resize-none"
              maxLength={300}
            />
            <div className="flex gap-2">
              <button
                onClick={() => updateStatus(insc.id, 'APPROVED')}
                disabled={!!loadingId}
                className="btn-gold flex-1 py-2 text-sm"
              >
                {loadingId === insc.id ? '...' : '✔ Aprovar'}
              </button>
              <button
                onClick={() => updateStatus(insc.id, 'REJECTED')}
                disabled={!!loadingId}
                className="bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-700/40 rounded-lg flex-1 py-2 text-sm transition-colors"
              >
                {loadingId === insc.id ? '...' : '✖ Rejeitar'}
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">📋 Inscrições — {torneio.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">Mínimo {minMembers} membros aceitos por time para aprovação</p>
        </div>
        <Link href={`/organizador/torneios/${torneio.id}`} className="text-gray-400 hover:text-white text-sm">← Editar Torneio</Link>
      </div>

      {pendentes.length > 0 && (
        <section>
          <h2 className="text-yellow-400 font-semibold text-sm uppercase tracking-wider mb-3">⏳ Pendentes ({pendentes.length})</h2>
          <div className="space-y-4">{pendentes.map(i => <TeamCard key={i.id} insc={i} />)}</div>
        </section>
      )}
      {aprovados.length > 0 && (
        <section>
          <h2 className="text-green-400 font-semibold text-sm uppercase tracking-wider mb-3">✅ Aprovados ({aprovados.length})</h2>
          <div className="space-y-4">{aprovados.map(i => <TeamCard key={i.id} insc={i} />)}</div>
        </section>
      )}
      {rejeitados.length > 0 && (
        <section>
          <h2 className="text-red-400 font-semibold text-sm uppercase tracking-wider mb-3">❌ Rejeitados ({rejeitados.length})</h2>
          <div className="space-y-4">{rejeitados.map(i => <TeamCard key={i.id} insc={i} />)}</div>
        </section>
      )}
      {items.length === 0 && (
        <div className="card-lol text-center py-16">
          <p className="text-4xl mb-3">📩</p>
          <p className="text-white font-bold">Nenhuma inscrição ainda</p>
          <p className="text-gray-400 text-sm mt-1">As inscrições aparecerão aqui assim que os times se inscreverem.</p>
        </div>
      )}
    </div>
  )
}
