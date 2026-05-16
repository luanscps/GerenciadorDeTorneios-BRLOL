'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const LANES = ['top', 'jungle', 'mid', 'adc', 'support', 'fill']
const LANE_LABELS: Record<string, string> = {
  top: 'Top', jungle: 'Jungle', mid: 'Mid', adc: 'ADC', support: 'Support', fill: 'Fill',
}

type Member = {
  id: string
  profile_id: string
  team_role: string
  is_reserve: boolean
  lane: string | null
  profiles: {
    id: string
    username: string
    riot_id_game_name: string
    riot_id_tag_line: string
    avatar_url: string | null
  }
}

type Team = {
  id: string
  name: string
  tag: string
  description: string | null
  logo_url: string | null
  team_members: Member[]
}

type Props = {
  team: Team
  currentUserId: string | null
  captainProfileId: string | null
  isCaptain: boolean
}

export default function TeamPageClient({ team, currentUserId, captainProfileId, isCaptain }: Props) {
  const router = useRouter()
  const [laneEditing, setLaneEditing] = useState<string | null>(null)
  const [laneValues, setLaneValues] = useState<Record<string, string>>(
    Object.fromEntries(team.team_members.map(m => [m.profile_id, m.lane ?? '']))
  )
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const titulares = team.team_members.filter(m => !m.is_reserve)
  const reservas = team.team_members.filter(m => m.is_reserve)

  async function saveLane(profileId: string) {
    setLoading(true)
    setMsg('')
    const res = await fetch(`/api/teams/${team.id}/lane`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ profile_id: profileId, lane: laneValues[profileId] }),
    })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setMsg(json.error); return }
    setLaneEditing(null)
    router.refresh()
  }

  async function removeMember(profileId: string) {
    if (!confirm('Remover este jogador do time?')) return
    setLoading(true)
    const res = await fetch(`/api/teams/${team.id}/members/${profileId}`, { method: 'DELETE' })
    setLoading(false)
    if (res.ok) router.refresh()
    else { const j = await res.json(); setMsg(j.error) }
  }

  function MemberRow({ member, showActions }: { member: Member; showActions: boolean }) {
    const pid = member.profile_id
    const p = member.profiles
    return (
      <div className="flex items-center gap-3 rounded-lg bg-[#1a1a2e] p-3">
        {p.avatar_url ? (
          <Image src={p.avatar_url} alt={p.username} width={40} height={40} className="rounded-full" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#2a2a4a] flex items-center justify-center text-white font-bold">
            {p.username?.[0]?.toUpperCase()}
          </div>
        )}
        <div className="flex-1">
          <p className="text-white font-semibold">{p.username}</p>
          <p className="text-gray-400 text-sm">{p.riot_id_game_name}#{p.riot_id_tag_line}</p>
        </div>
        {/* Lane */}
        {showActions && isCaptain ? (
          laneEditing === pid ? (
            <div className="flex gap-2 items-center">
              <select
                className="bg-[#2a2a4a] text-white rounded px-2 py-1 text-sm"
                value={laneValues[pid]}
                onChange={e => setLaneValues(v => ({ ...v, [pid]: e.target.value }))}
              >
                <option value="">Sem lane</option>
                {LANES.map(l => <option key={l} value={l}>{LANE_LABELS[l]}</option>)}
              </select>
              <button
                onClick={() => saveLane(pid)}
                disabled={loading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm"
              >Salvar</button>
              <button
                onClick={() => setLaneEditing(null)}
                className="text-gray-400 hover:text-white text-sm"
              >✕</button>
            </div>
          ) : (
            <button
              onClick={() => setLaneEditing(pid)}
              className="text-xs bg-[#2a2a4a] hover:bg-[#3a3a5a] text-gray-300 px-2 py-1 rounded"
            >
              {laneValues[pid] ? LANE_LABELS[laneValues[pid]] : 'Definir Lane'}
            </button>
          )
        ) : (
          laneValues[pid] ? (
            <span className="text-xs bg-[#2a2a4a] text-blue-400 px-2 py-1 rounded">
              {LANE_LABELS[laneValues[pid]]}
            </span>
          ) : null
        )}
        {/* Remover */}
        {isCaptain && pid !== captainProfileId && (
          <button
            onClick={() => removeMember(pid)}
            disabled={loading}
            className="text-red-400 hover:text-red-600 text-sm ml-2"
            title="Remover jogador"
          >✕</button>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#0d0d1a] text-white p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        {team.logo_url && (
          <Image src={team.logo_url} alt={team.name} width={72} height={72} className="rounded-lg" />
        )}
        <div>
          <h1 className="text-3xl font-bold">{team.name}</h1>
          <span className="text-gray-400 text-sm">[{team.tag}]</span>
        </div>
      </div>

      {team.description && (
        <p className="text-gray-300 mb-6">{team.description}</p>
      )}

      {msg && (
        <div className="mb-4 p-3 rounded bg-red-900/40 border border-red-700 text-red-300">{msg}</div>
      )}

      {/* Titulares */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-blue-400 mb-3">
          Titulares ({titulares.length}/5)
        </h2>
        <div className="space-y-2">
          {titulares.length === 0 && (
            <p className="text-gray-500 text-sm">Nenhum titular ainda.</p>
          )}
          {titulares.map(m => (
            <MemberRow key={m.profile_id} member={m} showActions />
          ))}
        </div>
      </section>

      {/* Reservas */}
      <section className="mb-8">
        <h2 className="text-lg font-semibold text-yellow-400 mb-3">
          Reservas ({reservas.length}/6)
        </h2>
        <div className="space-y-2">
          {reservas.length === 0 && (
            <p className="text-gray-500 text-sm">Nenhuma reserva ainda.</p>
          )}
          {reservas.map(m => (
            <MemberRow key={m.profile_id} member={m} showActions={false} />
          ))}
        </div>
      </section>

      {/* Painel capitão — convidar */}
      {isCaptain && (
        <section>
          <h2 className="text-lg font-semibold text-green-400 mb-2">Painel do Capitão</h2>
          <p className="text-gray-400 text-sm">
            Para convidar jogadores, acesse o perfil deles e use o botão de convite.
            Titulares restantes: {5 - titulares.length} | Reservas restantes: {6 - reservas.length}
          </p>
        </section>
      )}
    </div>
  )
}
