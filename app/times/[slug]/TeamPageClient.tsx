'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'

const DDRAGON_VERSION = '14.10.1'

const LANES = ['top', 'jungle', 'mid', 'adc', 'support', 'fill']

const LANE_LABELS: Record<string, string> = {
  top: 'Top',       TOP: 'Top',
  jungle: 'Jungle', JUNGLE: 'Jungle',
  mid: 'Mid',       MID: 'Mid',
  adc: 'ADC',       ADC: 'ADC',
  support: 'Support', SUPPORT: 'Support',
  fill: 'Fill',     FILL: 'Fill',
}

const LANE_ICONS: Record<string, string> = {
  TOP: '🗡️', top: '🗡️',
  JUNGLE: '🌿', jungle: '🌿',
  MID: '⚡', mid: '⚡',
  ADC: '🏹', adc: '🏹',
  SUPPORT: '🛡️', support: '🛡️',
  FILL: '🔄', fill: '🔄',
}

const TIER_ORDER = ['IRON','BRONZE','SILVER','GOLD','PLATINUM','EMERALD','DIAMOND','MASTER','GRANDMASTER','CHALLENGER']

const TIER_COLORS: Record<string, string> = {
  IRON:          'text-gray-400',
  BRONZE:        'text-amber-600',
  SILVER:        'text-gray-300',
  GOLD:          'text-yellow-400',
  PLATINUM:      'text-teal-400',
  EMERALD:       'text-emerald-400',
  DIAMOND:       'text-blue-400',
  MASTER:        'text-purple-400',
  GRANDMASTER:   'text-red-400',
  CHALLENGER:    'text-yellow-300',
}

const TIER_ICONS: Record<string, string> = {
  IRON: '🩶', BRONZE: '🥉', SILVER: '🥈', GOLD: '🥇',
  PLATINUM: '💎', EMERALD: '💚', DIAMOND: '💠',
  MASTER: '👑', GRANDMASTER: '🔥', CHALLENGER: '⚡',
}

type RankSnapshot = {
  queue_type: string
  tier: string
  rank: string
  lp: number
  wins: number
  losses: number
  hot_streak: boolean
  snapshotted_at: string
}

type RiotAccount = {
  id: string
  game_name: string
  tag_line: string
  profile_icon_id: number | null
  summoner_level: number | null
  rank_snapshots: RankSnapshot[]
}

