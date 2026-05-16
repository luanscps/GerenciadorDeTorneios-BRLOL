import React from 'react'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createServiceRoleClient } from '@/lib/supabase/server'

async function getJogador(profileId: string) {
  const supabase = createServiceRoleClient()

  const { data: profile, error: pErr } = await supabase
    .from('profiles')
    .select('id, full_name, email, is_admin, role, created_at')
    .eq('id', profileId)
    .single()

  if (pErr || !profile) return null

  const { data: riotAccounts } = await supabase
    .from('riot_accounts')
    .select(`
      id, game_name, tag_line, summoner_level, is_primary,
      lock_status, lock_until, locked_at, lock_reason,
      rank_snapshots ( queue_type, tier, rank, lp, wins, losses )
    `)
    .eq('profile_id', profileId)
    .order('is_primary', { ascending: false })

  return { profile, riotAccounts: riotAccounts ?? [] }
}

const TIER_COLORS: Record<string, string> = {
  CHALLENGER:  'text-yellow-300',
  GRANDMASTER: 'text-red-400',
  MASTER:      'text-purple-400',
  DIAMOND:     'text-blue-400',
  EMERALD:     'text-emerald-400',
  PLATINUM:    'text-teal-400',
  GOLD:        'text-yellow-500',
  SILVER:      'text-gray-400',
  BRONZE:      'text-orange-700',
  IRON:        'text-gray-500',
  UNRANKED:    'text-gray-600',
}

const LOCK_COLOR: Record<string, string> = {
  unlocked:         'text-green-400',
  locked_permanent: 'text-red-400',
  locked_until:     'text-yellow-400',
}

const LOCK_LABEL: Record<string, string> = {
  unlocked:         '🟢 Desbloqueado',
  locked_permanent: '🔴 Permanente',
  locked_until:     '🟡 Até data',
}

export default async function AdminJogadorDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const data = await getJogador(slug)
  if (!data) return notFound()

  const { profile, riotAccounts } = data

  return (
    <div className="p-6 max-w-3xl space-y-6">
      <div className="flex items-center gap-2">
        <Link href="/admin/jogadores" className="text-gray-400 hover:text-white text-sm">← Jogadores</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white text-sm">{profile.full_name ?? profile.email}</span>
      </div>

      <div className="card-lol flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white">{profile.full_name ?? '—'}</h1>
          <p className="text-gray-400 text-sm">{profile.email}</p>
          <p className="text-gray-600 text-xs font-mono mt-1">ID: {profile.id}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {profile.is_admin && (
            <span className="text-xs bg-purple-900/40 text-purple-400 border border-purple-500/30 px-2 py-1 rounded">Admin</span>
          )}
          <span className="text-xs bg-[#0A1628] text-gray-400 border border-[#1E3A5F] px-2 py-1 rounded">
            {(profile as any).role ?? 'player'}
          </span>
          <Link
            href={`/admin/jogadores/${profile.id}/riot-lock`}
            className="btn-gold text-sm px-4 py-2"
          >
            🔐 Gerenciar Locks Riot
          </Link>
        </div>
      </div>

      <div className="card-lol space-y-4">
        <h2 className="text-lg font-bold text-white">⚔️ Contas Riot Vinculadas</h2>

        {riotAccounts.length === 0 ? (
          <p className="text-gray-500 text-sm">Nenhuma conta Riot vinculada.</p>
        ) : (
          <div className="space-y-3">
            {riotAccounts.map((acc: any) => {
              const soloRank = (acc.rank_snapshots as any[])?.find(
                (r: any) => r.queue_type === 'RANKED_SOLO_5x5'
              )
              const canEdit =
                acc.lock_status === 'unlocked' ||
                (acc.lock_status === 'locked_until' &&
                  acc.lock_until &&
                  new Date(acc.lock_until) < new Date())

              return (
                <div key={acc.id} className="bg-[#060E1A] rounded-xl border border-[#1E3A5F] p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-white font-semibold">
                        {acc.game_name}
                        <span className="text-gray-500">#{acc.tag_line}</span>
                        {acc.is_primary && (
                          <span className="ml-2 text-xs text-[#C8A84B] border border-[#C8A84B]/30 px-1.5 py-0.5 rounded">Principal</span>
                        )}
                      </p>
                      {soloRank && (
                        <p className={`text-sm font-bold mt-0.5 ${TIER_COLORS[soloRank.tier] ?? 'text-gray-400'}`}>
                          {soloRank.tier} {soloRank.rank} — {soloRank.lp} LP
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-medium ${LOCK_COLOR[acc.lock_status] ?? 'text-gray-400'}`}>
                        {LOCK_LABEL[acc.lock_status] ?? acc.lock_status}
                      </p>
                      {acc.lock_status === 'locked_until' && acc.lock_until && (
                        <p className="text-xs text-gray-500">
                          até {new Date(acc.lock_until).toLocaleDateString('pt-BR')}
                        </p>
                      )}
                      <p className={`text-xs mt-0.5 font-medium ${canEdit ? 'text-green-400' : 'text-red-400'}`}>
                        {canEdit ? '✅ Usuário pode editar' : '🔒 Usuário não pode editar'}
                      </p>
                    </div>
                  </div>
                  {acc.lock_reason && (
                    <p className="text-gray-500 text-xs">💬 Motivo: {acc.lock_reason}</p>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
