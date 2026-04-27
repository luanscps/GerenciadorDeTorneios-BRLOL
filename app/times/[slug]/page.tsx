import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import Link from "next/link";

export const dynamic = "force-dynamic";

const DDRAGON = "14.24.1";

const TIER_COLORS: Record<string, string> = {
  CHALLENGER:  "text-yellow-300",
  GRANDMASTER: "text-red-400",
  MASTER:      "text-purple-400",
  DIAMOND:     "text-blue-400",
  EMERALD:     "text-emerald-400",
  PLATINUM:    "text-teal-400",
  GOLD:        "text-yellow-500",
  SILVER:      "text-gray-400",
  BRONZE:      "text-orange-700",
  IRON:        "text-gray-500",
  UNRANKED:    "text-gray-600",
};

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

const ROLE_ORDER: Record<string, number> = {
  TOP: 0, JUNGLE: 1, MID: 2, ADC: 3, SUPPORT: 4,
};

const ROLE_LABELS: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MID: "Mid", ADC: "ADC", SUPPORT: "Suporte",
};

const ROLE_ICONS: Record<string, string> = {
  TOP: "🛡️", JUNGLE: "🌿", MID: "⚡", ADC: "🏹", SUPPORT: "💊",
};

// ── Componente de Badge de Tier ────────────────────────────────────────────
function TierBadge({ tier, rank }: { tier?: string | null; rank?: string | null }) {
  const t = tier ?? "UNRANKED";
  const color = TIER_HEX[t] ?? TIER_HEX.UNRANKED;
  const label = t === "UNRANKED" ? "Unranked" : `${t} ${rank ?? ""}`.trim();
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full border"
      style={{ color, borderColor: `${color}40`, background: `${color}12` }}
    >
      {label}
    </span>
  );
}

// ── Componente Avatar do Jogador ──────────────────────────────────────────
function PlayerAvatar({ iconId, name, size = 40 }: { iconId?: number | null; name: string; size?: number }) {
  const url = iconId
    ? `https://ddragon.leagueoflegends.com/cdn/${DDRAGON}/img/profileicon/${iconId}.png`
    : null;
  if (url) {
    return (
      <img
        src={url}
        alt={name}
        width={size} height={size}
        loading="lazy"
        className="rounded-full border-2 border-[#1E3A5F] object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-[#0A1428] border-2 border-[#1E3A5F] flex items-center justify-center text-lg flex-shrink-0"
      style={{ width: size, height: size }}
    >
      🎮
    </div>
  );
}

// ── Stat Card ──────────────────────────────────────────────────────────────
function StatCard({ value, label, color = "text-white" }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="text-center px-4 py-3">
      <p className={`font-bold text-2xl tabular-nums ${color}`}>{value}</p>
      <p className="text-gray-500 text-xs mt-0.5 uppercase tracking-wider">{label}</p>
    </div>
  );
}

