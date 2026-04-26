import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import {
  profileIconUrl,
  championIconByCDragon,
  rankEmblemUrl,
  masteryIconUrl,
  masteryLevelColor,
  profileIconBorderStyle,
  championSplashUrl,
} from "@/lib/riot";

const TIER_COLORS: Record<string, string> = {
  IRON: "#8B7A6B", BRONZE: "#CD7F32", SILVER: "#A8A9AD", GOLD: "#FFD700",
  PLATINUM: "#00E5CC", EMERALD: "#50C878", DIAMOND: "#99CCFF",
  MASTER: "#9B59B6", GRANDMASTER: "#E74C3C", CHALLENGER: "#00D4FF",
};

const STATUS_BADGE: Record<string, string> = {
  PENDING:  "bg-yellow-400/10 text-yellow-400 border border-yellow-400/30",
  APPROVED: "bg-green-400/10  text-green-400  border border-green-400/30",
  REJECTED: "bg-red-400/10   text-red-400   border border-red-400/30",
};

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient();
  const params   = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [{ data: profile }, { data: openTournaments }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("tournaments")
      .select("id, name, slug, status, max_teams, starts_at")
      .eq("status", "open")
      .limit(3),
  ]);

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

  const { data: myOwnedTeams } = await supabase
    .from("teams")
    .select(`
      id, name, tag,
      inscricoes ( id, status, checked_in, checked_in_at, tournament_id,
        tournaments ( id, name, slug, status )
      )
    `)
    .eq("owner_id", user.id)
    .limit(10);

  const ownedIds = (myOwnedTeams ?? []).map((t: any) => t.id);
  const { data: myMemberTeams } = ownedIds.length > 0
    ? await supabase
        .from("inscricoes")
        .select("id, status, team_id, tournament_id, teams:team_id(id, name, tag), tournaments:tournament_id(id, name, slug, status)")
        .eq("requested_by", user.id)
        .not("team_id", "in", `(${ownedIds.join(',')})`)
        .limit(5)
    : await supabase
        .from("inscricoes")
        .select("id, status, team_id, tournament_id, teams:team_id(id, name, tag), tournaments:tournament_id(id, name, slug, status)")
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

  // ── Asset URLs ──────────────────────────────────────────────────────────────
  const profileIcon = riotAccount?.profile_icon_id
    ? await profileIconUrl(riotAccount.profile_icon_id)
    : null;

  // Estilo da moldura CSS por faixa de nível
  const borderStyle = riotAccount?.summoner_level
    ? profileIconBorderStyle(riotAccount.summoner_level)
    : null;

  const mainChampionSplash = topMasteries[0]?.champion_name
    ? championSplashUrl(topMasteries[0].champion_name, 0)
    : null;

  // Ícone por champion_id via CommunityDragon (sempre 200, sem risco de 404 por nome)
  const masteryAssets = topMasteries.map((m: any) => ({
    ...m,
    iconUrl:    championIconByCDragon(m.champion_id),
    masteryUrl: masteryIconUrl(m.mastery_level),
    masteryColor: masteryLevelColor(m.mastery_level),
  }));

  return (
    <div className="space-y-8">

      {params.error === "acesso_negado" && (
        <div className="flex items-start gap-3 bg-red-950/60 border border-red-700/50 rounded-xl px-5 py-4">
          <span className="text-red-400 text-xl shrink-0">🚫</span>
          <div>
            <p className="text-red-300 font-semibold text-sm">Acesso negado</p>
            <p className="text-red-400/80 text-sm mt-0.5">Você não tem permissão de administrador.</p>
          </div>
        </div>
      )}

      {/* ── Perfil ─────────────────────────────────────────────────────────── */}
      <div className="card-lol flex items-center gap-6 flex-wrap">

        {/* Ícone de perfil com moldura CSS animada por faixa de nível */}
        <div className="relative shrink-0" style={{ width: 96, height: 96 }}>
          {profileIcon ? (
            <>
              {/* Anel externo brilhante (moldura CSS) */}
              {borderStyle && (
                <span
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: "50%",
                    border: `3px solid ${borderStyle.color}`,
                    boxShadow: `0 0 10px 3px ${borderStyle.glow}, inset 0 0 6px 1px ${borderStyle.glow}`,
                    animation: "profile-frame-pulse 2.4s ease-in-out infinite",
                    zIndex: 10,
                    pointerEvents: "none",
                  }}
                />
              )}
              {/* Ícone de perfil Riot (DataDragon) */}
              <Image
                src={profileIcon}
                width={90} height={90}
                alt="Ícone de Perfil Riot"
                className="rounded-full"
                style={{ position: "absolute", top: 3, left: 3 }}
                unoptimized
              />
              {/* Badge de nível */}
              <span
                style={{
                  position: "absolute",
                  bottom: -6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 20,
                  background: "#0A1428",
                  border: `1px solid ${borderStyle?.color ?? "#C8A84B"}`,
                  color: borderStyle?.color ?? "#C8A84B",
                  fontSize: 10,
                  fontWeight: 700,
                  padding: "1px 6px",
                  borderRadius: 9999,
                  lineHeight: "16px",
                  whiteSpace: "nowrap",
                }}
              >
                Nv. {riotAccount?.summoner_level}
              </span>
            </>
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1E3A5F] flex items-center justify-center text-3xl">👤</div>
          )}
        </div>

        {/* Animação da moldura — injetada inline para evitar dependência de CSS global */}
        <style>{`
          @keyframes profile-frame-pulse {
            0%, 100% { opacity: 1; box-shadow: 0 0 10px 3px var(--glow), inset 0 0 6px 1px var(--glow); }
            50% { opacity: 0.7; box-shadow: 0 0 18px 6px var(--glow), inset 0 0 10px 3px var(--glow); }
          }
        `}</style>

        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-white truncate">
            {profile?.full_name ?? profile?.email}
          </h1>
          {riotAccount ? (
            <p className="text-[#C8A84B] font-medium">
              {riotAccount.game_name}
              <span className="text-gray-500">#{riotAccount.tag_line}</span>
            </p>
          ) : (
            <p className="text-gray-400 text-sm">Nenhuma conta Riot vinculada</p>
          )}
        </div>
        <Link href="/dashboard/jogador/registrar" className="btn-outline-gold text-sm text-center shrink-0">
          {riotAccount ? "🔄 Atualizar perfil Riot" : "🔗 Vincular conta Riot"}
        </Link>
      </div>

      {/* ── Conta Riot ─────────────────────────────────────────────────────── */}
      {riotAccount && (
        <div className="card-lol space-y-4">
          <h2 className="text-lg font-bold text-white">⚔️ Conta Riot Vinculada</h2>

          {/* Banner: splash art do campeão principal */}
          {mainChampionSplash && (
            <div
              className="relative h-28 rounded-xl overflow-hidden"
              style={{
                backgroundImage: `url(${mainChampionSplash})`,
                backgroundSize: "cover",
                backgroundPosition: "center 20%",
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-[#0A1428]/90 via-[#0A1428]/50 to-transparent" />
              <div className="absolute bottom-3 left-4">
                <p className="text-white font-bold text-base leading-tight">
                  {topMasteries[0].champion_name}
                </p>
                <p className="text-[#C8A84B] text-xs">Campeão Principal</p>
              </div>
            </div>
          )}

          {/* Rank cards com emblema visual maior */}
          {(rankSolo || rankFlex) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[rankSolo, rankFlex].filter(Boolean).map((r: any) => (
                <div key={r.queue_type} className="bg-[#0A1428] rounded-xl p-4 flex items-center gap-4">
                  {/* Emblema 72x72 */}
                  <div className="shrink-0 w-[72px] h-[72px] relative">
                    <Image
                      src={rankEmblemUrl(r.tier)}
                      width={72} height={72}
                      alt={r.tier}
                      title={r.tier}
                      className="object-contain"
                      unoptimized
                    />
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs uppercase tracking-wider">
                      {r.queue_type === "RANKED_SOLO_5x5" ? "Solo/Duo" : "Flex 5v5"}
                    </p>
                    <p className="font-bold text-lg leading-tight" style={{ color: TIER_COLORS[r.tier] ?? "#fff" }}>
                      {r.tier} {r.rank}
                    </p>
                    <p className="text-white font-semibold text-sm">{r.lp} LP</p>
                    <p className="text-gray-400 text-xs">
                      {r.wins}V · {r.losses}D ·{" "}
                      {r.wins + r.losses > 0
                        ? Math.round((r.wins / (r.wins + r.losses)) * 100)
                        : 0}% WR
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">Sem rank nesta temporada</p>
          )}

          {/* Top Campeões — ícone via CommunityDragon por champion_id */}
          {masteryAssets.length > 0 && (
            <div>
              <p className="text-gray-400 text-xs font-bold uppercase tracking-wider mb-3">
                Top Campeões
              </p>
              <div className="flex gap-4 flex-wrap">
                {masteryAssets.map((m: any) => (
                  <div
                    key={m.champion_id}
                    className="flex flex-col items-center gap-1"
                    title={`${m.champion_name} · Maestria ${m.mastery_level} · ${(m.mastery_points / 1000).toFixed(0)}k pts`}
                  >
                    {/* Ícone do campeão */}
                    <div className="relative w-[52px] h-[52px]">
                      <Image
                        src={m.iconUrl}
                        width={52} height={52}
                        alt={m.champion_name ?? "Campeão"}
                        className="rounded-md w-full h-full object-cover"
                        style={{ border: `2px solid ${m.masteryColor}` }}
                        unoptimized
                      />
                      {/* Nível de maestria badge canto inferior */}
                      <span
                        style={{
                          position: "absolute",
                          bottom: -4,
                          right: -4,
                          background: "#0A1428",
                          border: `1px solid ${m.masteryColor}`,
                          color: m.masteryColor,
                          fontSize: 9,
                          fontWeight: 800,
                          borderRadius: 9999,
                          padding: "0 4px",
                          lineHeight: "14px",
                        }}
                      >
                        M{m.mastery_level}
                      </span>
                    </div>
                    {/* Nome abreviado */}
                    <p className="text-[10px] text-gray-400 max-w-[52px] truncate text-center">
                      {m.champion_name}
                    </p>
                    {/* Pontos */}
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

      {/* ── Meus Times (Capitão) ───────────────────────────────────────────── */}
      <div className="card-lol">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">🛡️ Meus Times</h2>
          <Link href="/torneios" className="text-lol-gold hover:underline text-sm">+ Explorar Torneios</Link>
        </div>

        {myOwnedTeams && myOwnedTeams.length > 0 ? (
          <div className="space-y-3">
            {myOwnedTeams.map((team: any) => {
              const insc      = team.inscricoes?.[0];
              const tourn     = insc?.tournaments;
              const statusKey = insc?.status ?? "PENDING";
              return (
                <div key={team.id} className="bg-[#0A1628] rounded-lg p-3 flex items-center gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white">
                      <span className="text-[#C8A84B]">[{team.tag}]</span> {team.name}
                    </p>
                    {tourn && (
                      <p className="text-gray-400 text-xs mt-0.5">🏆 {tourn.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {insc && (
                      <span className={`text-xs px-2 py-0.5 rounded font-medium ${STATUS_BADGE[statusKey] ?? "text-gray-400"}`}>
                        {statusKey}
                      </span>
                    )}
                    {insc?.checked_in && (
                      <span className="text-xs bg-green-900/40 text-green-400 border border-green-500/30 px-2 py-0.5 rounded">
                        ✅ Check-in
                      </span>
                    )}
                    {insc?.status === "APPROVED" && !insc?.checked_in && (
                      <Link
                        href={`/dashboard/times/${team.id}/checkin`}
                        className="text-xs bg-[#C8A84B]/10 text-[#C8A84B] border border-[#C8A84B]/30 px-2 py-0.5 rounded hover:bg-[#C8A84B]/20"
                      >
                        📋 Fazer Check-in
                      </Link>
                    )}
                    <Link href={`/dashboard/times/${team.id}`} className="text-lol-gold hover:underline text-xs">
                      Gerenciar →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-gray-400 text-sm">Você ainda não criou nenhum time.</p>
        )}

        {myMemberTeams && myMemberTeams.length > 0 && (
          <div className="mt-4 pt-4 border-t border-[#1E3A5F]">
            <p className="text-gray-500 text-xs uppercase tracking-wider mb-2">Participando como membro</p>
            <div className="space-y-2">
              {myMemberTeams.map((ins: any) => (
                <div key={ins.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    <span className="text-[#C8A84B]">[{ins.teams?.tag}]</span> {ins.teams?.name}
                  </span>
                  <span className="text-gray-500 text-xs">{ins.tournaments?.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Torneios Abertos ───────────────────────────────────────────────── */}
      {openTournaments && openTournaments.length > 0 && (
        <div className="card-lol">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">🏆 Inscrições Abertas</h2>
            <Link href="/torneios" className="text-lol-gold hover:underline text-sm">Ver todos →</Link>
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
                    Inscrever →
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
