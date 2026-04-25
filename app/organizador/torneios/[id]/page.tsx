'use client'
import { useEffect, useState, useMemo } from 'react'
import { useRouter, useParams, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function EditarTorneiPage() {
  const router = useRouter()
  const params = useParams()
  const searchParams = useSearchParams()
  const supabase = useMemo(() => createClient(), [])
  const id = params.id as string

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
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

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from('tournaments').select('*').eq('id', id).single()
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
      // Leitura: starts_at/ends_at são GENERATED — OK para SELECT, proibido em UPDATE
      setStartsAt(data.start_date ? data.start_date.slice(0, 16) : '')
      setEndsAt(data.end_date ? data.end_date.slice(0, 16) : '')
      setLoading(false)
    }
    load()
  }, [id, supabase, router])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError('')
    // NOTA: starts_at e ends_at são GENERATED COLUMNS — usar start_date/end_date no UPDATE
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

  if (loading) return <div className="card-lol py-16 text-center"><p className="text-gray-400">Carregando...</p></div>

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white">✏️ Editar Torneio</h1>
        <div className="flex gap-3">
          <a href={`/organizador/torneios/${id}/inscricoes`} className="btn-outline-gold text-sm px-4 py-2">Inscrições</a>
          <a href={`/torneios/${slug || id}`} target="_blank" className="text-gray-400 hover:text-white text-sm py-2">Ver página →</a>
        </div>
      </div>

      {success && (
        <div className="bg-green-900/30 border border-green-600/40 rounded-xl px-5 py-3">
          <p className="text-green-400 text-sm">✅ Torneio salvo com sucesso!</p>
        </div>
      )}

      <form onSubmit={handleSave} className="card-lol space-y-5">
        <div><label className="block text-gray-400 text-sm mb-1">Nome</label>
          <input value={nome} onChange={e => setNome(e.target.value)} className="input-lol w-full" maxLength={80} required /></div>

        <div><label className="block text-gray-400 text-sm mb-1">Slug</label>
          <input value={slug} onChange={e => setSlug(e.target.value)} className="input-lol w-full" maxLength={60} /></div>

        <div><label className="block text-gray-400 text-sm mb-1">Status</label>
          <select value={status} onChange={e => setStatus(e.target.value)} className="input-lol w-full">
            <option value="DRAFT">Rascunho</option>
            <option value="OPEN">Inscrições Abertas</option>
            <option value="IN_PROGRESS">Em Andamento</option>
            <option value="FINISHED">Finalizado</option>
            <option value="CANCELLED">Cancelado</option>
          </select></div>

        <div><label className="block text-gray-400 text-sm mb-1">Descrição</label>
          <textarea value={descricao} onChange={e => setDescricao(e.target.value)} className="input-lol w-full min-h-[80px] resize-y text-sm" maxLength={500} /></div>

        <div><label className="block text-gray-400 text-sm mb-1">Regras do Torneio</label>
          <textarea value={rules} onChange={e => setRules(e.target.value)} className="input-lol w-full min-h-[140px] resize-y text-sm" maxLength={3000} /></div>

        <div className="grid grid-cols-2 gap-4">
          <div><label className="block text-gray-400 text-sm mb-1">Máx. Times</label>
            <input type="number" min={2} max={64} value={maxTeams} onChange={e => setMaxTeams(+e.target.value)} className="input-lol w-full" /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Mín. Membros</label>
            <input type="number" min={1} max={maxMembers} value={minMembers} onChange={e => setMinMembers(+e.target.value)} className="input-lol w-full" /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Máx. Membros</label>
            <input type="number" min={minMembers} max={20} value={maxMembers} onChange={e => setMaxMembers(+e.target.value)} className="input-lol w-full" /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Prêmio</label>
            <input value={prizePool} onChange={e => setPrizePool(e.target.value)} className="input-lol w-full" maxLength={100} /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Início</label>
            <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="input-lol w-full" /></div>
          <div><label className="block text-gray-400 text-sm mb-1">Término</label>
            <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="input-lol w-full" /></div>
        </div>

        {error && <div className="bg-red-900/30 border border-red-500/40 rounded p-3"><p className="text-red-400 text-sm">{error}</p></div>}

        <div className="flex gap-3 pt-2">
          <button type="button" onClick={() => router.push('/organizador')} className="btn-outline-gold flex-1 py-3">← Voltar</button>
          <button type="submit" disabled={saving} className="btn-gold flex-1 py-3">{saving ? 'Salvando...' : '💾 Salvar Alterações'}</button>
        </div>
      </form>
    </div>
  )
}
