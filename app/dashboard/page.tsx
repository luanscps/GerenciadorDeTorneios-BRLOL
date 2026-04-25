import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";

const TIER_COLORS: Record<string, string> = {
  IRON: "#8B7A6B", BRONZE: "#CD7F32", SILVER: "#A8A9AD", GOLD: "#FFD700",
  PLATINUM: "#00E5CC", EMERALD: "#50C878", DIAMOND: "#99CCFF",
  MASTER: "#9B59B6", GRANDMASTER: "#E74C3C", CHALLENGER: "#00D4FF",
};

const DD_BASE = "https://ddragon.leagueoflegends.com/cdn/16.8.1";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient();
  const params = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Busca paralela: profile + torneios abertos
  const [{ data: profile }, { data: openTournaments }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("tournaments")
      .select("id, name, slug, status, max_teams, starts_at")
      .eq("status", "open")
      .limit(3),
  ]);

  // Busca conta Riot primária vinculada diretamente em riot_accounts
  const { data: riotAccount } = await supabase
    .from("riot_accounts")
    .select(`
      id, game_name, tag_line, summoner_level, profile_icon_id,
      rank_snapshots ( queue_type, tier, rank, lp, wins, losses ),
      champion_masteries ( champion_id, champion_name, mastery_level, mastery_points )
    `)
    .eq("profile_id", user.id)
    .eq("is_primary", true)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Busca inscrições do usuário
  const { data: myTeams } = await supabase
    .from("inscricoes")
    .select(
      "id, status, team_id, tournament_id, teams:team_id(id, name, tag), tournaments:tournament_id(id, name, slug, status)"
    )
    .eq("requested_by", user.id)
    .limit(5);

  const rankSolo = (riotAccount?.rank_snapshots as any[])?.find(
    (r: any) => r.queue_type === "RANKED_SOLO_5x5"
  );
  const rankFlex = (riotAccount?.rank_snapshots as any[])?.find(
    (r: any) => r.queue_type === "RANKED_FLEX_SR"
  );
  const topMasteries = ((riotAccount?.champion_masteries as any[]) ?? [])
    .sort((a: any, b: any) => b.mastery_points - a.mastery_points)
    .slice(0, 5);

  return (
    <div className="space-y-8">

      {/* ── Banner de Acesso Negado ── */}
      {params.error === "acesso_negado" && (
        <div className="flex items-start gap-3 bg-red-950/60 border border-red-700/50 rounded-xl px-5 py-4">
          <span className="text-red-400 text-xl shrink-0">🚫</span>
          <div>
            <p className="text-red-300 font-semibold text-sm">Acesso negado</p>
            <p className="text-red-400/80 text-sm mt-0.5">
              Você não tem permissão de administrador para acessar essa área.
            </p>
          </div>
        </div>
      )}

      {/* ── Card de Perfil ── */}
      <div className="card-lol flex items-center gap-6 flex-wrap">
        <div className="relative shrink-0">
          {riotAccount?.profile_icon_id ? (
            <Image
              src={`${DD_BASE}/img/profileicon/${riotAccount.profile_icon_id}.png`}
              width={80} height={80} alt="Profile Icon"
              className="rounded-full border-2 border-[#C8A84B]"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1E3A5F] flex items-center justify-center text-3xl">
              👤
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">
            {profile?.full_name ?? profile?.email}
          </h1>
          {riotAccount ? (
            <p className="text-[#C8A84B] font-medium">
              {riotAccount.game_name}
              <span className="text-gray-500">#{riotAccount.tag_line}</span>
              {" "}
              <span className="text-gray-400 text-sm">· Nível {riotAccount.summoner_level}</span>
            </p>
          ) : (
            <p className="text-gray-400 text-sm">
              Nenhuma conta Riot vinculada
            </p>
          )}
        </div>

        <Link
          href="/dashboard/jogador/registrar"
          className="btn-outline-gold text-sm text-center shrink-0"
        >
          {riotAccount ? "🔄 Atualizar perfil Riot" : "🔗 Vincular conta Riot"}
        </Link>
      </div>

      {/* ── Painel Riot (só aparece se conta vinculada) ── */}
      {riotAccount && (
        <div className="card-lol space-y-4">
          <h2 className="text-lg font-bold text-white">⚔️ Conta Riot Vinculada</h2>

          {/* Ranks */}
          {(rankSolo || rankFlex) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[rankSolo, rankFlex].filter(Boolean).map((r: any) => (
                <div key={r.queue_type} className="bg-[#0A1428] rounded-lg p-3">
                  <p className="text-gray-400 text-xs uppercase tracking-wider mb-1">
                    {r.queue_type === "RANKED_SOLO_5x5" ? "Solo/Duo" : "Flex 5v5"}
                  </p>
                  <p className="font-bold text-lg" style={{ color: TIER_COLORS[r.tier] ?? "#fff" }}>
                    {r.tier} {r.rank}
                  </p>
                  <p className="text-white text-sm">{r.lp} LP</p>
                  <p className="text-gray-400 text-xs">
                    {r.wins}V · {r.losses}D ·{" "}
                    {r.wins + r.losses > 0
                      ? Math.round((r.wins / (r.wins + r.losses)) * 100)
                      : 0}% WR
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Sem rank nesta temporada</p>
          )}

          {/* Top Campeões */}
          {topMasteries.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-2">Top Campeões</p>
              <div className="flex gap-3 flex-wrap">
                {topMasteries.map((m: any) => (
                  <div key={m.champion_id} className="text-center" title={m.champion_name}>
                    <Image
                      src={`${DD_BASE}/img/champion/${m.champion_name}.png`}
                      width={48} height={48} alt={m.champion_name}
                      className="rounded border border-[#1E3A5F]"
                    />
                    <p className="text-[10px] text-gray-400 mt-0.5">M{m.mastery_level}</p>
                    <p className="text-[9px] text-gray-600">
                      {(m.mastery_points / 1000).toFixed(0)}k
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Meus Times ── */}
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
                    {ins.teams?.tag ? `[${ins.teams.tag}] ` : ""}{ins.teams?.name}
                  </p>
                  <p className="text-gray-400 text-sm">{ins.tournaments?.name}</p>
                </div>
                {ins.tournaments?.slug && (
                  <Link href={`/torneios/${ins.tournaments.slug}`}
                    className="text-lol-gold hover:underline text-sm shrink-0">
                    Ver torneio &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Você ainda não está em nenhum time.</p>
        )}
      </div>

      {/* ── Torneios Abertos ── */}
      {openTournaments && openTournaments.length > 0 && (
        <div className="card-lol">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">🏆 Inscrições Abertas</h2>
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
