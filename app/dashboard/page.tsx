import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const [
    { data: profile },
    { data: playerData },
    { data: myTeams },
    { data: openTournaments },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase.from("players").select("*").eq("profile_id", user.id).maybeSingle(),
    supabase
      .from("inscricoes")
      .select("*, teams(id, name, tag), tournaments(id, name, slug, status)")
      .eq("profile_id", user.id)
      .limit(5),
    supabase
      .from("tournaments")
      .select("id, name, slug, status, max_teams, starts_at")
      .eq("status", "open")
      .limit(3),
  ]);

  return (
    <div className="space-y-8">
      {/* Card de perfil */}
      <div className="card-lol flex items-center gap-6 flex-wrap">
        <div className="w-20 h-20 rounded-full bg-[#1E3A5F] flex items-center justify-center text-3xl shrink-0">
          👤
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">
            {profile?.full_name ?? profile?.email}
          </h1>
          {playerData ? (
            <p className="text-gray-400">
              {playerData.summoner_name}
              {playerData.tag_line ? ` #${playerData.tag_line}` : ""}
            </p>
          ) : (
            <Link
              href="/dashboard/jogador/registrar"
              className="text-yellow-400 hover:underline text-sm"
            >
              Vincule sua conta Riot para participar
            </Link>
          )}
        </div>
        <Link
          href="/dashboard/jogador/registrar"
          className="btn-outline-gold text-sm text-center shrink-0"
        >
          {playerData ? "🔄 Atualizar perfil" : "🔗 Vincular Riot"}
        </Link>
      </div>

      {/* Meus Times / Inscricoes */}
      <div className="card-lol">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">🛡️ Meus Times</h2>
          <Link href="/torneios" className="text-lol-gold hover:underline text-sm">
            + Explorar Torneios
          </Link>
        </div>
        {myTeams && myTeams.length > 0 ? (
          <div className="space-y-3">
            {myTeams.map((ins: any) => (
              <div key={ins.id} className="bg-[#0A1628] rounded-lg p-3 flex items-center justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">
                    {ins.teams?.tag ? `[${ins.teams.tag}] ` : ""} {ins.teams?.name}
                  </p>
                  <p className="text-gray-400 text-sm">
                    {ins.tournaments?.name} &middot; {ins.role ?? "Jogador"}
                  </p>
                </div>
                {ins.tournaments?.slug && (
                  <Link href={`/torneios/${ins.tournaments.slug}`} className="text-lol-gold hover:underline text-sm shrink-0">
                    Ver torneio &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Voce ainda nao esta em nenhum time.</p>
        )}
      </div>

      {/* Torneios Abertos */}
      {openTournaments && openTournaments.length > 0 && (
        <div className="card-lol">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">🏆 Inscricoes Abertas</h2>
            <Link href="/torneios" className="text-lol-gold hover:underline text-sm">
              Ver todos &rarr;
            </Link>
          </div>
          <div className="space-y-3">
            {openTournaments.map((t: any) => (
              <div key={t.id} className="bg-[#0A1628] rounded-lg p-3 flex items-center justify-between gap-4">
                <p className="font-semibold text-white">{t.name}</p>
                <div className="flex items-center gap-4 shrink-0">
                  {t.starts_at && (
                    <span className="text-gray-400 text-sm">
                      {new Date(t.starts_at).toLocaleDateString("pt-BR")}
                    </span>
                  )}
                  <Link href={`/torneios/${t.slug}`} className="text-lol-gold hover:underline text-sm">
                    Inscrever &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
