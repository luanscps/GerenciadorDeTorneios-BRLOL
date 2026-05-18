'use client'
import { useState, useTransition } from 'react'
import { createFase, updateFase, deleteFase, ativarFase } from '@/lib/actions/fase'
import { gerarChaveamento } from '@/lib/actions/partida'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Mapeamento do enum real bracket_type → label PT-BR
const TIPO_LABEL: Record<string, string> = {
  SINGLE_ELIMINATION: 'Eliminação Simples',
  DOUBLE_ELIMINATION: 'Eliminação Dupla',
  ROUND_ROBIN:        'Fase de Grupos (Round Robin)',
  SWISS:              'Sistema Suíço',
}

const STATUS_COLOR: Record<string, string> = {
  pending:  'text-gray-400 bg-gray-800/40 border-gray-700/40',
  active:   'text-green-400 bg-green-900/20 border-green-700/40',
  finished: 'text-blue-400 bg-blue-900/20 border-blue-700/40',
}
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', active: 'Ativa', finished: 'Finalizada',
}

export default function FasesClient({
  torneio, fases: initialFases, timesAprovados
}: { torneio: any; fases: any[]; timesAprovados: number }) {
  const router = useRouter()
  const [fases, setFases] = useState(initialFases)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  // Form state
  const [nome, setNome] = useState('')
  const [tipo, setTipo] = useState<string>('SINGLE_ELIMINATION')
  const [ordem, setOrdem] = useState(fases.length + 1)
  const [numGrupos, setNumGrupos] = useState(2)
  const [timesPorGrupo, setTimesPorGrupo] = useState(4)
  const [classificados, setClassificados] = useState(2)
  const [melhorDe, setMelhorDe] = useState(1)

  function resetForm() {
    setNome(''); setTipo('SINGLE_ELIMINATION'); setOrdem(fases.length + 1)
    setNumGrupos(2); setTimesPorGrupo(4); setClassificados(2); setMelhorDe(1)
    setEditingId(null); setShowForm(false); setError('')
  }

  function startEdit(fase: any) {
    setNome(fase.name)
    setTipo(fase.bracket_type)
    setOrdem(fase.stage_order)
    setNumGrupos(fase.num_groups ?? 2)
    setTimesPorGrupo(fase.teams_per_group ?? 4)
    setClassificados(fase.qualifiers_per_group ?? 2)
    setMelhorDe(fase.best_of ?? 1)
    setEditingId(fase.id)
    setShowForm(true)
  }

  function buildFormData() {
    const fd = new FormData()
    fd.append('nome', nome)
    fd.append('tipo', tipo)
    fd.append('ordem', String(ordem))
    fd.append('num_grupos', String(numGrupos))
    fd.append('times_por_grupo', String(timesPorGrupo))
    fd.append('classificados_por_grupo', String(classificados))
    fd.append('melhor_de', String(melhorDe))
    return fd
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(''); setSuccess('')
    const fd = buildFormData()
    startTransition(async () => {
      const res = editingId
        ? await updateFase(editingId, torneio.id, fd)
        : await createFase(torneio.id, fd)
      if (res.error) { setError(res.error); return }
      setSuccess(editingId ? 'Fase atualizada!' : 'Fase criada!')
      resetForm()
      router.refresh()
    })
  }

  async function handleDelete(faseId: string) {
    if (!confirm('Deletar esta fase? Isso também remove as partidas vinculadas.')) return
    setError('')
    startTransition(async () => {
      const res = await deleteFase(faseId, torneio.id)
      if (res.error) { setError(res.error); return }
      setSuccess('Fase removida.')
      router.refresh()
    })
  }

  async function handleAtivar(faseId: string) {
    if (!confirm('Ativar esta fase? A fase ativa atual será finalizada automaticamente.')) return
    setError('')
    startTransition(async () => {
      const res = await ativarFase(faseId, torneio.id)
      if (res.error) { setError(res.error); return }
      setSuccess('Fase ativada!')
      router.refresh()
    })
  }

  async function handleGerarChaveamento(faseId: string) {
    if (!confirm(`Gerar chaveamento automático com os ${timesAprovados} times aprovados?`)) return
    setError('')
    startTransition(async () => {
      const res = await gerarChaveamento(torneio.id, faseId)
      if (res.error) { setError(res.error); return }
      setSuccess(`Chaveamento gerado! ${(res.data as any[])?.length ?? 0} partidas criadas.`)
      router.refresh()
    })
  }

  // Tipos com chaveamento automático suportado
  const isEliminatorio = (t: string) => t === 'SINGLE_ELIMINATION' || t === 'DOUBLE_ELIMINATION' || t === 'SWISS'
  const isGrupos = (t: string) => t === 'ROUND_ROBIN'

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">🏗️ Fases — {torneio.name}</h1>
          <p className="text-gray-400 text-sm mt-0.5">
            {timesAprovados} times aprovados · {fases.length} fase{fases.length !== 1 ? 's' : ''} configurada{fases.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-3">
          <Link href={`/organizador/torneios/${torneio.id}/partidas`} className="btn-outline-gold text-sm px-4 py-2">⚔️ Partidas</Link>
          <Link href={`/organizador/torneios/${torneio.id}`} className="text-gray-400 hover:text-white text-sm py-2">← Editar Torneio</Link>
        </div>
      </div>

      {/* Alertas */}
      {error   && <div className="bg-red-900/30 border border-red-500/40 rounded-xl px-5 py-3"><p className="text-red-400 text-sm">❌ {error}</p></div>}
      {success && <div className="bg-green-900/30 border border-green-600/40 rounded-xl px-5 py-3"><p className="text-green-400 text-sm">✅ {success}</p></div>}

      {timesAprovados < 2 && (
        <div className="bg-yellow-900/20 border border-yellow-700/40 rounded-xl px-5 py-3">
          <p className="text-yellow-400 text-sm">⚠️ Você precisa ter pelo menos 2 times aprovados antes de gerar o chaveamento. Vá em{' '}
            <Link href={`/organizador/torneios/${torneio.id}/inscricoes`} className="underline">Inscrições</Link>{' '}para aprovar os times.</p>
        </div>
      )}

      {/* Lista de fases */}
      {fases.length === 0 ? (
        <div className="card-lol text-center py-16">
          <p className="text-4xl mb-3">🏗️</p>
          <p className="text-white font-bold">Nenhuma fase criada</p>
          <p className="text-gray-400 text-sm mt-1">Crie a primeira fase do torneio para organizar os confrontos.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {fases.map((fase) => (
            <div key={fase.id} className="card-lol space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500 text-xs font-bold">#{fase.stage_order}</span>
                    <p className="font-bold text-white">{fase.name}</p>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${STATUS_COLOR[fase.status] ?? STATUS_COLOR.pending}`}>
                      {STATUS_LABEL[fase.status] ?? fase.status}
                    </span>
                  </div>
                  <p className="text-gray-400 text-xs mt-1">
                    {TIPO_LABEL[fase.bracket_type] ?? fase.bracket_type}
                    {isGrupos(fase.bracket_type) && ` · ${fase.num_groups} grupos de ${fase.teams_per_group} times · ${fase.qualifiers_per_group} classificados/grupo`}
                    {` · Melhor de ${fase.best_of}`}
                  </p>
                </div>
                <div className="flex gap-2 flex-shrink-0">
                  {fase.status === 'pending' && (
                    <button onClick={() => handleAtivar(fase.id)} disabled={isPending}
                      className="btn-gold text-xs px-3 py-1.5">▶ Ativar</button>
                  )}
                  {isEliminatorio(fase.bracket_type) && fase.status === 'active' && timesAprovados >= 2 && (
                    <button onClick={() => handleGerarChaveamento(fase.id)} disabled={isPending}
                      className="bg-blue-900/40 hover:bg-blue-800/50 text-blue-300 border border-blue-700/40 rounded-lg text-xs px-3 py-1.5 transition-colors">
                      🎲 Gerar Chave
                    </button>
                  )}
                  <button onClick={() => startEdit(fase)} disabled={isPending}
                    className="btn-outline-gold text-xs px-3 py-1.5">✏️ Editar</button>
                  {fase.status === 'pending' && (
                    <button onClick={() => handleDelete(fase.id)} disabled={isPending}
                      className="bg-red-900/30 hover:bg-red-800/40 text-red-400 border border-red-700/40 rounded-lg text-xs px-3 py-1.5 transition-colors">🗑</button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!showForm && (
        <button onClick={() => { setShowForm(true); setOrdem(fases.length + 1) }}
          className="btn-gold w-full py-3">+ Nova Fase</button>
      )}

      {showForm && (
        <form onSubmit={handleSubmit} className="card-lol space-y-5">
          <h2 className="text-white font-bold">{editingId ? '✏️ Editar Fase' : '➕ Nova Fase'}</h2>

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-gray-400 text-sm mb-1">Nome da fase</label>
              <input value={nome} onChange={e => setNome(e.target.value)} className="input-lol w-full"
                placeholder="Ex: Fase de Grupos, Quartas de Final..." required maxLength={80} />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Tipo</label>
              <select value={tipo} onChange={e => setTipo(e.target.value)} className="input-lol w-full">
                <option value="SINGLE_ELIMINATION">Eliminação Simples</option>
                <option value="DOUBLE_ELIMINATION">Eliminação Dupla</option>
                <option value="ROUND_ROBIN">Fase de Grupos (Round Robin)</option>
                <option value="SWISS">Sistema Suíço</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Ordem</label>
              <input type="number" min={1} max={20} value={ordem}
                onChange={e => setOrdem(+e.target.value)} className="input-lol w-full" required />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Melhor de</label>
              <select value={melhorDe} onChange={e => setMelhorDe(+e.target.value)} className="input-lol w-full">
                <option value={1}>MD1 (1 jogo)</option>
                <option value={3}>MD3 (melhor de 3)</option>
                <option value={5}>MD5 (melhor de 5)</option>
              </select>
            </div>
            {isGrupos(tipo) && (
              <>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Nº de grupos</label>
                  <input type="number" min={1} max={16} value={numGrupos}
                    onChange={e => setNumGrupos(+e.target.value)} className="input-lol w-full" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Times por grupo</label>
                  <input type="number" min={2} max={16} value={timesPorGrupo}
                    onChange={e => setTimesPorGrupo(+e.target.value)} className="input-lol w-full" />
                </div>
                <div>
                  <label className="block text-gray-400 text-sm mb-1">Classificados/grupo</label>
                  <input type="number" min={1} max={8} value={classificados}
                    onChange={e => setClassificados(+e.target.value)} className="input-lol w-full" />
                </div>
              </>
            )}
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={resetForm} className="btn-outline-gold flex-1 py-3">Cancelar</button>
            <button type="submit" disabled={isPending} className="btn-gold flex-1 py-3">
              {isPending ? 'Salvando...' : editingId ? '💾 Atualizar Fase' : '➕ Criar Fase'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
