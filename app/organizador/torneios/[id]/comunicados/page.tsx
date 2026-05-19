// app/organizador/torneios/[id]/comunicados/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect }     from 'next/navigation'
import Link             from 'next/link'
import { criarComunicado, listarComunicados } from '@/lib/actions/comunicado'

const TARGET_LABEL: Record<string, string> = {
  all:        'Todos os times',
  active:     'Times ativos',
  eliminated: 'Times eliminados',
}

const CHANNEL_ICONS: Record<string, string> = {
  email:   '📧',
  discord: '💬',
}

export default async function ComunicadosPage(
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Valida que o user é organizador ou admin (mesma lógica de todos os outros pages)
  const { data: torneio } = await supabase
    .from('tournaments')
    .select('id, name, slug, organizer_id, created_by')
    .eq('id', id)
    .single()

  if (!torneio) redirect('/organizador')

  const { data: isAdmin } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  const podeGerenciar =
    isAdmin?.is_admin === true ||
    torneio.organizer_id === user.id ||
    torneio.created_by   === user.id

  if (!podeGerenciar) redirect('/organizador')

  const { data: comunicados } = await listarComunicados(id)

  async function handleCriar(formData: FormData) {
    'use server'
    await criarComunicado(id, formData)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">

      {/* Breadcrumb */}
      <nav className="text-xs text-gray-500 flex items-center gap-2">
        <Link href="/organizador" className="hover:text-[#C8A84B] transition-colors">Meus Torneios</Link>
        <span>/</span>
        <Link href={`/organizador/torneios/${id}`} className="hover:text-[#C8A84B] transition-colors">
          {torneio.name}
        </Link>
        <span>/</span>
        <span className="text-gray-400">Comunicados</span>
      </nav>

      <h1 className="text-2xl font-black text-white">📣 Comunicados</h1>

      {/* Formulário de novo comunicado */}
      <form action={handleCriar} className="card-lol space-y-4">
        <h2 className="text-white font-bold">Novo Comunicado</h2>

        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
            Título
          </label>
          <input
            name="title"
            required
            minLength={5}
            maxLength={150}
            placeholder="Ex: Mudança de horário da Semifinal"
            className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-4 py-2 text-white text-sm
                       placeholder:text-gray-600 focus:outline-none focus:border-[#C8A84B]/60"
          />
        </div>

        <div>
          <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
            Mensagem
          </label>
          <textarea
            name="body"
            required
            minLength={10}
            maxLength={2000}
            rows={4}
            placeholder="Descreva o comunicado com clareza e objetividade..."
            className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-4 py-2 text-white text-sm
                       placeholder:text-gray-600 focus:outline-none focus:border-[#C8A84B]/60 resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
              Destino
            </label>
            <select
              name="target"
              defaultValue="all"
              className="w-full bg-[#0A1628] border border-[#1E3A5F] rounded-lg px-3 py-2 text-white text-sm
                         focus:outline-none focus:border-[#C8A84B]/60"
            >
              <option value="all">Todos os times</option>
              <option value="active">Times ativos</option>
              <option value="eliminated">Times eliminados</option>
            </select>
          </div>

          <div>
            <label className="text-gray-400 text-xs uppercase tracking-wider block mb-1">
              Canais
            </label>
            <div className="flex gap-4 mt-2">
              <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                <input type="checkbox" name="channel_email" defaultChecked className="accent-[#C8A84B]" />
                📧 Email
              </label>
              <label className="flex items-center gap-2 text-gray-300 text-sm cursor-pointer">
                <input type="checkbox" name="channel_discord" className="accent-[#C8A84B]" />
                💬 Discord
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            className="btn-gold px-6 py-2 text-sm font-bold"
          >
            Enviar Comunicado
          </button>
        </div>
      </form>

      {/* Histórico de comunicados */}
      <div className="space-y-3">
        <h2 className="text-white font-bold">Histórico ({comunicados?.length ?? 0})</h2>

        {(!comunicados || comunicados.length === 0) && (
          <div className="card-lol text-center py-8">
            <p className="text-gray-500 text-sm">Nenhum comunicado enviado ainda.</p>
          </div>
        )}

        {(comunicados ?? []).map((c: any) => (
          <div key={c.id} className="card-lol space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-white font-bold text-sm">{c.title}</p>
                <p className="text-gray-400 text-xs mt-1">{c.body}</p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[10px] text-gray-500">
                  {new Date(c.created_at).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
                </p>
                <p className="text-[10px] text-gray-600 mt-0.5">
                  {TARGET_LABEL[c.target] ?? c.target}
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              {(c.channel ?? []).map((ch: string) => (
                <span
                  key={ch}
                  className="text-[10px] bg-[#0A1628] border border-[#1E3A5F] text-gray-400 px-2 py-0.5 rounded-full"
                >
                  {CHANNEL_ICONS[ch] ?? ''} {ch}
                </span>
              ))}
            </div>
            {c.sent_by_profile && (
              <p className="text-[10px] text-gray-600">
                por {(c.sent_by_profile as any).display_name ?? (c.sent_by_profile as any).username}
              </p>
            )}
          </div>
        ))}
      </div>

      <Link href={`/organizador/torneios/${id}`} className="btn-outline-gold block text-center py-3 text-sm">
        ← Voltar ao Painel
      </Link>
    </div>
  )
}
