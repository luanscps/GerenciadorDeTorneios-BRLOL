import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DDRAGON = "14.24.1";

const TIER_HEX: Record<string, string> = {
  CHALLENGER:  "#F4C874",
  GRANDMASTER: "#CD4545",
  MASTER:      "#9D48E0",
  DIAMOND:     "#576BCE",
  EMERALD:     "#2AC56F",
  PLATINUM:    "#00B2A9",
  GOLD:        "#C8A84B",
  SILVER:      "#A8A9AD",
  BRONZE:      "#CD7F32",
  IRON:        "#8B8B8B",
  UNRANKED:    "#4B5563",
};

const TIER_EMBLEM: Record<string, string> = {
  CHALLENGER:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-challenger.png",
  GRANDMASTER:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-grandmaster.png",
  MASTER:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-master.png",
  DIAMOND:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-diamond.png",
  EMERALD:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-emerald.png",
  PLATINUM:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-platinum.png",
  GOLD:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-gold.png",
  SILVER:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-silver.png",
  BRONZE:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-bronze.png",
  IRON:
    "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-iron.png",
};

const ROLE_ORDER: Record<string, number> = {
  TOP: 0, JUNGLE: 1, MID: 2, ADC: 3, SUPPORT: 4,
};
const ROLE_LABELS: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Suporte",
};
const ROLE_ICON_URL: Record<string, string> = {
  TOP:     "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-top.svg",
  JUNGLE:  "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-jungle.svg",
  MID:     "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-middle.svg",
  ADC:     "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-bottom.svg",
  SUPPORT: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champ-select/global/default/svg/position-utility.svg",
};

// ── TierBadge ──────────────────────────────────────────────────────────────
function TierBadge({ tier, rank, lp }: { tier?: string | null; rank?: string | null; lp?: number | null }) {
  const t = (tier ?? "UNRANKED").toUpperCase();
  const color = TIER_HEX[t] ?? TIER_HEX.UNRANKED;
  const emblem = TIER_EMBLEM[t];
  const label = t === "UNRANKED" ? "Unranked" : `${t} ${rank ?? ""}`.trim();
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full border"
      style={{ color, borderColor: `${color}40`, background: `${color}12` }}
    >
      {emblem && (
        <img src={emblem} alt={t} width={14} height={14} loading="lazy" style={{ filter: "drop-shadow(0 0 2px currentColor)" }} />
      )}
      {label}
      {lp != null && lp > 0 && (
        <span className="opacity-70 font-normal">· {lp} LP</span>
      )}
    </span>
  );
}

// ── PlayerAvatar ───────────────────────────────────────────────────────────
function PlayerAvatar({ iconId, name, size = 44 }: { iconId?: number | null; name: string; size?: number }) {
  const url = iconId
    ? `https://ddragon.leagueoflegends.com/cdn/${DDRAGON}/img/profileicon/${iconId}.png`
    : null;
  return url ? (
    <img src={url} alt={name} width={size} height={size} loading="lazy"
      className="rounded-full object-cover flex-shrink-0"
      style={{ width: size, height: size, border: "2px solid rgba(200,168,75,0.3)" }} />
  ) : (
    <div className="rounded-full bg-[#0A1428] flex items-center justify-center text-lg flex-shrink-0"
      style={{ width: size, height: size, border: "2px solid #1E3A5F" }}>
      🎮
    </div>
  );
}

// ── StatPill ───────────────────────────────────────────────────────────────
function StatPill({
  value, label, color = "#ffffff",
}: { value: string | number; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-3">
      <span className="font-black text-2xl tabular-nums leading-none" style={{ color }}>
        {value}
      </span>
      <span className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{label}</span>
    </div>
  );
}

// ── UUID v4 regex — FIX 1: regex correta, exige formato xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx ──
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

