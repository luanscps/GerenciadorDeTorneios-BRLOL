import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  REGISTRATION: "bg-green-500/10 text-green-400 border border-green-500/20",
  ACTIVE:       "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  FINISHED:     "bg-gray-500/10 text-gray-400 border border-gray-500/20",
  DRAFT:        "bg-gray-700/20 text-gray-500 border border-gray-700/30",
  // legados — mantidos para compatibilidade com dados antigos
  OPEN:         "bg-green-500/10 text-green-400 border border-green-500/20",
  IN_PROGRESS:  "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
  CHECKIN:      "bg-blue-500/10 text-blue-400 border border-blue-500/20",
};

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION: "Inscrições abertas",
  ACTIVE:       "Em andamento",
  FINISHED:     "Finalizado",
  DRAFT:        "Rascunho",
  // legados
  OPEN:         "Aberto",
  IN_PROGRESS:  "Em andamento",
  CHECKIN:      "Check-in",
};

export default async function AdminTorneios() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  const admin = createAdminClient();

  const { data: torneios } = await admin
    .from("tournaments")
    .select("id, name, slug, status, start_date, max_teams, game_mode, format, created_at")
    .order("created_at", { ascending: false });

  // tabela correta: inscricoes (nao tournament_registrations)
  const { data: regRows } = await admin
    .from("inscricoes")
    .select("tournament_id");

  const countMap: Record<string, number> = {};
  for (const r of regRows ?? []) {
    countMap[r.tournament_id] = (countMap[r.tournament_id] ?? 0) + 1;
  }

  const list        = torneios ?? [];
  const abertos     = list.filter(t => t.status === "REGISTRATION" || t.status === "OPEN");
  const andamento   = list.filter(t => t.status === "ACTIVE" || t.status === "IN_PROGRESS" || t.status === "CHECKIN");
  const finalizados = list.filter(t => t.status === "FINISHED");
  const rascunhos   = list.filter(t => t.status === "DRAFT");

  function TorneioRow({ t }: { t: any }) {
    const inscritos = countMap[t.id] ?? 0;
    return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-[#0A1428] rounded-lg p-4 gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-white font-medium truncate">{t.name}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLOR[t.status] ?? "text-gray-400"}`}>
              {STATUS_LABEL[t.status] ?? t.status}
            </span>
          </div>
          <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
            {t.start_date && <span>📅 {new Date(t.start_date).toLocaleDateString("pt-BR")}</span>}
            <span>👥 {inscritos}{t.max_teams ? `/${t.max_teams}` : ""} times</span>
            {t.format    && <span>🏆 {t.format}</span>}
            {t.game_mode && <span>🎮 {t.game_mode}</span>}
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

  function Section({ title, color, list }: { title: string; color: string; list: any[] }) {
    if (list.length === 0) return null;
    return (
      <div className="space-y-2">
        <h2 className={`text-sm font-bold ${color} mb-3`}>{title} ({list.length})</h2>
        {list.map(t => <TorneioRow key={t.id} t={t} />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Gerenciar Torneios</h1>
          <p className="text-gray-400 text-sm mt-1">Total: {list.length} torneios</p>
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
          <Link href="/admin/tournaments/criar" className="btn-gold mt-4 inline-block">Criar primeiro torneio</Link>
        </div>
      ) : (
        <div className="space-y-8">
          <Section title="🟢 Inscrições abertas" color="text-green-400"  list={abertos} />
          <Section title="🟡 Em andamento"      color="text-yellow-400" list={andamento} />
          <Section title="⚫ Rascunhos"           color="text-gray-500"  list={rascunhos} />
          <Section title="✅ Finalizados"         color="text-gray-400"  list={finalizados} />
        </div>
      )}
    </div>
  );
}
