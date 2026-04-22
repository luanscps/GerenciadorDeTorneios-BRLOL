import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function AdminDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) { redirect("/login"); }

  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();
  if (!profile?.is_admin) { redirect("/dashboard"); }

  const [
    { count: totalPlayers },
    { count: totalTeams },
    { count: activeT },
    { count: pendingMatches },
    { data: recentTournaments },
  ] = await Promise.all([
    supabase.from("players").select("*", { count: "exact", head: true }),
    supabase.from("teams").select("*", { count: "exact", head: true }),
    supabase.from("tournaments").select("*", { count: "exact", head: true }).eq("status", "ongoing"),
    supabase.from("matches").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("tournaments").select("id,name,slug,status").order("created_at", { ascending: false }).limit(5),
  ]);

  const stats = [
    { label: "Invocadores",      value: totalPlayers   ?? 0, icon: "&#128100;", color: "text-blue-400",       href: "/admin/jogadores" },
    { label: "Times inscritos",  value: totalTeams     ?? 0, icon: "&#128737;", color: "text-green-400",      href: "/admin/torneios"  },
    { label: "Em andamento",     value: activeT        ?? 0, icon: "&#9876;",   color: "text-[#C8A84B]",     href: "/admin/torneios"  },
    { label: "Partidas pendentes", value: pendingMatches ?? 0, icon: "&#9888;",   color: "text-red-400",      href: "/admin/partidas"  },
  ];

  const statusColor: Record<string, string> = {
    open:     "text-green-400",
    checkin:  "text-blue-400",
    ongoing:  "text-yellow-400",
    finished: "text-gray-400",
    draft:    "text-gray-500",
  };

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
            <p className={`text-3xl font-bold ` + s.color}>{s.value}</p>
            <p className="text-gray-400 text-xs mt-1">{s.label}</p>
          </Link>
        ))}
      </div>

      <div className="card-lol">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Torneios Recentes</h2>
          <Link href="/admin/torneios/criar" className="btn-gold text-sm px-3 py-1.5">
            + Novo Torneio
          </Link>
        </div>
        <div className="space-y-2">
          {recentTournaments?.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between bg-[#0A1428] rounded p-3"
            >
              <p className="text-white">{t.name}</p>
              <div className="flex items-center gap-4">
                <span className={`text-xs font-medium capitalize ` + (statusColor[t.status] ?? "text-gray-400")}>
                  {t.status}
                </span>
                <Link
                  href={`/torneios/${t.slug}`}
                  className="text-gray-500 hover:text-[#C8A84B] text-xs"
                >
                  Ver &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
