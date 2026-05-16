'use client'
import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type LockStatus = 'unlocked' | 'locked_permanent' | 'locked_until'

interface RiotAccount {
  id: string
  game_name: string
  tag_line: string
  lock_status: LockStatus
  lock_until: string | null
  locked_at: string | null
  lock_reason: string | null
  is_primary: boolean
}

interface LockLog {
  id: string
  action: LockStatus
  lock_until: string | null
  lock_reason: string | null
  previous_status: string | null
  created_at: string
  profiles: { full_name: string | null; email: string } | null
}

const STATUS_LABEL: Record<LockStatus, string> = {
  unlocked:         '🟢 Desbloqueado',
  locked_permanent: '🔴 Bloqueado Permanente',
  locked_until:     '🟡 Bloqueado até data',
}

const STATUS_COLOR: Record<LockStatus, string> = {
  unlocked:         'text-green-400 border-green-500/30 bg-green-400/5',
  locked_permanent: 'text-red-400 border-red-500/30 bg-red-400/5',
  locked_until:     'text-yellow-400 border-yellow-500/30 bg-yellow-400/5',
}

export default function RiotLockPage() {
  const { slug: profileId } = useParams() as { slug: string }
  const supabase = createClient()

  const [accounts, setAccounts]       = useState<RiotAccount[]>([])
  const [selected, setSelected]       = useState<RiotAccount | null>(null)
  const [logs, setLogs]               = useState<LockLog[]>([])
  const [action, setAction]           = useState<LockStatus>('locked_until')
  const [lockDays, setLockDays]       = useState(30)
  const [reason, setReason]           = useState('')
  const [loading, setLoading]         = useState(false)
  const [loadingLogs, setLoadingLogs] = useState(false)
  const [error, setError]             = useState('')
  const [success, setSuccess]         = useState('')

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from('riot_accounts')
        .select('id, game_name, tag_line, lock_status, lock_until, locked_at, lock_reason, is_primary')
        .eq('profile_id', profileId)
        .order('is_primary', { ascending: false })
      const list = (data as RiotAccount[]) ?? []
      setAccounts(list)
      if (list.length > 0) {
        setSelected(list[0])
        setAction(list[0].lock_status)
      }
    }
    load()
  }, [profileId, supabase])

  const loadLogs = useCallback(async (accountId: string) => {
    setLoadingLogs(true)
    const res  = await fetch(`/api/admin/riot-accounts/${accountId}/lock`)
    const json = await res.json()
    setLogs(json.logs ?? [])
    setLoadingLogs(false)
  }, [])

  useEffect(() => {
    if (selected) {
      loadLogs(selected.id)
      setAction(selected.lock_status)
    }
  }, [selected, loadLogs])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    setLoading(true)
    setError('')
    setSuccess('')

    const res = await fetch(`/api/admin/riot-accounts/${selected.id}/lock`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        lock_days:   action === 'locked_until' ? lockDays : undefined,
        lock_reason: reason.trim() || undefined,
      }),
    })

    const json = await res.json()
    if (!res.ok) {
      setError(json.error ?? 'Erro ao aplicar lock')
    } else {
      setSuccess(`✅ Lock aplicado: ${STATUS_LABEL[action]} em ${json.account}`)
      setAccounts(prev => prev.map(a =>
        a.id === selected.id
          ? { ...a, lock_status: action, lock_until: json.lock_until, lock_reason: reason.trim() || null }
          : a
      ))
      setSelected(prev => prev
        ? { ...prev, lock_status: action, lock_until: json.lock_until, lock_reason: reason.trim() || null }
        : prev
      )
      setReason('')
      loadLogs(selected.id)
    }
    setLoading(false)
  }

  function canEditNow(acc: RiotAccount): boolean {
    if (acc.lock_status === 'unlocked') return true
    if (acc.lock_status === 'locked_permanent') return false
    if (acc.lock_status === 'locked_until' && acc.lock_until) {
      return new Date(acc.lock_until) < new Date()
    }
    return false
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-center gap-2 text-sm">
        <Link href="/admin/jogadores" className="text-gray-400 hover:text-white">← Jogadores</Link>
        <span className="text-gray-600">/</span>
        <Link href={`/admin/jogadores/${profileId}`} className="text-gray-400 hover:text-white">Perfil</Link>
        <span className="text-gray-600">/</span>
        <span className="text-white">Controle de Lock Riot</span>
      </div>

      <div>
        <h1 className="text-xl font-bold text-white">🔐 Controle de Lock — Contas Riot</h1>
        <p className="text-gray-400 text-sm mt-1">
          Gerencie o estado de bloqueio de cada conta Riot vinculada a este perfil.
          Todo lock/unlock é registrado no log de auditoria.
        </p>
      </div>

      {accounts.length === 0 ? (
        <div className="card-lol text-center py-10">
          <p className="text-gray-500">Este perfil não possui contas Riot vinculadas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {accounts.map(acc => (
            <button
              key={acc.id}
              onClick={() => setSelected(acc)}
              className={`w-full text-left p-4 rounded-xl border transition-colors ${
                selected?.id === acc.id
                  ? 'border-[#C8A84B] bg-[#C8A84B]/5'
                  : 'border-[#1E3A5F] hover:border-[#2a4f7f] bg-[#0A1628]'
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-semibold">
                    {acc.game_name}
                    <span className="text-gray-500">#{acc.tag_line}</span>
                    {acc.is_primary && (
                      <span className="ml-2 text-xs text-[#C8A84B] border border-[#C8A84B]/30 px-1.5 py-0.5 rounded">Principal</span>
                    )}
                  </p>
                  <p className="text-gray-500 text-xs mt-0.5 font-mono">{acc.id.slice(0, 18)}…</p>
                </div>
                <div className={`text-xs px-2.5 py-1 rounded-full border font-medium ${STATUS_COLOR[acc.lock_status]}`}>
                  {STATUS_LABEL[acc.lock_status]}
                  {acc.lock_status === 'locked_until' && acc.lock_until && (
                    <span className="block text-center mt-0.5">
                      até {new Date(acc.lock_until).toLocaleDateString('pt-BR')}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-4 mt-2">
                <span className={`text-xs font-medium ${canEditNow(acc) ? 'text-green-400' : 'text-red-400'}`}>
                  {canEditNow(acc) ? '✅ Usuário PODE editar' : '🔒 Usuário NÃO pode editar'}
                </span>
                {acc.lock_reason && (
                  <span className="text-xs text-gray-500">Motivo: {acc.lock_reason}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}

      {selected && (
        <form onSubmit={handleSubmit} className="card-lol space-y-4">
          <h2 className="text-base font-bold text-white">
            Alterar lock: <span className="text-[#C8A84B]">{selected.game_name}#{selected.tag_line}</span>
          </h2>

          <div>
            <label className="block text-gray-400 text-sm mb-2">Novo estado</label>
            <div className="space-y-2">
              {(['unlocked', 'locked_until', 'locked_permanent'] as LockStatus[]).map(opt => (
                <label
                  key={opt}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    action === opt ? 'border-[#C8A84B] bg-[#C8A84B]/5' : 'border-[#1E3A5F] hover:border-[#2a4f7f]'
                  }`}
                >
                  <input
                    type="radio"
                    name="action"
                    value={opt}
                    checked={action === opt}
                    onChange={() => setAction(opt)}
                    className="mt-1 accent-[#C8A84B] shrink-0"
                  />
                  <div>
                    <p className={`font-medium text-sm ${STATUS_COLOR[opt].split(' ')[0]}`}>
                      {STATUS_LABEL[opt]}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">
                      {opt === 'unlocked'          && 'Usuário pode editar/remover livremente.'}
                      {opt === 'locked_until'       && 'Bloqueado por N dias. Após expirar, usuário pode editar.'}
                      {opt === 'locked_permanent'   && 'Bloqueado indefinidamente. Só o admin pode desbloquear.'}
                    </p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {action === 'locked_until' && (
            <div>
              <label className="block text-gray-400 text-sm mb-1">Duração do lock (dias)</label>
              <input
                type="number"
                min={1}
                max={3650}
                value={lockDays}
                onChange={e => setLockDays(Number(e.target.value))}
                className="input-lol w-32"
              />
              <p className="text-gray-600 text-xs mt-1">
                Expira em: {new Date(Date.now() + lockDays * 86400000).toLocaleDateString('pt-BR')}
              </p>
            </div>
          )}

          <div>
            <label className="block text-gray-400 text-sm mb-1">Motivo (opcional, registrado no log)</label>
            <input
              type="text"
              value={reason}
              onChange={e => setReason(e.target.value)}
              placeholder="Ex: Conta verificada para temporada 2026"
              className="input-lol w-full"
              maxLength={200}
            />
          </div>

          {error   && <p className="text-red-400 text-sm">{error}</p>}
          {success && <p className="text-green-400 text-sm">{success}</p>}

          <button type="submit" disabled={loading} className="btn-gold w-full py-3">
            {loading ? 'Aplicando…' : '🔐 Aplicar Lock'}
          </button>
        </form>
      )}

      {selected && (
        <div className="card-lol space-y-3">
          <h2 className="text-base font-bold text-white">📋 Histórico de Locks</h2>
          {loadingLogs ? (
            <p className="text-gray-500 text-sm">Carregando…</p>
          ) : logs.length === 0 ? (
            <p className="text-gray-500 text-sm">Nenhuma alteração registrada ainda.</p>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div key={log.id} className="bg-[#060E1A] rounded-lg border border-[#1E3A5F] px-4 py-3">
                  <div className="flex items-center justify-between">
                    <span className={`text-sm font-medium ${
                      STATUS_COLOR[log.action as LockStatus]?.split(' ')[0] ?? 'text-gray-400'
                    }`}>
                      {STATUS_LABEL[log.action as LockStatus] ?? log.action}
                    </span>
                    <span className="text-gray-600 text-xs">
                      {new Date(log.created_at).toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 text-xs text-gray-500">
                    <span>Por: <span className="text-gray-400">{log.profiles?.full_name ?? log.profiles?.email ?? '—'}</span></span>
                    {log.lock_until && (
                      <span>Até: <span className="text-gray-400">{new Date(log.lock_until).toLocaleDateString('pt-BR')}</span></span>
                    )}
                    {log.previous_status && (
                      <span>Anterior: <span className="text-gray-400">{log.previous_status}</span></span>
                    )}
                  </div>
                  {log.lock_reason && (
                    <p className="text-gray-400 text-xs mt-1">💬 {log.lock_reason}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
