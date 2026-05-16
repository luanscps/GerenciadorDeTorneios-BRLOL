'use client'
import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const SITE_TERMS_VERSION = 'v1'

const SITE_RULES = [
  'O organizador é o único responsável pelo andamento e regras do seu torneio.',
  'Conteúdo ofensivo, discriminatório ou ilegal nos torneios resultará em suspensão imediata.',
  'O sistema BRLOL é apenas a plataforma; disputas entre times devem ser resolvidas pelo organizador.',
  'Dados falsos de partida ou manipulação de resultados resultam em ban permanente.',
  'O organizador não pode participar como jogador no próprio torneio.',
  'Torneios não finalizados após 30 dias da data de término poderão ser cancelados pelo Admin.',
  'Cada conta pode ter no máximo 2 torneios ativos simultaneamente.',
]

export default function NovoTorneiPage() {
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [step, setStep] = useState(1)
  const [limitCheck, setLimitCheck] = useState<'loading' | 'ok' | 'blocked'>('loading')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [tournamentRules, setTournamentRules] = useState('')
  const [nome, setNome]               = useState('')
  const [descricao, setDescricao]     = useState('')
  const [slug, setSlug]               = useState('')
  const [maxTeams, setMaxTeams]       = useState(8)
  const [minMembers, setMinMembers]   = useState(6)
  const [maxMembers, setMaxMembers]   = useState(10)
  const [bracketType, setBracketType] = useState('SINGLE_ELIMINATION')
  const [prizePool, setPrizePool]     = useState('')
  const [startsAt, setStartsAt]       = useState('')
  const [endsAt, setEndsAt]           = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  useEffect(() => {
    async function checkLimit() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      const { count } = await supabase
        .from('tournaments')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .neq('status', 'CANCELLED')
      setLimitCheck((count ?? 0) >= 2 ? 'blocked' : 'ok')
    }
    checkLimit()
  }, [supabase, router])

  function gerarSlug(nome: string) {
    return nome.toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { router.push('/login'); return }

      const { count } = await supabase
        .from('tournaments')
        .select('id', { count: 'exact', head: true })
        .eq('organizer_id', user.id)
        .neq('status', 'CANCELLED')

      if ((count ?? 0) >= 2) {
        setError('Você já possui 2 torneios ativos. Cancele um antes de criar outro.')
        setLoading(false)
        return
      }

      await supabase.from('site_terms_acceptance').upsert({
        profile_id: user.id,
        terms_version: SITE_TERMS_VERSION,
      }, { onConflict: 'profile_id,terms_version' })

      const finalSlug = slug.trim() || gerarSlug(nome)
      const { data: torneio, error: tErr } = await supabase
        .from('tournaments')
        .insert({
          name: nome.trim(),
          description: descricao.trim() || null,
          slug: finalSlug,
          status: 'DRAFT',
          bracket_type: bracketType,
          max_teams: maxTeams,
          min_members: minMembers,
          max_members: maxMembers,
          prize_pool: prizePool.trim() || null,
          start_date: startsAt || null,
          end_date: endsAt || null,
          rules: tournamentRules.trim(),
          organizer_id: user.id,
          created_by: user.id,
        })
        .select('id, slug')
        .single()

      if (tErr) throw new Error(tErr.message)

      // Redireciona para o painel do organizador com flag ?criado=true
      router.push(`/organizador/torneios/${torneio.id}?criado=true`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao criar torneio')
    } finally {
      setLoading(false)
    }
  }

  if (limitCheck === 'loading') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card-lol text-center py-16">
          <div className="animate-spin text-3xl mb-4">⚙️</div>
          <p className="text-gray-400">Verificando elegibilidade...</p>
        </div>
      </div>
    )
  }

  if (limitCheck === 'blocked') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card-lol text-center py-16 space-y-4">
          <p className="text-5xl">🚫</p>
          <h2 className="text-xl font-bold text-white">Limite de torneios atingido</h2>
          <p className="text-gray-400 text-sm max-w-sm mx-auto">
            Você já possui <strong className="text-[#C8A84B]">2 torneios ativos</strong>.
            Cancele ou finalize um torneio existente antes de criar outro.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <a href="/organizador" className="btn-gold px-6 py-2.5 text-sm">Ver meus torneios</a>
            <a href="/torneios" className="btn-outline-gold px-6 py-2.5 text-sm">Ver todos os torneios</a>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      <div className="flex items-center gap-2">
        {[1, 2, 3].map(s => (
          <div key={s} className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
              step === s ? 'bg-[#C8A84B] text-black'
              : step > s  ? 'bg-green-700 text-white'
              : 'bg-[#1E3A5F] text-gray-400'
            }`}>{step > s ? '✓' : s}</div>
            {s < 3 && <div className={`flex-1 h-0.5 w-12 ${step > s ? 'bg-green-700' : 'bg-[#1E3A5F]'}`} />}
          </div>
        ))}
        <div className="ml-3 text-sm text-gray-400">
          {step === 1 && 'Regras do seu torneio'}
          {step === 2 && 'Termos do site'}
          {step === 3 && 'Dados gerais'}
        </div>
      </div>

      {step === 1 && (
        <div className="card-lol space-y-4">
          <div>
            <h1 className="text-xl font-bold text-white">📜 Regras do Torneio</h1>
            <p className="text-gray-400 text-sm mt-1">
              Defina as regras que os participantes devem seguir no seu torneio.
              Elas serão exibidas publicamente na página do torneio.
            </p>
          </div>
          <textarea
            value={tournamentRules}
            onChange={e => setTournamentRules(e.target.value)}
            placeholder={`Ex:\n1. Times devem ter no mínimo 6 jogadores com conta Riot vinculada.\n2. O resultado deve ser reportado em até 30 min após a partida.\n3. Flaming ou toxicidade resultam em desclassificação...`}
            className="input-lol w-full min-h-[200px] resize-y text-sm"
            maxLength={3000}
          />
          <p className="text-gray-600 text-xs text-right">{tournamentRules.length}/3000</p>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => router.back()} className="btn-outline-gold flex-1 py-3">Cancelar</button>
            <button
              type="button"
              onClick={() => setStep(2)}
              disabled={tournamentRules.trim().length < 20}
              className="btn-gold flex-1 py-3"
            >Próximo →</button>
          </div>
          {tournamentRules.trim().length > 0 && tournamentRules.trim().length < 20 && (
            <p className="text-yellow-500 text-xs">Descreva as regras com pelo menos 20 caracteres.</p>
          )}
        </div>
      )}

      {step === 2 && (
        <div className="card-lol space-y-4">
          <div>
            <h1 className="text-xl font-bold text-white">🛡️ Termos da Plataforma BRLOL</h1>
            <p className="text-gray-400 text-sm mt-1">Ao criar um torneio, você concorda com as seguintes regras da plataforma.</p>
          </div>
          <div className="bg-[#060E1A] rounded-lg border border-[#1E3A5F] divide-y divide-[#1E3A5F]">
            {SITE_RULES.map((rule, i) => (
              <div key={i} className="flex gap-3 px-4 py-3">
                <span className="text-[#C8A84B] font-bold text-sm shrink-0">{i + 1}.</span>
                <p className="text-gray-300 text-sm">{rule}</p>
              </div>
            ))}
          </div>
          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={termsAccepted}
              onChange={e => setTermsAccepted(e.target.checked)}
              className="mt-1 accent-[#C8A84B] w-4 h-4 shrink-0"
            />
            <span className="text-gray-300 text-sm">
              Li e aceito todos os termos acima. Entendo que o descumprimento pode resultar em
              suspensão ou ban permanente da plataforma.
            </span>
          </label>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(1)} className="btn-outline-gold flex-1 py-3">← Voltar</button>
            <button
              type="button"
              onClick={() => setStep(3)}
              disabled={!termsAccepted}
              className="btn-gold flex-1 py-3"
            >Aceitar e Continuar →</button>
          </div>
        </div>
      )}

      {step === 3 && (
        <form onSubmit={handleSubmit} className="card-lol space-y-5">
          <h1 className="text-xl font-bold text-white">🏆 Dados do Torneio</h1>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Nome do Torneio <span className="text-red-400">*</span></label>
            <input
              value={nome}
              onChange={e => { setNome(e.target.value); setSlug(gerarSlug(e.target.value)) }}
              placeholder="Ex: BRLOL Summer Cup 2026"
              className="input-lol w-full"
              maxLength={80}
              required
            />
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Slug (URL) <span className="text-gray-600 text-xs">gerado automaticamente</span></label>
            <div className="flex items-center gap-2">
              <span className="text-gray-600 text-sm">/torneios/</span>
              <input
                value={slug}
                onChange={e => setSlug(gerarSlug(e.target.value))}
                placeholder="brlol-summer-cup-2026"
                className="input-lol flex-1"
                maxLength={60}
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Descrição</label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Descreva o torneio para os participantes..."
              className="input-lol w-full min-h-[80px] resize-y text-sm"
              maxLength={500}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Formato</label>
              <select value={bracketType} onChange={e => setBracketType(e.target.value)} className="input-lol w-full">
                <option value="SINGLE_ELIMINATION">Single Elimination</option>
                <option value="DOUBLE_ELIMINATION">Double Elimination</option>
                <option value="ROUND_ROBIN">Round Robin</option>
                <option value="SWISS">Suíço</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Máx. Times</label>
              <input
                type="number" min={2} max={64}
                value={maxTeams} onChange={e => setMaxTeams(+e.target.value)}
                className="input-lol w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Mín. Membros/Time</label>
              <input
                type="number" min={1} max={maxMembers}
                value={minMembers} onChange={e => setMinMembers(+e.target.value)}
                className="input-lol w-full"
              />
              <p className="text-gray-600 text-xs mt-0.5">Mínimo para inscrição válida</p>
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Máx. Membros/Time</label>
              <input
                type="number" min={minMembers} max={20}
                value={maxMembers} onChange={e => setMaxMembers(+e.target.value)}
                className="input-lol w-full"
              />
              <p className="text-gray-600 text-xs mt-0.5">Limite de jogadores</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-400 text-sm mb-1">Data de Início</label>
              <input type="datetime-local" value={startsAt} onChange={e => setStartsAt(e.target.value)} className="input-lol w-full" />
            </div>
            <div>
              <label className="block text-gray-400 text-sm mb-1">Data de Término</label>
              <input type="datetime-local" value={endsAt} onChange={e => setEndsAt(e.target.value)} className="input-lol w-full" />
            </div>
          </div>

          <div>
            <label className="block text-gray-400 text-sm mb-1">Prêmio (opcional)</label>
            <input
              value={prizePool}
              onChange={e => setPrizePool(e.target.value)}
              placeholder="Ex: R$ 500 em gift cards"
              className="input-lol w-full"
              maxLength={100}
            />
          </div>

          {error && (
            <div className="bg-red-900/30 border border-red-500/40 rounded p-3">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={() => setStep(2)} className="btn-outline-gold flex-1 py-3">← Voltar</button>
            <button
              type="submit"
              disabled={loading || !nome.trim()}
              className="btn-gold flex-1 py-3"
            >
              {loading ? 'Criando...' : '🏆 Criar Torneio'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
