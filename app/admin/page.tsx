import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import Link from "next/link";

const STATUS_COLOR: Record<string, string> = {
  REGISTRATION: "text-green-400",
  ACTIVE:       "text-yellow-400",
  FINISHED:     "text-gray-400",
  DRAFT:        "text-gray-500",
  // legados
  OPEN:         "text-green-400",
  CHECKIN:      "text-blue-400",
  IN_PROGRESS:  "text-yellow-400",
};

const STATUS_LABEL: Record<string, string> = {
  REGISTRATION: "Inscrições abertas",
  ACTIVE:       "Em andamento",
  FINISHED:     "Finalizado",
  DRAFT:        "Rascunho",
  // legados
  OPEN:         "Aberto",
  CHECKIN:      "Check-in",
  IN_PROGRESS:  "Em andamento",
};

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) redirect("/dashboard");

  const adminClient = createAdminClient();

  const [
    { count: totalPlayers },
    { count: totalTeams },
    { count: activeT },
    { count: pendingMatches },
    { data: recentTournaments },
  ] = await Promise.all([
    adminClient.from("players").select("*", { count: "exact", head: true }),
    adminClient.from("teams").select("*",   { count: "exact", head: true }),
    // status real do banco: ACTIVE (era IN_PROGRESS)
    adminClient.from("tournaments").select("*", { count: "exact", head: true }).eq("status", "ACTIVE"),
    adminClient.from("matches").select("*",     { count: "exact", head: true }).eq("status", "pending"),
    adminClient
      .from("tournaments")
      .select("id, name, slug, status")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const stats = [
    { label: "Invocadores",        value: totalPlayers   ?? 0, icon: "&#128100;", color: "text-blue-400",  href: "/admin/jogadores"   },
    { label: "Times inscritos",    value: totalTeams     ?? 0, icon: "&#128737;", color: "text-green-400", href: "/admin/tournaments" },
    { label: "Em andamento",       value: activeT        ?? 0, icon: "&#9876;",   color: "text-[#C8A84B]", href: "/admin/tournaments" },
    { label: "Partidas pendentes", value: pendingMatches ?? 0, icon: "&#9888;",   color: "text-red-400",   href: "/admin/tournaments" },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-white">Dashboard Admin</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            className="card-lol text-center hover:border-[#C8A84B]/40 transition-colors"
          >
            <p className="text-3xl mb-2" dangerouslySetInnerHTML={{ __html: s.icon }} />
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="card-lol">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Torneios Recentes</h2>
          <Link href="/admin/tournaments/criar" className="btn-gold text-sm px-3 py-1.5">
            + Novo Torneio
          </Link>
        </div>
        <div className="space-y-2">
          {recentTournaments?.map((t) => (
            <div key={t.id} className="flex items-center justify-between bg-[#0A1428] rounded p-3">
              <span className="text-white text-sm font-medium">{t.name}</span>
              <div className="flex items-center gap-3">
                <span className={`text-xs ${STATUS_COLOR[t.status] ?? "text-gray-400"}`}>
                  {STATUS_LABEL[t.status] ?? t.status}
                </span>
                <Link
                  href={`/admin/tournaments/${t.id}`}
                  className="text-xs text-[#C8A84B] hover:underline"
                >
                  Gerenciar →
                </Link>
              </div>
            </div>
          ))}
          {!recentTournaments?.length && (
            <p className="text-gray-500 text-sm">Nenhum torneio criado ainda.</p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/admin/jogadores" className="card-lol hover:border-[#C8A84B]/30 transition-colors">
          <p className="text-[#C8A84B] font-semibold mb-1">👤 Jogadores</p>
          <p className="text-gray-400 text-sm">Gerenciar invocadores e contas Riot</p>
        </Link>
        <Link href="/admin/usuarios" className="card-lol hover:border-[#C8A84B]/30 transition-colors">
          <p className="text-[#C8A84B] font-semibold mb-1">🔒 Usuários</p>
          <p className="text-gray-400 text-sm">Permissões, ban e perfis de acesso</p>
        </Link>
        <Link href="/admin/audit" className="card-lol hover:border-[#C8A84B]/30 transition-colors">
          <p className="text-[#C8A84B] font-semibold mb-1">📋 Auditoria</p>
          <p className="text-gray-400 text-sm">Log de ações administrativas</p>
        </Link>
      </div>
    </div>
  );
}
