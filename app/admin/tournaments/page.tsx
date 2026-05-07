// FORCE-DYNAMIC: nunca cachear — dados de torneios devem ser sempre frescos
export const dynamic = 'force-dynamic';
export const revalidate = 0;

import { createAdminClient } from "@/lib/supabase/admin";
import Link from "next/link";

// Valores de status confirmados no banco: REGISTRATION, ACTIVE, FINISHED, DRAFT
const STATUS_COLOR: Record<string, string> = {
  REGISTRATION: "bg-green-500/10 text-green-400 border border-green-500/20",
  ACTIVE:       "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  FINISHED:     "bg-gray-500/10 text-gray-400 border border-gray-500/20",
  DRAFT:        "bg-gray-700/20 text-gray-500 border border-gray-700/30",
};

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION: "Inscrições abertas",
  ACTIVE:       "Em andamento",
  FINISHED:     "Finalizado",
  DRAFT:        "Rascunho",
};

// Auth guard já está no app/admin/layout.tsx — não repetir aqui
export default async function AdminTorneios() {
  const adminClient = createAdminClient();

  const [
    { data: torneios, error: torneiosError },
    { data: regRows,  error: regError },
  ] = await Promise.all([
    adminClient
      .from("tournaments")
      // Colunas confirmadas via information_schema em 2026-05-07
      // Removidos: game_mode, format (não existem no banco)
      // bracket_type é USER-DEFINED enum (substitui 'format')
      .select("id, name, slug, status, start_date, starts_at, registration_deadline, max_teams, bracket_type, prize_pool, created_at")
      .order("created_at", { ascending: false }),
    adminClient
      .from("inscricoes")
      .select("tournament_id"),
  ]);

  // Log de diagnóstico — aparece nos Function Logs da Vercel
  console.log('[admin/tournaments] torneios:', torneios?.length ?? 0, '| error:', torneiosError?.message ?? 'none');
  if (torneiosError) console.error("[admin/tournaments] ERRO torneios:", torneiosError);
  if (regError)      console.error("[admin/tournaments] ERRO inscricoes:", regError);

  const countMap: Record<string, number> = {};
  for (const r of regRows ?? []) {
    countMap[r.tournament_id] = (countMap[r.tournament_id] ?? 0) + 1;
  }

  const list        = torneios ?? [];
  const abertos     = list.filter(t => t.status === "REGISTRATION");
  const andamento   = list.filter(t => t.status === "ACTIVE");
  const finalizados = list.filter(t => t.status === "FINISHED");
  const rascunhos   = list.filter(t => t.status === "DRAFT");

  function TorneioRow({ t }: { t: any }) {
    const inscritos  = countMap[t.id] ?? 0;
    // start_date ou starts_at (banco tem ambos)
    const dataInicio = t.starts_at ?? t.start_date;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0A1428] rounded-lg p-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium truncate">{t.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? "bg-gray-700/20 text-gray-400 border border-gray-700/30"}`}>
              {STATUS_LABEL[t.status] ?? t.status}
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
            {dataInicio && (
              <span>📅 {new Date(dataInicio).toLocaleDateString("pt-BR")}</span>
            )}
            <span>👥 {inscritos}{t.max_teams ? `/${t.max_teams}` : ""} times</span>
            {t.bracket_type && <span>🏆 {t.bracket_type}</span>}
            {t.prize_pool   && <span>💰 {t.prize_pool}</span>}
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <Link
            href={`/torneios/${t.slug}`}
            className="text-xs text-gray-400 hover:text-white border border-gray-700 rounded px-3 py-1.5 transition-colors"
            target="_blank"
          >
            Ver página
          </Link>
          <Link
            href={`/admin/tournaments/${t.id}`}
            className="text-xs text-[#C8A84B] hover:text-white border border-[#C8A84B]/30 hover:border-[#C8A84B] rounded px-3 py-1.5 transition-colors"
          >
            Gerenciar →
          </Link>
        </div>
      </div>
    );
  }

  function Section({ title, color, items }: { title: string; color: string; items: any[] }) {
    if (items.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className={`text-sm font-bold ${color} mb-3`}>{title} ({items.length})</h2>
        {items.map(t => <TorneioRow key={t.id} t={t} />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciar Torneios</h1>
          <p className="text-gray-400 text-sm mt-1">Total: {list.length} torneio{list.length !== 1 ? 's' : ''}</p>
        </div>
        <Link href="/admin/tournaments/criar" className="btn-gold text-sm px-4 py-2">
          + Novo Torneio
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Inscrições abertas", value: abertos.length,     color: "text-green-400"  },
          { label: "Em andamento",       value: andamento.length,   color: "text-yellow-400" },
          { label: "Finalizados",        value: finalizados.length, color: "text-gray-400"   },
          { label: "Rascunhos",          value: rascunhos.length,   color: "text-gray-500"   },
        ].map(s => (
          <div key={s.label} className="card-lol text-center py-4">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card-lol text-center py-16">
          <p className="text-4xl mb-4">🏆</p>
          <p className="text-white font-semibold mb-2">Nenhum torneio criado ainda</p>
          <p className="text-gray-400 text-sm mb-4">Verifique os logs da Vercel se esperava ver torneios aqui.</p>
          <Link href="/admin/tournaments/criar" className="btn-gold mt-4 inline-block">Criar primeiro torneio</Link>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="🟢 Inscrições abertas" color="text-green-400"  items={abertos} />
          <Section title="🟡 Em andamento"       color="text-yellow-400" items={andamento} />
          <Section title="⚫ Rascunhos"           color="text-gray-500"  items={rascunhos} />
          <Section title="✅ Finalizados"         color="text-gray-400"  items={finalizados} />
        </div>
      )}
    </div>
  );
}