// ── Main Page ──────────────────────────────────────────────────────────────
export default async function TimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  // FIX 1: UUID regex estrita (não aceita apenas 36 chars com hífens)
  const isUUID = UUID_REGEX.test(slug);
  const { data: team } = isUUID
    ? await admin.from("teams").select("*").eq("id", slug).single()
    : await admin.from("teams").select("*").eq("slug", slug).single();

  if (!team) notFound();

  // ── FIX 2: busca roster via team_members → profiles → riot_accounts ───
  // A tabela correta é team_members (relação profile_id → riot_accounts)
  // e não players.eq("team_id") que estava errada e retornava vazio.
  const { data: members } = await admin
    .from("team_members")
    .select(`
      id,
      role,
      profile:profiles!team_members_profile_id_fkey(
        id,
        riot_accounts!riot_accounts_profile_id_fkey(
          puuid,
          game_name,
          tag_line,
          profile_icon_id,
          tier,
          rank,
          lp,
          wins,
          losses,
          summoner_level
        )
      )
    `)
    .eq("team_id", team.id);

  // Normaliza a estrutura para facilitar o render
  type PlayerRow = {
    id: string;
    role: string | null;
    summoner_name: string;
    tag_line: string;          // FIX 3: vem de riot_accounts.tag_line (sem undefined)
    profile_icon_id: number | null; // FIX 3: nome correto da coluna
    tier: string | null;
    rank: string | null;
    lp: number | null;
    wins: number | null;
    losses: number | null;
    summoner_level: number | null;
  };

  const players: PlayerRow[] = (members ?? [])
    .map((m: any) => {
      const ra = m.profile?.riot_accounts?.[0] ?? null;
      return {
        id:               m.id,
        role:             m.role ?? null,
        summoner_name:    ra?.game_name ?? "—",
        // FIX 4: tag_line normalizado — remove "#" se existir, trata undefined/null
        tag_line:         ra?.tag_line ? String(ra.tag_line).replace(/^#/, "") : "",
        profile_icon_id:  ra?.profile_icon_id ?? null,   // FIX 3: coluna correta
        tier:             ra?.tier ?? null,
        rank:             ra?.rank ?? null,
        lp:               ra?.lp ?? null,
        wins:             ra?.wins ?? null,
        losses:           ra?.losses ?? null,
        summoner_level:   ra?.summoner_level ?? null,
      };
    })
    .filter((p: PlayerRow) => p.summoner_name !== "—"); // remove membros sem conta Riot

  const sortedPlayers = players.sort(
    (a, b) => (ROLE_ORDER[a.role ?? ""] ?? 99) - (ROLE_ORDER[b.role ?? ""] ?? 99),
  );

  // ── Partidas ──────────────────────────────────────────────────────────
  const [{ data: matchesA }, { data: matchesB }] = await Promise.all([
    admin
      .from("matches")
      .select(`id,round,status,score_a,score_b,scheduled_at,played_at,winner_id,team_a_id,team_b_id,
        team_b:teams!matches_team_b_id_fkey(id,name,tag,logo_url),
        tournament:tournaments!matches_tournament_id_fkey(id,name,slug)`)
      .eq("team_a_id", team.id)
      .in("status", ["FINISHED", "IN_PROGRESS", "SCHEDULED"])
      .order("scheduled_at", { ascending: false })
      .limit(30),
    admin
      .from("matches")
      .select(`id,round,status,score_a,score_b,scheduled_at,played_at,winner_id,team_a_id,team_b_id,
        team_a:teams!matches_team_a_id_fkey(id,name,tag,logo_url),
        tournament:tournaments!matches_tournament_id_fkey(id,name,slug)`)
      .eq("team_b_id", team.id)
      .in("status", ["FINISHED", "IN_PROGRESS", "SCHEDULED"])
      .order("scheduled_at", { ascending: false })
      .limit(30),
  ]);

  const allMatches = [
    ...(matchesA ?? []).map((m) => ({ ...m, side: "A" as const })),
    ...(matchesB ?? []).map((m) => ({ ...m, side: "B" as const })),
  ].sort(
    (a, b) =>
      new Date(b.scheduled_at ?? b.played_at ?? 0).getTime() -
      new Date(a.scheduled_at ?? a.played_at ?? 0).getTime(),
  );

  const wins   = allMatches.filter((m) => m.status === "FINISHED" && m.winner_id === team.id).length;
  const losses = allMatches.filter((m) => m.status === "FINISHED" && m.winner_id && m.winner_id !== team.id).length;
  const total  = wins + losses;
  const wr     = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Torneios únicos
  const tournamentMap: Record<string, any> = {};
  for (const m of allMatches) {
    const t = (m as any).tournament;
    if (t?.id) tournamentMap[t.id] = t;
  }
  const tournamentsParticipated = Object.values(tournamentMap);

  // Torneios ativos
  const { data: activeRegs } = await admin
    .from("inscricoes")
    .select("tournament_id, tournaments!inscricoes_tournament_id_fkey(id,name,slug,status)")
    .eq("team_id", team.id);

  const activeTournaments = (activeRegs ?? [])
    .map((r: any) => r.tournaments)
    .filter(Boolean)
    .filter((t: any) => ["OPEN", "IN_PROGRESS", "CHECKIN"].includes(t.status));

  // Média de tier para "força do time"
  const tierOrder: Record<string, number> = {
    CHALLENGER: 10, GRANDMASTER: 9, MASTER: 8,
    DIAMOND: 7, EMERALD: 6, PLATINUM: 5, GOLD: 4,
    SILVER: 3, BRONZE: 2, IRON: 1, UNRANKED: 0,
  };
  const rankedPlayers = sortedPlayers.filter((p) => p.tier && p.tier !== "UNRANKED");
  const avgTierIdx =
    rankedPlayers.length > 0
      ? Math.round(
          rankedPlayers.reduce((acc, p) => acc + (tierOrder[(p.tier ?? "").toUpperCase()] ?? 0), 0) /
            rankedPlayers.length,
        )
      : -1;
  const avgTierName = Object.entries(tierOrder).find(([, v]) => v === avgTierIdx)?.[0] ?? null;

  // FIX 5: tabs como array para usar CSS class hover em vez de onMouseOver/Out inline
  const NAV_TABS = [
    { label: "👥 Roster",   href: "#roster"   },
    { label: "⚔️ Partidas", href: "#partidas" },
    { label: "📋 Torneios", href: "#torneios" },
  ];

  return (
    <div className="min-h-screen bg-[#050E1A]">

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* BANNER HERO                                                     */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 280 }}>

        {/* Camada 1 — fundo escuro base */}
        <div className="absolute inset-0 bg-[#050E1A]" />

        {/* Camada 2 — logo blurred como wallpaper */}
        {team.logo_url && (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${team.logo_url})`,
                backgroundSize: "cover",
                backgroundPosition: "center",
                filter: "blur(48px) saturate(1.4) brightness(0.25)",
                transform: "scale(1.15)",
              }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(180deg, rgba(5,14,26,0.55) 0%, rgba(5,14,26,0.80) 60%, #050E1A 100%)",
              }}
            />
          </>
        )}

        {/* Camada 3 — gradiente radial dourado */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "radial-gradient(ellipse 70% 60% at 50% 0%, rgba(200,168,75,0.12) 0%, transparent 70%)",
          }}
        />

        {/* Linha dourada no topo */}
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #C8A84B 30%, #F4C874 50%, #C8A84B 70%, transparent 100%)",
            opacity: 0.7,
          }}
        />

        {/* Hexágonos decorativos */}
        <svg
          className="absolute inset-0 w-full h-full pointer-events-none opacity-[0.04]"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden="true"
        >
          <defs>
            <pattern id="hex" x="0" y="0" width="60" height="52" patternUnits="userSpaceOnUse">
              <polygon
                points="30,2 58,16 58,44 30,58 2,44 2,16"
                fill="none"
                stroke="#C8A84B"
                strokeWidth="0.8"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hex)" />
        </svg>

        {/* ── Conteúdo do banner ──────────────────────────────────── */}
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-10 pb-0">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-6">

            {/* Logo */}
            <div className="relative flex-shrink-0">
              <div
                className="absolute -inset-[3px] rounded-2xl opacity-60"
                style={{
                  background: "linear-gradient(135deg, #C8A84B, #F4C874, #8B6914, #C8A84B)",
                  borderRadius: "18px",
                }}
              />
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  width={120}
                  height={120}
                  className="relative w-[120px] h-[120px] rounded-2xl object-cover shadow-2xl"
                  style={{ boxShadow: "0 8px 32px rgba(200,168,75,0.25), 0 2px 8px rgba(0,0,0,0.8)" }}
                />
              ) : (
                <div
                  className="relative w-[120px] h-[120px] rounded-2xl bg-[#0A1428] flex items-center justify-center text-6xl shadow-2xl"
                  style={{ boxShadow: "0 8px 32px rgba(200,168,75,0.15)" }}
                >
                  🛡️
                </div>
              )}
              <div
                className="absolute top-0 left-0 right-0 h-1/2 rounded-t-2xl pointer-events-none opacity-10"
                style={{
                  background: "linear-gradient(180deg, rgba(255,255,255,0.6) 0%, transparent 100%)",
                }}
              />
            </div>

            {/* Informações do time */}
            <div className="flex-1 min-w-0 text-center sm:text-left pb-2">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-2">
                <span
                  className="text-xs font-black uppercase tracking-[0.25em] px-3 py-1 rounded border"
                  style={{
                    color: "#C8A84B",
                    borderColor: "rgba(200,168,75,0.35)",
                    background: "rgba(200,168,75,0.08)",
                    letterSpacing: "0.22em",
                  }}
                >
                  {team.tag}
                </span>
                {team.region && (
                  <span className="text-[10px] uppercase tracking-[0.2em] text-gray-600 bg-[#0A1428] border border-[#1E3A5F] px-2 py-1 rounded">
                    {team.region}
                  </span>
                )}
                {activeTournaments.length > 0 && (
                  <span
                    className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded"
                    style={{
                      background: "rgba(200,168,75,0.15)",
                      color: "#C8A84B",
                      border: "1px solid rgba(200,168,75,0.3)",
                    }}
                  >
                    🏆 Em torneio
                  </span>
                )}
              </div>

              <h1
                className="font-black leading-none tracking-tight"
                style={{
                  fontSize: "clamp(2rem, 5vw, 3rem)",
                  color: "#fff",
                  textShadow: "0 2px 20px rgba(0,0,0,0.8)",
                }}
              >
                {team.name}
              </h1>

              {team.description && (
                <p className="text-gray-400 text-sm mt-2 max-w-xl leading-relaxed">
                  {team.description}
                </p>
              )}

              {avgTierName && (
                <div className="flex items-center justify-center sm:justify-start gap-2 mt-3">
                  {TIER_EMBLEM[avgTierName] && (
                    <img
                      src={TIER_EMBLEM[avgTierName]}
                      alt={avgTierName}
                      width={20}
                      height={20}
                      loading="lazy"
                    />
                  )}
                  <span className="text-xs text-gray-500">
                    Força média do roster:{" "}
                    <span className="font-bold" style={{ color: TIER_HEX[avgTierName] }}>
                      {avgTierName}
                    </span>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ── Stats pills ─────────────────────────────────────────── */}
          <div className="mt-6 flex flex-wrap justify-center sm:justify-start">
            <div
              className="inline-flex divide-x rounded-xl overflow-hidden"
              style={{
                background: "rgba(10,20,40,0.75)",
                backdropFilter: "blur(12px)",
                border: "1px solid rgba(30,58,95,0.8)",
                boxShadow: "0 4px 24px rgba(0,0,0,0.4)",
              }}
            >
              <StatPill value={wins}   label="Vitórias"  color="#2AC56F" />
              <StatPill value={losses} label="Derrotas"  color="#EF4444" />
              <StatPill value={`${wr}%`} label="Winrate" color={wr >= 50 ? "#2AC56F" : "#EF4444"} />
              <StatPill value={sortedPlayers.length} label="Jogadores" color="#576BCE" />
              {total > 0 && <StatPill value={total} label="Partidas" color="#C8A84B" />}
              {tournamentsParticipated.length > 0 && (
                <StatPill value={tournamentsParticipated.length} label="Torneios" color="#9D48E0" />
              )}
            </div>
          </div>

          {/* ── Barra de WR visual ──────────────────────────────────── */}
          {total > 0 && (
            <div className="mt-3 w-full max-w-xs">
              <div className="flex justify-between text-[10px] text-gray-600 mb-1">
                <span>{wins}V</span>
                <span>{losses}D</span>
              </div>
              <div className="h-1.5 w-full rounded-full overflow-hidden bg-[#1a2d45]">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${wr}%`,
                    background:
                      wr >= 60
                        ? "linear-gradient(90deg,#2AC56F,#34d58a)"
                        : wr >= 50
                        ? "linear-gradient(90deg,#C8A84B,#F4C874)"
                        : "linear-gradient(90deg,#EF4444,#f87171)",
                  }}
                />
              </div>
            </div>
          )}

          {/* ── FIX 5: Abas de navegação sem onMouseOver/Out inline ── */}
          {/* hover gerenciado por CSS class group/hover do Tailwind    */}
          <div
            className="flex gap-0 mt-8 border-b"
            style={{ borderColor: "rgba(30,58,95,0.7)" }}
          >
            {NAV_TABS.map((tab) => (
              <a
                key={tab.href}
                href={tab.href}
                className="
                  relative px-5 py-2.5 text-sm font-semibold
                  text-gray-500 hover:text-[#C8A84B]
                  transition-colors duration-150
                  after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px]
                  after:bg-[#C8A84B] after:scale-x-0 hover:after:scale-x-100
                  after:transition-transform after:duration-200 after:origin-left
                "
              >
                {tab.label}
              </a>
            ))}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════ */}
      {/* CONTEÚDO PRINCIPAL                                             */}
      {/* ══════════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* Torneios Ativos */}
        {activeTournaments.length > 0 && (
          <div
            className="rounded-xl p-4"
            style={{
              background: "rgba(200,168,75,0.05)",
              border: "1px solid rgba(200,168,75,0.2)",
            }}
          >
            <h2 className="text-[#C8A84B] font-bold text-xs uppercase tracking-widest mb-3">
              🏆 Participando Agora
            </h2>
            <div className="flex flex-wrap gap-2">
              {activeTournaments.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/torneios/${t.slug}`}
                  className="border text-xs font-medium rounded-lg px-3 py-2 transition-all"
                  style={{
                    background: "rgba(200,168,75,0.08)",
                    borderColor: "rgba(200,168,75,0.3)",
                    color: "#C8A84B",
                  }}
                >
                  {t.name} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── ROSTER ─────────────────────────────────────────────────── */}
        <div
          id="roster"
          className="rounded-xl overflow-hidden"
          style={{ background: "#0D1B2E", border: "1px solid #1E3A5F" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #1E3A5F" }}
          >
            <h2 className="text-white font-bold text-sm">
              👥 Roster
              <span className="text-gray-600 font-normal ml-2">
                {sortedPlayers.length}/5 jogadores
              </span>
            </h2>
          </div>

          {sortedPlayers.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">🎮</p>
              <p className="text-gray-500 text-sm">Sem jogadores vinculados ao time.</p>
            </div>
          ) : (
            <div>
              {sortedPlayers.map((p, i) => {
                const gamesPlayed = (p.wins ?? 0) + (p.losses ?? 0);
                const playerWr =
                  gamesPlayed > 0 ? Math.round(((p.wins ?? 0) / gamesPlayed) * 100) : 0;

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 md:gap-4 px-4 py-3 transition-colors group"
                    style={{ borderBottom: i < sortedPlayers.length - 1 ? "1px solid rgba(30,58,95,0.5)" : "none" }}
                  >
                    {/* Número */}
                    <span className="text-gray-700 text-xs font-bold w-4 text-center flex-shrink-0 tabular-nums">
                      {i + 1}
                    </span>

                    {/* Ícone de role */}
                    <div className="flex flex-col items-center gap-0.5 w-10 flex-shrink-0">
                      {ROLE_ICON_URL[p.role ?? ""] ? (
                        <img
                          src={ROLE_ICON_URL[p.role ?? ""]}
                          alt={p.role ?? ""}
                          width={22}
                          height={22}
                          loading="lazy"
                          className="opacity-70 group-hover:opacity-100 transition-opacity"
                          style={{ filter: "invert(1) sepia(1) saturate(2) hue-rotate(10deg)" }}
                        />
                      ) : (
                        <span className="text-xl">❓</span>
                      )}
                      <span className="text-gray-700 text-[9px] uppercase tracking-wide">
                        {ROLE_LABELS[p.role ?? ""] ?? "—"}
                      </span>
                    </div>

                    {/* FIX 3: profile_icon_id — coluna correta de riot_accounts */}
                    <PlayerAvatar iconId={p.profile_icon_id} name={p.summoner_name} size={44} />

                    {/* Info do summoner */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="font-semibold text-sm truncate transition-colors"
                        style={{ color: "#fff" }}
                      >
                        {p.summoner_name}
                        {/* FIX 4: tag_line normalizado — só renderiza se não for string vazia */}
                        {p.tag_line && (
                          <span className="text-gray-600 font-normal text-xs">#{p.tag_line}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {p.summoner_level && (
                          <span className="text-gray-600 text-xs">Nível {p.summoner_level}</span>
                        )}
                        {gamesPlayed > 0 && (
                          <>
                            <span
                              className="text-xs font-medium"
                              style={{ color: playerWr >= 50 ? "#2AC56F" : "#EF4444" }}
                            >
                              {playerWr}% WR
                            </span>
                            <span className="text-gray-700 text-xs">
                              {p.wins}V / {p.losses}D
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Rank badge */}
                    <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                      <TierBadge tier={p.tier} rank={p.rank} lp={p.lp} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PARTIDAS RECENTES ─────────────────────────────────────── */}
        <div
          id="partidas"
          className="rounded-xl overflow-hidden"
          style={{ background: "#0D1B2E", border: "1px solid #1E3A5F" }}
        >
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: "1px solid #1E3A5F" }}
          >
            <h2 className="text-white font-bold text-sm">
              ⚔️ Partidas Recentes
              {total > 0 && (
                <span className="text-gray-600 font-normal ml-2">{total} disputadas</span>
              )}
            </h2>
            {total > 0 && (
              <div className="flex items-center gap-1.5">
                <div className="w-20 h-1.5 bg-[#1E3A5F] rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${wr}%`,
                      background: wr >= 50 ? "#2AC56F" : "#EF4444",
                    }}
                  />
                </div>
                <span className="text-xs text-gray-500 tabular-nums">{wr}%</span>
              </div>
            )}
          </div>

          {allMatches.length === 0 ? (
            <div className="py-16 text-center">
              <p className="text-4xl mb-3">⚔️</p>
              <p className="text-gray-500 text-sm">Nenhuma partida registrada.</p>
            </div>
          ) : (
            <div>
              {allMatches.slice(0, 10).map((m, i) => {
                const isFinished  = m.status === "FINISHED";
                const isScheduled = m.status === "SCHEDULED";
                const won  = isFinished && m.winner_id === team.id;
                const lost = isFinished && m.winner_id && m.winner_id !== team.id;
                const opp  = m.side === "A" ? (m as any).team_b : (m as any).team_a;
                const tourn    = (m as any).tournament;
                const scoreA   = m.side === "A" ? m.score_a : m.score_b;
                const scoreB   = m.side === "A" ? m.score_b : m.score_a;
                const dateStr  = m.played_at ?? m.scheduled_at;
                const resultBg = won
                  ? "rgba(42,197,111,0.12)"
                  : lost
                  ? "rgba(239,68,68,0.08)"
                  : "transparent";

                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3 transition-colors"
                    style={{
                      borderBottom: i < Math.min(allMatches.length, 10) - 1 ? "1px solid rgba(30,58,95,0.45)" : "none",
                      background: resultBg,
                    }}
                  >
                    {/* Badge V/D */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center font-black text-xs flex-shrink-0"
                      style={{
                        background: won
                          ? "rgba(42,197,111,0.18)"
                          : lost
                          ? "rgba(239,68,68,0.18)"
                          : isScheduled
                          ? "rgba(87,107,206,0.18)"
                          : "#1E3A5F",
                        color: won ? "#2AC56F" : lost ? "#EF4444" : isScheduled ? "#576BCE" : "#6B7280",
                      }}
                    >
                      {won ? "V" : lost ? "D" : isScheduled ? "◷" : "—"}
                    </div>

                    {/* Oponente */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {opp?.logo_url ? (
                          <img
                            src={opp.logo_url}
                            alt={opp.name}
                            width={20}
                            height={20}
                            className="w-5 h-5 rounded object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <span className="text-base leading-none opacity-50">🛡️</span>
                        )}
                        <span className="text-gray-300 text-sm truncate">
                          vs{" "}
                          <span className="text-white font-semibold">
                            {opp ? `[${opp.tag}] ${opp.name}` : "Adversário"}
                          </span>
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        {dateStr && (
                          <span className="text-gray-700 text-xs">
                            {new Date(dateStr).toLocaleDateString("pt-BR")}
                          </span>
                        )}
                        {m.round && (
                          <span className="text-gray-700 text-xs">· {m.round}</span>
                        )}
                        {tourn?.slug && (
                          <Link
                            href={`/torneios/${tourn.slug}`}
                            className="text-blue-400/60 hover:text-blue-400 text-xs transition-colors"
                          >
                            {tourn.name}
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Placar */}
                    {isFinished && (
                      <div
                        className="text-right flex-shrink-0 font-black text-sm tabular-nums"
                        style={{ color: won ? "#2AC56F" : lost ? "#EF4444" : "#9CA3AF" }}
                      >
                        {scoreA ?? 0} – {scoreB ?? 0}
                      </div>
                    )}
                    {isScheduled && (
                      <span className="text-blue-400/60 text-xs flex-shrink-0">Agendado</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── HISTÓRICO DE TORNEIOS ─────────────────────────────────── */}
        {tournamentsParticipated.length > 0 && (
          <div
            id="torneios"
            className="rounded-xl overflow-hidden"
            style={{ background: "#0D1B2E", border: "1px solid #1E3A5F" }}
          >
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1E3A5F" }}>
              <h2 className="text-white font-bold text-sm">📋 Histórico de Torneios</h2>
            </div>
            <div>
              {tournamentsParticipated.map((t: any, i: number) => (
                <Link
                  key={t.id}
                  href={`/torneios/${t.slug}`}
                  className="flex items-center justify-between px-4 py-3 transition-colors group hover:bg-[#0A1428]"
                  style={{
                    borderBottom:
                      i < tournamentsParticipated.length - 1
                        ? "1px solid rgba(30,58,95,0.45)"
                        : "none",
                  }}
                >
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                    {t.name}
                  </span>
                  <span
                    className="text-xs font-medium opacity-50 group-hover:opacity-100 transition-opacity"
                    style={{ color: "#C8A84B" }}
                  >
                    Ver →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── Navegação rodapé ─────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 pb-6">
          <Link
            href="/times"
            className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors"
          >
            ← Todos os Times
          </Link>
          <Link
            href="/dashboard/times/criar"
            className="text-sm font-medium transition-colors hover:text-[#F4C874]"
            style={{ color: "#C8A84B" }}
          >
            + Criar Time
          </Link>
        </div>
      </div>
    </div>
  );
}
