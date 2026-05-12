import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  profileIconUrl,
  championIconByCDragon,
  masteryIconUrl,
  masteryLevelColor,
  profileIconBorderStyle,
  championSplashUrl,
  getAllChampions,
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

function rankEmblemMiniUrl(tier: string): string {
  return `https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/ranked-mini-crests/${tier.toLowerCase()}.png`;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>
}) {
  const supabase = await createClient();
  const params   = await searchParams;

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [
    { data: profile },
    { data: openTournaments },
    { data: riotAccount },
    { data: myOwnedTeams },
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).single(),
    supabase
      .from("tournaments")
      .select("id, name, slug, status, max_teams, starts_at")
      .eq("status", "open")
      .limit(3),
    supabase
      .from("riot_accounts")
      .select(
        `
      id, game_name, tag_line, summoner_level, profile_icon_id,
      rank_snapshots ( queue_type, tier, rank, lp, wins, losses ),
      champion_masteries ( champion_id, champion_name, mastery_level, mastery_points )
    `
      )
      .eq("profile_id", user.id)
      .eq("is_primary", true)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("teams")
      .select(
        `
      id, name, tag,
      inscricoes ( id, status, checked_in, checked_in_at, tournament_id,
        tournaments ( id, name, slug, status )
      )
    `
      )
      .eq("owner_id", user.id)
      .limit(10),
  ]);

  const ownedIds = (myOwnedTeams ?? []).map((t: any) => t.id);
  
  const { data: myMemberTeams } = await supabase
    .from("team_members")
    .select(
      `
      id,
      teams ( id, name, tag ),
      inscricoes ( id, status, checked_in, checked_in_at, tournament_id,
        tournaments ( id, name, slug, status )
      )
      `
    )
    .eq("profile_id", user.id)
    .eq("status", "accepted")
    .not("team_id", "in", `(${ownedIds.join(",")})`)
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

  let champById: Record<number, string> = {};
  if (topMasteries.length > 0) {
    try {
      const all = await getAllChampions();
      for (const c of Object.values(all)) {
        champById[Number(c.key)] = c.name;
      }
    } catch { /* fallback: usa champion_name do banco */ }
  }

  const profileIcon = riotAccount?.profile_icon_id
    ? await profileIconUrl(riotAccount.profile_icon_id)
    : null;

  // borderStyle vem de lib/riot — contém .color, .glow e .boxShadow
  const borderStyle = riotAccount?.summoner_level
    ? profileIconBorderStyle(riotAccount.summoner_level)
    : null;

  const mainChampDisplayName = topMasteries[0]
    ? (champById[topMasteries[0].champion_id] ?? topMasteries[0].champion_name ?? null)
    : null;

  const mainChampionSplash = mainChampDisplayName
    ? championSplashUrl(mainChampDisplayName, 0)
    : null;

  const masteryAssets = topMasteries.map((m: any) => {
    const displayName = champById[m.champion_id] ?? m.champion_name ?? `#${m.champion_id}`;
    return {
      ...m,
      displayName,
      iconUrl:      championIconByCDragon(m.champion_id),
      masteryUrl:   masteryIconUrl(m.mastery_level),
      masteryColor: masteryLevelColor(m.mastery_level),
    };
  });

  return (
    <div className="space-y-8">

      <style>{`
        @keyframes profile-glow-pulse {
          0%, 100% { box-shadow: 0 0 0 4px var(--border-color), 0 0 12px 2px var(--glow-color); }
          50%       { box-shadow: 0 0 0 4px var(--border-color), 0 0 22px 6px var(--glow-color); }
        }
        .profile-icon-ring {
          animation: profile-glow-pulse 2.6s ease-in-out infinite;
        }
      `}</style>

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

        {/* ── Ícone de perfil com anel/moldura via CSS glow ─────────────── */}
        <div style={{ position: "relative", width: 96, height: 112, flexShrink: 0 }}>
          {profileIcon ? (
            <>
              {/* Ícone circular com ring colorido baseado no nível — sem imagem externa */}
              <img
                src={profileIcon}
                width={80}
                height={80}
                alt="Ícone de Perfil Riot"
                className={borderStyle ? "profile-icon-ring" : ""}
                style={{
                  position: "absolute",
                  top: 8, left: 8,
                  width: 80, height: 80,
                  borderRadius: "50%",
                  display: "block",
                  zIndex: 1,
                  ["--border-color" as string]: borderStyle?.color ?? "#C8A84B",
                  ["--glow-color" as string]:   borderStyle?.glow  ?? "rgba(200,168,75,0.5)",
                } as React.CSSProperties}
              />

              {/* Badge de nível */}
              <span
                style={{
                  position: "absolute",
                  bottom: 0, left: "50%",
                  transform: "translateX(-50%)",
                  zIndex: 3,
                  background: "#0A1428",
                  border: `1.5px solid ${borderStyle?.color ?? "#C8A84B"}`,
                  color: borderStyle?.color ?? "#C8A84B",
                  fontSize: 11, fontWeight: 700,
                  padding: "2px 9px",
                  borderRadius: 9999,
                  lineHeight: "16px",
                  whiteSpace: "nowrap",
                  boxShadow: `0 0 8px ${borderStyle?.glow ?? "rgba(200,168,75,0.4)"}`,
                }}
              >
                Nv. {riotAccount?.summoner_level}
              </span>
            </>
          ) : (
            <div className="w-20 h-20 rounded-full bg-[#1E3A5F] flex items-center justify-center text-3xl">👤</div>
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
                  {mainChampDisplayName}
                </p>
                <p className="text-[#C8A84B] text-xs">Campeão Principal</p>
              </div>
            </div>
          )}

          {(rankSolo || rankFlex) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[rankSolo, rankFlex].filter(Boolean).map((r: any) => (
                <div key={r.queue_type} className="bg-[#0A1428] rounded-xl p-4 flex items-center gap-4">
                  <div style={{
                    width: 72, height: 72, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    overflow: "hidden",
                  }}>
                    <img
                      src={rankEmblemMiniUrl(r.tier)}
                      alt={r.tier}
                      title={r.tier}
                      width={72}
                      height={72}
                      style={{ display: "block", width: 72, height: 72, objectFit: "contain" }}
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

          {/* Top Campeões */}
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
                    title={`${m.displayName} · Maestria ${m.mastery_level} · ${(m.mastery_points / 1000).toFixed(0)}k pts`}
                  >
                    <div style={{ position: "relative", width: 56, height: 56, flexShrink: 0 }}>
                      <img
                        src={m.iconUrl}
                        width={56}
                        height={56}
                        alt={m.displayName}
                        style={{
                          width: 56, height: 56,
                          borderRadius: 6,
                          objectFit: "cover",
                          display: "block",
                          border: `2px solid ${m.masteryColor}`,
                        }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          bottom: -5, right: -5,
                          background: "#0A1428",
                          border: `1px solid ${m.masteryColor}`,
                          color: m.masteryColor,
                          fontSize: 10, fontWeight: 800,
                          borderRadius: 9999,
                          padding: "0 5px",
                          lineHeight: "16px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        M{m.mastery_level}
                      </span>
                    </div>

                    <p style={{
                      fontSize: 12,
                      color: "#d1d5db",
                      maxWidth: 68,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      textAlign: "center",
                      marginTop: 6,
                      lineHeight: 1.2,
                    }}>
                      {m.displayName}
                    </p>

                    <p style={{
                      fontSize: 11,
                      color: m.masteryColor,
                      fontWeight: 700,
                      textAlign: "center",
                    }}>
                      {m.mastery_points >= 1_000_000
                        ? `${(m.mastery_points / 1_000_000).toFixed(1)}M`
                        : m.mastery_points >= 1000
                        ? `${(m.mastery_points / 1000).toFixed(0)}k`
                        : m.mastery_points}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Meus Times ─────────────────────────────────────────────────────────── */}
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
              {myMemberTeams.map((member: any) => (
                <div key={member.id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-300">
                    <span className="text-[#C8A84B]">[{member.teams?.tag}]</span> {member.teams?.name}
                  </span>
                  <span className="text-gray-500 text-xs">{member.inscricoes?.[0]?.tournaments?.name}</span>
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
