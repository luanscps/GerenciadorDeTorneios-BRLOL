'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Status que permitem ao organizador cancelar o torneio.
// Torneios IN_PROGRESS ou FINISHED não podem ser cancelados diretamente.
const CANCELABLE_STATUS = ['DRAFT', 'OPEN']

// Apenas torneios em DRAFT sem inscrições aprovadas podem ser deletados permanentemente.
const DELETABLE_STATUS = ['DRAFT']

export default function EditarTorneiPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteAction, setDeleteAction] = useState<'cancel' | 'delete'>('cancel')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(searchParams.get('criado') === 'true')

  const [nome, setNome] = useState('')
  const [descricao, setDescricao] = useState('')
  const [slug, setSlug] = useState('')
  const [rules, setRules] = useState('')
  const [status, setStatus] = useState('DRAFT')
  const [maxTeams, setMaxTeams] = useState(8)
  const [minMembers, setMinMembers] = useState(6)
  const [maxMembers, setMaxMembers] = useState(10)
  const [prizePool, setPrizePool] = useState('')
  const [startsAt, setStartsAt] = useState('')
  const [endsAt, setEndsAt] = useState('')
  const [hasEnrollments, setHasEnrollments] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data } = await supabase
        .from('tournaments')
        .select('*')
        .eq('id', id)
        .eq('organizer_id', user.id) // garante que só o dono acessa
        .single()

      if (!data) { router.push('/organizador'); return }

      setNome(data.name ?? '')
      setDescricao(data.description ?? '')
      setSlug(data.slug ?? '')
      setRules(data.rules ?? '')
      setStatus(data.status ?? 'DRAFT')
      setMaxTeams(data.max_teams ?? 8)
      setMinMembers(data.min_members ?? 6)
      setMaxMembers(data.max_members ?? 10)
      setPrizePool(data.prize_pool ?? '')
      setStartsAt(data.start_date ? data.start_date.slice(0, 16) : '')
      setEndsAt(data.end_date ? data.end_date.slice(0, 16) : '')

      // Verifica inscrições aprovadas — impede delete permanente se existirem
      const { count } = await supabase
        .from('tournament_registrations')
        .select('id', { count: 'exact', head: true })
        .eq('tournament_id', id)
        .eq('status', 'APPROVED')

      setHasEnrollments((count ?? 0) > 0)
      setLoading(false)
    }
    load()
  }, [id, supabase, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess(false)
    const { error: err } = await supabase.from('tournaments').update({
      name: nome.trim(),
      description: descricao.trim() || null,
      slug: slug.trim(),
      rules: rules.trim(),
      status,
      max_teams: maxTeams,
      min_members: minMembers,
      max_members: maxMembers,
      prize_pool: prizePool.trim() || null,
      start_date: startsAt || null,
      end_date: endsAt || null,
    }).eq('id', id)
    setSaving(false)
    if (err) setError(err.message)
    else setSuccess(true)
  }

  async function handleConfirmDelete() {
    setDeleting(true)
    setError('')
    try {
      if (deleteAction === 'delete') {
        // Hard-delete — só DRAFT sem inscrições aprovadas
        const { error: err } = await supabase
          .from('tournaments')
          .delete()
          .eq('id', id)
        if (err) throw new Error(err.message)
        router.push('/organizador?deletado=true')
      } else {
        // Soft-delete — muda status para CANCELLED
        const { error: err } = await supabase
          .from('tournaments')
          .update({ status: 'CANCELLED' })
          .eq('id', id)
        if (err) throw new Error(err.message)
        setStatus('CANCELLED')
        setShowDeleteModal(false)
        setSuccess(true)
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao processar ação')
      setShowDeleteModal(false)
    } finally {
      setDeleting(false)
    }
  }

  function openModal(action: 'cancel' | 'delete') {
    setDeleteAction(action)
    setShowDeleteModal(true)
  }

  const canCancel = CANCELABLE_STATUS.includes(status)
  const canDelete = DELETABLE_STATUS.includes(status) && !hasEnrollments
  const isCancelled = status === 'CANCELLED'

  if (loading) return <div className="card-lol py-16 text-center"><p className="text-gray-400">Carregando...</p></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Modal de confirmação cancelar/deletar */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="bg-[#0A1628] border border-[#1E3A5F] rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4">
            <h2 className="text-white font-bold text-lg">
              {deleteAction === 'delete' ? '🗑️ Deletar torneio?' : '⚠️ Cancelar torneio?'}
            </h2>
            <p className="text-gray-400 text-sm">
              {deleteAction === 'delete'
                ? 'O torneio será permanentemente removido. Esta ação não pode ser desfeita.'
                : 'O torneio será marcado como CANCELADO. Os participantes serão notificados e você liberará uma vaga para criar um novo torneio.'}
            </p>
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="btn-outline-gold flex-1 py-2.5 text-sm"
              >
                Voltar
              </button>
              <button
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="flex-1 py-2.5 text-sm font-semibold rounded-lg bg-red-700 hover:bg-red-600 text-white transition-colors disabled:opacity-50"
              >
                {deleting ? 'Aguarde...' : deleteAction === 'delete' ? 'Sim, deletar' : 'Sim, cancelar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between flex-wrap gap-2">
        <h1 className="text-xl font-bold text-white">✏️ Editar Torneio</h1>
        <div className="flex gap-2 flex-wrap">
          <a href={`/organizador/torneios/${id}/inscricoes`} className="btn-outline-gold text-sm px-3 py-2">📋 Inscrições</a>
          <a href={`/organizador/torneios/${id}/fases`} className="btn-outline-gold text-sm px-3 py-2">🏗️ Fases</a>
          <a href={`/organizador/torneios/${id}/partidas`} className="btn-outline-gold text-sm px-3 py-2">⚔️ Partidas</a>
          <a href={`/torneios/${slug || id}`} target="_blank" className="text-gray-400 hover:text-white text-sm py-2">Ver página →</a>
        </div>
      </div>

      {success && (
        <div className="bg-green-900/30 border border-green-600/40 rounded-xl px-5 py-3">
          <p className="text-green-400 text-sm">
            {searchParams.get('criado') === 'true'
              ? '🎉 Torneio criado com sucesso! Configure as informações abaixo.'
              : '✅ Torneio salvo com sucesso!'}
          </p>
        </div>
      )}

      {isCancelled && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-5 py-3">
          <p className="text-yellow-400 text-sm">⚠️ Este torneio está <strong>CANCELADO</strong>. Não é possível editá-lo.</p>
        </div>
      )}

      <form onSubmit={handleSave} className="card-lol space-y-5">
        <div><label className="block text-gray-400 text-sm mb-1">Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} className="input-lol w-full" maxLength={80} required disabled={isCancelled} /></div>

        <div><label className="block text-gray-400 text-sm mb-1">Slug</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} className="input-lol w-full" maxLength={60} disabled={isCancelled} /></div>

        <div><label className="block text-gray-400 text-sm mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="input-lol w-full" disabled={isCancelled}>
            <option value="DRAFT">Rascunho</option>
            <option value="OPEN">Inscrições Abertas</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="FINISHED">Finalizado</option>
            <option value="CANCELLED">Cancelado</option>
          </select></div>

        <div><label className="block text-gray-400 text-sm mb-1">Descrição</label>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} className="input-lol w-full min-h-[80px] resize-y text-sm" maxLength={500} disabled={isCancelled} /></div>

        <div><label className="block text-gray-400 text-sm mb-1">Regras do Torneio</label>
          <textarea value={rules} onChange={e => setRules(e.target.value)} className="input-lol w-full min-h-[140px] resize-y text-sm" maxLength={3000} disabled={isCancelled} /></div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-gray-400 text-sm mb-1">Máx. Times</label>
            <input type="number" min={2} max={64} value={maxTeams} onChange={e => setMaxTeams(+e.target.value)} className="input-lol w-full" disabled={isCancelled} /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Mín. Membros</label>
            <input type="number" min={1} max={maxMembers} value={minMembers} onChange={e => setMinMembers(+e.target.value)} className="input-lol w-full" disabled={isCancelled} /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Máx. Membros</label>
            <input type="number" min={minMembers} max={20} value={maxMembers} onChange={e => setMaxMembers(+e.target.value)} className="input-lol w-full" disabled={isCancelled} /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Prêmio</label>
            <input value={prizePool} onChange={e => setPrizePool(e.target.value)} className="input-lol w-full" maxLength={100} disabled={isCancelled} /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Início</label>
            <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="input-lol w-full" disabled={isCancelled} /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Término</label>
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="input-lol w-full" disabled={isCancelled} /></div>
        </div>

        {error && <div className="bg-red-900/30 border border-red-500/40 rounded p-3"><p className="text-red-400 text-sm">{error}</p></div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.push('/organizador')} className="btn-outline-gold flex-1 py-3">← Voltar</button>
          {!isCancelled && (
            <button type="submit" disabled={saving} className="btn-gold flex-1 py-3">{saving ? 'Salvando...' : '💾 Salvar Alterações'}</button>
          )}
        </div>
      </form>

      {/* Zona de perigo — cancelar ou deletar */}
      {(canCancel || canDelete) && (
        <div className="card-lol border border-red-900/40 space-y-4">
          <div>
            <h3 className="text-red-400 font-semibold text-sm">⚠️ Zona de Perigo</h3>
            <p className="text-gray-500 text-xs mt-1">Ações irreversíveis ou de alto impacto para o torneio.</p>
          </div>

          <div className="space-y-3">
            {canCancel && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Cancelar torneio</p>
                  <p className="text-gray-500 text-xs">
                    Muda o status para CANCELADO. Libera uma vaga de torneio ativo para você.
                    {hasEnrollments && ' Times inscritos serão notificados.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal('cancel')}
                  className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg border border-red-700 text-red-400 hover:bg-red-900/30 transition-colors"
                >
                  Cancelar torneio
                </button>
              </div>
            )}

            {canDelete && (
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-gray-300 text-sm font-medium">Deletar permanentemente</p>
                  <p className="text-gray-500 text-xs">
                    Remove o torneio do banco de dados. Disponível apenas para rascunhos sem inscrições aprovadas.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => openModal('delete')}
                  className="shrink-0 px-4 py-2 text-sm font-semibold rounded-lg bg-red-900/40 border border-red-700 text-red-300 hover:bg-red-800/50 transition-colors"
                >
                  🗑️ Deletar
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