type Member = {
  id: string
  profile_id: string
  team_role: string
  is_reserve: boolean
  lane: string | null
  riot_account: RiotAccount | null
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

function getRank(snapshots: RankSnapshot[], queueType: string): RankSnapshot | null {
  const filtered = snapshots
    .filter(s => s.queue_type === queueType)
    .sort((a, b) => new Date(b.snapshotted_at).getTime() - new Date(a.snapshotted_at).getTime())
  return filtered[0] ?? null
}

function RankBadge({ snapshot, label }: { snapshot: RankSnapshot | null; label: string }) {
  if (!snapshot) return (
    <div className="text-center">
      <p className="text-gray-600 text-[10px] uppercase tracking-wide">{label}</p>
      <p className="text-gray-600 text-xs">Unranked</p>
    </div>
  )

  const winrate = snapshot.wins + snapshot.losses > 0
    ? Math.round((snapshot.wins / (snapshot.wins + snapshot.losses)) * 100)
    : null

  const tierColor = TIER_COLORS[snapshot.tier] ?? 'text-gray-400'
  const tierIcon  = TIER_ICONS[snapshot.tier]  ?? ''

  return (
    <div className="text-center">
      <p className="text-gray-500 text-[10px] uppercase tracking-wide mb-0.5">{label}</p>
      <p className={`font-bold text-sm leading-tight ${tierColor}`}>
        {tierIcon} {snapshot.tier} {snapshot.rank}
      </p>
      <p className="text-gray-400 text-[11px]">{snapshot.lp} LP</p>
      {winrate !== null && (
        <p className={`text-[10px] font-medium ${
          winrate >= 55 ? 'text-green-400' : winrate >= 45 ? 'text-gray-400' : 'text-red-400'
        }`}>{winrate}% WR ({snapshot.wins}W/{snapshot.losses}L)</p>
      )}
      {snapshot.hot_streak && (
        <span className="text-[10px] text-orange-400">🔥 Em Série</span>
      )}
    </div>
  )
}

export default function TeamPageClient({ team, currentUserId, captainProfileId, isCaptain }: Props) {
  const router = useRouter()
  const [laneEditing, setLaneEditing] = useState<string | null>(null)
  const [laneValues, setLaneValues] = useState<Record<string, string>>(
    Object.fromEntries(
      team.team_members.map(m => [m.profile_id, m.lane ? m.lane.toLowerCase() : ''])
    )
  )
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState('')

  const titulares = team.team_members.filter(m => !m.is_reserve)
  const reservas  = team.team_members.filter(m => m.is_reserve)

  async function saveLane(profileId: string) {
    setLoading(true); setMsg('')
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

  function MemberCard({ member, showActions }: { member: Member; showActions: boolean }) {
    const pid = member.profile_id
    const ra  = member.riot_account
    const snapshots  = ra?.rank_snapshots ?? []
    const solo       = getRank(snapshots, 'RANKED_SOLO_5x5')
    const flex       = getRank(snapshots, 'RANKED_FLEX_SR')
    const iconUrl    = ra?.profile_icon_id
      ? `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/profileicon/${ra.profile_icon_id}.png`
      : null
    const isCaptainMember = member.team_role === 'captain'
    const laneKey = member.lane ?? ''

    return (
      <div className="card-lol flex flex-col gap-3">
        {/* Linha principal: ícone + nome + lane + ações */}
        <div className="flex items-center gap-3">

          {/* Ícone de perfil */}
          <div className="relative flex-shrink-0">
            {iconUrl ? (
              <Image
                src={iconUrl}
                alt={ra?.game_name ?? 'icon'}
                width={48}
                height={48}
                className="rounded-lg border border-[#1E3A5F]"
                unoptimized
              />
            ) : (
              <div className="w-12 h-12 rounded-lg bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-white font-bold">
                {ra?.game_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            {/* Nível */}
            {ra?.summoner_level && (
              <span className="absolute -bottom-1.5 -right-1.5 bg-[#0A1628] border border-[#1E3A5F] text-[#C8A84B] text-[9px] font-bold px-1 rounded">
                {ra.summoner_level}
              </span>
            )}
          </div>

          {/* Nome + meta */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <p className="text-white font-semibold truncate">
                {ra ? ra.game_name : '(sem conta Riot)'}
                {ra && <span className="text-gray-500 font-normal text-sm">#{ra.tag_line}</span>}
              </p>
              {isCaptainMember && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full border border-[#C8A84B]/40 text-[#C8A84B] bg-[#C8A84B]/10">
                  👑 Capitão
                </span>
              )}
            </div>
            {laneKey && (
              <p className="text-blue-400 text-xs mt-0.5">
                {LANE_ICONS[laneKey] ?? ''} {LANE_LABELS[laneKey] ?? laneKey}
              </p>
            )}
          </div>

          {/* Ações capitão */}
          {showActions && isCaptain && (
            laneEditing === pid ? (
              <div className="flex gap-2 items-center flex-shrink-0">
                <select
                  className="bg-[#1E2A3A] border border-[#1E3A5F] text-white rounded px-2 py-1 text-sm"
                  value={laneValues[pid]}
                  onChange={e => setLaneValues(v => ({ ...v, [pid]: e.target.value }))}
                >
                  <option value="">Sem lane</option>
                  {LANES.map(l => <option key={l} value={l}>{LANE_LABELS[l]}</option>)}
                </select>
                <button onClick={() => saveLane(pid)} disabled={loading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-2 py-1 rounded text-sm">Salvar</button>
                <button onClick={() => setLaneEditing(null)} className="text-gray-400 hover:text-white text-sm">✕</button>
              </div>
            ) : (
              <button onClick={() => setLaneEditing(pid)}
                className="text-xs bg-[#1E2A3A] hover:bg-[#2a3a4a] border border-[#1E3A5F] text-gray-300 px-2 py-1 rounded flex-shrink-0">
                {laneValues[pid] ? `${LANE_ICONS[laneValues[pid]] ?? ''} ${LANE_LABELS[laneValues[pid]]}` : 'Definir Lane'}
              </button>
            )
          )}

          {isCaptain && pid !== captainProfileId && (
            <button onClick={() => removeMember(pid)} disabled={loading}
              className="text-red-400 hover:text-red-300 text-sm transition-colors flex-shrink-0" title="Remover">✕</button>
          )}
        </div>

        {/* Linha de rank — só se tiver dados */}
        {(solo || flex) && (
          <div className="flex gap-4 pt-2 border-t border-[#1E3A5F] justify-around flex-wrap">
            <RankBadge snapshot={solo} label="Solo/Duo" />
            <RankBadge snapshot={flex} label="Flex" />
          </div>
        )}
        {!solo && !flex && ra && (
          <p className="text-gray-600 text-xs pt-2 border-t border-[#1E3A5F]">Sem partidas ranqueadas registradas</p>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="card-lol">
        <div className="flex items-center gap-4">
          {team.logo_url ? (
            <Image src={team.logo_url} alt={team.name} width={72} height={72} className="rounded-lg object-cover" />
          ) : (
            <div className="w-[72px] h-[72px] rounded-lg bg-[#1E2A3A] border border-[#1E3A5F] flex items-center justify-center text-3xl">
              🛡️
            </div>
          )}
          <div>
            <h1 className="text-2xl font-bold text-white">{team.name}</h1>
            <span className="text-gray-400 text-sm">[{team.tag}]</span>
            {team.description && (
              <p className="text-gray-400 text-sm mt-1">{team.description}</p>
            )}
          </div>
        </div>
      </div>

      {msg && (
        <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-5 py-3">
          <p className="text-red-400 text-sm">❌ {msg}</p>
        </div>
      )}

      {/* Titulares */}
      <section>
        <h2 className="text-base font-semibold text-blue-400 mb-3">
          Titulares ({titulares.length}/5)
        </h2>
        <div className="space-y-3">
          {titulares.length === 0 && (
            <p className="text-gray-500 text-sm">Nenhum titular ainda.</p>
          )}
          {titulares.map(m => (
            <MemberCard key={m.id} member={m} showActions />
          ))}
        </div>
      </section>

      {/* Reservas */}
      <section>
        <h2 className="text-base font-semibold text-yellow-400 mb-3">
          Reservas ({reservas.length}/6)
        </h2>
        <div className="space-y-3">
          {reservas.length === 0 && (
            <p className="text-gray-500 text-sm">Nenhuma reserva ainda.</p>
          )}
          {reservas.map(m => (
            <MemberCard key={m.id} member={m} showActions={false} />
          ))}
        </div>
      </section>

      {/* Painel capitão */}
      {isCaptain && (
        <section className="card-lol">
          <h2 className="text-base font-semibold text-green-400 mb-2">Painel do Capitão</h2>
          <p className="text-gray-400 text-sm">
            Titulares restantes: {5 - titulares.length} · Reservas restantes: {6 - reservas.length}
          </p>
        </section>
      )}
    </div>
  )
}