export default async function TimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const isUUID = /^[0-9a-f-]{36}$/.test(slug);
  const { data: team } = isUUID
    ? await admin.from("teams").select("*").eq("id", slug).single()
    : await admin.from("teams").select("*").eq("slug", slug).single();

  if (!team) notFound();

  // ── Jogadores ──────────────────────────────────────────────────────────
  const { data: players } = await admin
    .from("players")
    .select("id, summoner_name, tag_line, tier, rank, lp, wins, losses, role, profile_icon, summoner_level")
    .eq("team_id", team.id)
    .order("lp", { ascending: false });

  const sortedPlayers = (players ?? []).sort(
    (a, b) => (ROLE_ORDER[a.role ?? ""] ?? 99) - (ROLE_ORDER[b.role ?? ""] ?? 99)
  );

  // ── Partidas ───────────────────────────────────────────────────────────
  const [{ data: matchesA }, { data: matchesB }] = await Promise.all([
    admin
      .from("matches")
      .select(`
        id, round, status, score_a, score_b, format, scheduled_at, played_at,
        winner_id, team_a_id, team_b_id,
        team_b:teams!matches_team_b_id_fkey(id, name, tag, logo_url),
        tournament:tournaments!matches_tournament_id_fkey(id, name, slug)
      `)
      .eq("team_a_id", team.id)
      .in("status", ["FINISHED", "IN_PROGRESS", "SCHEDULED"])
      .order("scheduled_at", { ascending: false })
      .limit(30),
    admin
      .from("matches")
      .select(`
        id, round, status, score_a, score_b, format, scheduled_at, played_at,
        winner_id, team_a_id, team_b_id,
        team_a:teams!matches_team_a_id_fkey(id, name, tag, logo_url),
        tournament:tournaments!matches_tournament_id_fkey(id, name, slug)
      `)
      .eq("team_b_id", team.id)
      .in("status", ["FINISHED", "IN_PROGRESS", "SCHEDULED"])
      .order("scheduled_at", { ascending: false })
      .limit(30),
  ]);

  const allMatches = [
    ...(matchesA ?? []).map(m => ({ ...m, side: "A" as const })),
    ...(matchesB ?? []).map(m => ({ ...m, side: "B" as const })),
  ].sort((a, b) =>
    new Date(b.scheduled_at ?? b.played_at ?? 0).getTime() -
    new Date(a.scheduled_at ?? a.played_at ?? 0).getTime()
  );

  const wins   = allMatches.filter(m => m.status === "FINISHED" && m.winner_id === team.id).length;
  const losses = allMatches.filter(m => m.status === "FINISHED" && m.winner_id && m.winner_id !== team.id).length;
  const total  = wins + losses;
  const wr     = total > 0 ? Math.round((wins / total) * 100) : 0;

  // Torneios únicos do histórico
  const tournamentMap: Record<string, any> = {};
  for (const m of allMatches) {
    const t = (m as any).tournament;
    if (t?.id) tournamentMap[t.id] = t;
  }
  const tournamentsParticipated = Object.values(tournamentMap);

  // Torneios ativos
  const { data: activeRegs } = await admin
    .from("inscricoes")
    .select("tournament_id, tournaments!inscricoes_tournament_id_fkey(id, name, slug, status)")
    .eq("team_id", team.id);

  const activeTournaments = (activeRegs ?? [])
    .map((r: any) => r.tournaments)
    .filter(Boolean)
    .filter((t: any) => ["OPEN", "IN_PROGRESS", "CHECKIN"].includes(t.status));

  // ── Cor dominante do banner ────────────────────────────────────────────
  const bannerBg = team.logo_url
    ? "bg-gradient-to-b from-[#0D1B2E] via-[#0A1428] to-[#050E1A]"
    : "bg-gradient-to-br from-[#0D1B2E] via-[#091525] to-[#050E1A]";

  return (
    <div className="min-h-screen bg-[#050E1A]">

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* BANNER HERO                                                      */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className={`relative w-full overflow-hidden ${bannerBg}`}>
        {/* Fundo decorativo: gradiente radial saindo do logo */}
        <div
          className="absolute inset-0 opacity-20 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse 60% 80% at 50% 0%, #C8A84B33, transparent 70%)`,
          }}
        />

        {/* Linha dourada no topo */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-[#C8A84B] to-transparent opacity-60" />

        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-10 pb-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-5">

            {/* Logo grande */}
            <div className="flex-shrink-0 relative">
              {team.logo_url ? (
                <img
                  src={team.logo_url}
                  alt={team.name}
                  width={112} height={112}
                  className="w-28 h-28 rounded-2xl object-cover border-2 border-[#C8A84B]/40 shadow-2xl shadow-black/60"
                />
              ) : (
                <div className="w-28 h-28 rounded-2xl bg-[#0A1428] border-2 border-[#C8A84B]/30 flex items-center justify-center text-5xl shadow-2xl shadow-black/60">
                  🛡️
                </div>
              )}
            </div>

            {/* Nome e info */}
            <div className="flex-1 min-w-0 text-center sm:text-left pb-1">
              <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                <span className="text-[#C8A84B] text-xs font-bold uppercase tracking-[0.2em] bg-[#C8A84B]/10 border border-[#C8A84B]/20 px-2 py-0.5 rounded">
                  {team.tag}
                </span>
                {team.region && (
                  <span className="text-gray-600 text-xs uppercase tracking-widest">
                    {team.region}
                  </span>
                )}
              </div>
              <h1 className="text-white font-bold text-3xl md:text-4xl leading-tight">
                {team.name}
              </h1>
              {team.description && (
                <p className="text-gray-400 text-sm mt-2 max-w-xl leading-relaxed">
                  {team.description}
                </p>
              )}
            </div>
          </div>

          {/* ── Stats bar ──────────────────────────────────────────────── */}
          <div className="mt-6 flex flex-wrap justify-center sm:justify-start divide-x divide-[#1E3A5F] border border-[#1E3A5F] rounded-xl bg-[#0A1428]/60 backdrop-blur-sm w-fit">
            <StatCard value={wins} label="Vitórias" color="text-[#C8A84B]" />
            <StatCard value={losses} label="Derrotas" color="text-red-400" />
            <StatCard
              value={`${wr}%`}
              label="Winrate"
              color={wr >= 50 ? "text-emerald-400" : "text-red-400"}
            />
            <StatCard value={sortedPlayers.length} label="Jogadores" color="text-blue-400" />
            {total > 0 && (
              <StatCard value={total} label="Partidas" />
            )}
          </div>
        </div>

        {/* Linha divisória inferior */}
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[#1E3A5F] to-transparent" />
      </div>

      {/* ════════════════════════════════════════════════════════════════ */}
      {/* CONTEÚDO PRINCIPAL                                               */}
      {/* ════════════════════════════════════════════════════════════════ */}
      <div className="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">

        {/* Torneios Ativos */}
        {activeTournaments.length > 0 && (
          <div className="bg-[#0D1B2E] border border-[#C8A84B]/20 rounded-xl p-4">
            <h2 className="text-[#C8A84B] font-bold text-xs uppercase tracking-widest mb-3">
              🏆 Participando Agora
            </h2>
            <div className="flex flex-wrap gap-2">
              {activeTournaments.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/torneios/${t.slug}`}
                  className="bg-[#C8A84B]/10 border border-[#C8A84B]/30 hover:border-[#C8A84B]/70 text-[#C8A84B] text-xs font-medium rounded-lg px-3 py-2 transition-all hover:bg-[#C8A84B]/20"
                >
                  {t.name} →
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── ROSTER ──────────────────────────────────────────────────── */}
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-xl overflow-hidden">
          {/* Header da seção */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]">
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
            <div className="divide-y divide-[#1E3A5F]/60">
              {sortedPlayers.map((p, i) => {
                const gamesPlayed = (p.wins ?? 0) + (p.losses ?? 0);
                const playerWr = gamesPlayed > 0
                  ? Math.round(((p.wins ?? 0) / gamesPlayed) * 100)
                  : 0;

                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 md:gap-4 px-4 py-3 hover:bg-[#0A1428]/80 transition-colors group"
                  >
                    {/* Número */}
                    <span className="text-gray-700 text-xs font-bold w-4 text-center flex-shrink-0 tabular-nums">
                      {i + 1}
                    </span>

                    {/* Role icon */}
                    <div className="flex flex-col items-center gap-0.5 w-10 flex-shrink-0">
                      <span className="text-xl leading-none">{ROLE_ICONS[p.role ?? ""] ?? "❓"}</span>
                      <span className="text-gray-700 text-[10px] uppercase tracking-wide">
                        {ROLE_LABELS[p.role ?? ""] ?? "—"}
                      </span>
                    </div>

                    {/* Avatar */}
                    <PlayerAvatar iconId={p.profile_icon} name={p.summoner_name ?? ""} size={44} />

                    {/* Summoner info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate group-hover:text-[#C8A84B] transition-colors">
                        {p.summoner_name}
                        <span className="text-gray-600 font-normal text-xs">#{p.tag_line}</span>
                      </p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        {p.summoner_level && (
                          <span className="text-gray-600 text-xs">Nível {p.summoner_level}</span>
                        )}
                        {gamesPlayed > 0 && (
                          <span className={`text-xs font-medium ${playerWr >= 50 ? "text-emerald-400" : "text-red-400"}`}>
                            {playerWr}% WR
                          </span>
                        )}
                        {gamesPlayed > 0 && (
                          <span className="text-gray-700 text-xs">
                            {p.wins}W / {p.losses}L
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Rank badge — visível em md+ */}
                    <div className="hidden sm:flex flex-col items-end gap-1 flex-shrink-0">
                      <TierBadge tier={p.tier} rank={p.rank} />
                      <span className="text-gray-600 text-xs tabular-nums">
                        {p.lp ?? 0} LP
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── PARTIDAS RECENTES ───────────────────────────────────────── */}
        <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-xl overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#1E3A5F]">
            <h2 className="text-white font-bold text-sm">
              ⚔️ Partidas Recentes
              {allMatches.length > 0 && (
                <span className="text-gray-600 font-normal ml-2">{total} disputadas</span>
              )}
            </h2>
            {total > 0 && (
              <div className="flex items-center gap-1">
                {/* Mini winrate bar */}
                <div className="w-20 h-1.5 bg-[#1E3A5F] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#C8A84B] rounded-full transition-all"
                    style={{ width: `${wr}%` }}
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
            <div className="divide-y divide-[#1E3A5F]/60">
              {allMatches.slice(0, 10).map(m => {
                const isFinished = m.status === "FINISHED";
                const isScheduled = m.status === "SCHEDULED";
                const won  = isFinished && m.winner_id === team.id;
                const lost = isFinished && m.winner_id && m.winner_id !== team.id;
                const opp  = m.side === "A" ? (m as any).team_b : (m as any).team_a;
                const tourn = (m as any).tournament;
                const scoreA = m.side === "A" ? m.score_a : m.score_b;
                const scoreB = m.side === "A" ? m.score_b : m.score_a;
                const dateStr = m.played_at ?? m.scheduled_at;

                return (
                  <div
                    key={m.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#0A1428]/60 transition-colors"
                  >
                    {/* Resultado badge */}
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      won  ? "bg-emerald-500/15 text-emerald-400" :
                      lost ? "bg-red-500/15 text-red-400" :
                      isScheduled ? "bg-blue-500/15 text-blue-400" :
                             "bg-gray-800 text-gray-500"
                    }`}>
                      {won ? "V" : lost ? "D" : isScheduled ? "◷" : "—"}
                    </div>

                    {/* Oponente + torneio */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {opp?.logo_url ? (
                          <img src={opp.logo_url} alt={opp.name} width={20} height={20} className="w-5 h-5 rounded object-cover" loading="lazy" />
                        ) : (
                          <span className="text-base leading-none">🛡️</span>
                        )}
                        <span className="text-gray-300 text-sm truncate">
                          vs{" "}
                          <span className="text-white font-medium">
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
                            className="text-blue-400/70 hover:text-blue-400 text-xs transition-colors"
                          >
                            {tourn.name}
                          </Link>
                        )}
                      </div>
                    </div>

                    {/* Placar */}
                    {isFinished && (
                      <div className={`text-right flex-shrink-0 font-bold text-sm tabular-nums ${
                        won ? "text-emerald-400" : lost ? "text-red-400" : "text-gray-300"
                      }`}>
                        {scoreA ?? 0} – {scoreB ?? 0}
                      </div>
                    )}
                    {isScheduled && (
                      <span className="text-blue-400/70 text-xs flex-shrink-0">Agendado</span>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── HISTÓRICO DE TORNEIOS ───────────────────────────────────── */}
        {tournamentsParticipated.length > 0 && (
          <div className="bg-[#0D1B2E] border border-[#1E3A5F] rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1E3A5F]">
              <h2 className="text-white font-bold text-sm">
                📋 Histórico de Torneios
              </h2>
            </div>
            <div className="divide-y divide-[#1E3A5F]/60">
              {tournamentsParticipated.map((t: any) => (
                <Link
                  key={t.id}
                  href={`/torneios/${t.slug}`}
                  className="flex items-center justify-between px-4 py-3 hover:bg-[#0A1428]/80 transition-colors group"
                >
                  <span className="text-gray-300 text-sm group-hover:text-white transition-colors">
                    {t.name}
                  </span>
                  <span className="text-[#C8A84B] text-xs font-medium opacity-60 group-hover:opacity-100 transition-opacity">
                    Ver →
                  </span>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* ── RODAPÉ DE NAVEGAÇÃO ─────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2 pb-6">
          <Link href="/times" className="flex items-center gap-1.5 text-gray-500 hover:text-white text-sm transition-colors">
            ← Todos os Times
          </Link>
          <Link
            href="/dashboard/times/criar"
            className="text-[#C8A84B] hover:text-[#d4b55a] text-sm transition-colors"
          >
            + Criar Time
          </Link>
        </div>
      </div>
    </div>
  );
}
