import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDDVersion } from "@/lib/riot";

export const dynamic = "force-dynamic";

const TIER_HEX: Record<string, string> = {
  CHALLENGER: "#F4C874", GRANDMASTER: "#CD4545", MASTER: "#9D48E0",
  DIAMOND: "#576BCE", EMERALD: "#2AC56F", PLATINUM: "#00B2A9",
  GOLD: "#C8A84B", SILVER: "#A8A9AD", BRONZE: "#CD7F32",
  IRON: "#8B8B8B", UNRANKED: "#4B5563",
};

const TIER_EMBLEM: Record<string, string> = {
  CHALLENGER: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-challenger.png",
  GRANDMASTER: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-grandmaster.png",
  MASTER: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-master.png",
  DIAMOND: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-diamond.png",
  EMERALD: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-emerald.png",
  PLATINUM: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-platinum.png",
  GOLD: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-gold.png",
  SILVER: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-silver.png",
  BRONZE: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-bronze.png",
  IRON: "https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/images/ranked-emblem/emblem-iron.png",
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
        <img src={emblem} alt={t} width={14} height={14} loading="lazy"
          style={{ filter: "drop-shadow(0 0 2px currentColor)" }} />
      )}
      {label}
      {lp != null && lp > 0 && <span className="opacity-70 font-normal">· {lp} LP</span>}
    </span>
  );
}

function PlayerAvatar({
  iconId, name, size = 44, ddVersion,
}: {
  iconId?: number | null; name: string; size?: number; ddVersion: string;
}) {
  const url = iconId
    ? `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/profileicon/${iconId}.png`
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

function StatPill({ value, label, color = "#ffffff" }: { value: string | number; label: string; color?: string }) {
  return (
    <div className="flex flex-col items-center px-5 py-3">
      <span className="font-black text-2xl tabular-nums leading-none" style={{ color }}>{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-gray-500 mt-1">{label}</span>
    </div>
  );
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PlayerRow = {
  id: string;
  lane: string | null;
  team_role: string;
  summoner_name: string;
  tag_line: string;
  profile_icon_id: number | null;
  summoner_level: number | null;
  tier: string | null;
  rank: string | null;
  lp: number | null;
  wins: number | null;
  losses: number | null;
};

export default async function TimeDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();
  const DDRAGON = await getDDVersion();

  const isUUID = UUID_REGEX.test(slug);
  const { data: team } = isUUID
    ? await supabase.from("teams").select("*").eq("id", slug).single()
    : await supabase.from("teams").select("*").eq("slug", slug).single();

  if (!team) notFound();

  // Fix 2a: select limpo sem duplicatas de riot_accounts e profiles
  const { data: rawMembers } = await supabase
    .from("team_members")
    .select(`
      id, lane, team_role, status, profile_id,
      profiles ( id, full_name, email ),
      riot_accounts (
        id, game_name, tag_line, summoner_level, profile_icon_id,
        rank_snapshots ( queue_type, tier, rank, lp, wins, losses, recorded_at )
      )
    `)
    .eq("team_id", team.id)
    .eq("status", "accepted");

  // Coleta riot_account_ids válidos
  const riotAccountIds: string[] = [];
  for (const m of rawMembers ?? []) {
    const ra = (m as any).riot_accounts?.[0];
    if (ra?.id && !riotAccountIds.includes(ra.id)) riotAccountIds.push(ra.id);
  }

  // Fix 2b: busca players pela tabela players diretamente via team_id (sem depender de riot_account_id)
  // Isso garante que mesmo com riot_account_id = NULL os jogadores do time apareçam
  const { data: teamPlayers } = await supabase
    .from("players")
    .select("id, summoner_name, tag_line, role, tier, rank, lp, wins, losses, profile_icon_id, summoner_level, riot_account_id")
    .eq("team_id", team.id);

  // Map por riot_account_id (quando disponível) e também por summoner_name+tag_line como fallback
  type PlayerData = NonNullable<typeof teamPlayers>[number];
  const playerMapById: Record<string, PlayerData> = {};
  const playerMapByName: Record<string, PlayerData> = {};
  for (const p of teamPlayers ?? []) {
    if (p.riot_account_id) playerMapById[p.riot_account_id] = p;
    const key = `${(p.summoner_name ?? "").toLowerCase()}#${(p.tag_line ?? "").toLowerCase()}`;
    playerMapByName[key] = p;
  }

  // Rank via rank_snapshots em lote
  const rankMap: Record<string, { tier: string; rank: string; lp: number; wins: number; losses: number }> = {};
  if (riotAccountIds.length > 0) {
    const { data: snapshots } = await supabase
      .from("rank_snapshots")
      .select("riot_account_id, tier, rank, lp, wins, losses, recorded_at")
      .in("riot_account_id", riotAccountIds)
      .order("recorded_at", { ascending: false });

    for (const snap of snapshots ?? []) {
      if (!rankMap[snap.riot_account_id]) {
        rankMap[snap.riot_account_id] = {
          tier:   snap.tier   ?? "UNRANKED",
          rank:   snap.rank   ?? "",
          lp:     snap.lp     ?? 0,
          wins:   snap.wins   ?? 0,
          losses: snap.losses ?? 0,
        };
      }
    }
  }

  const players: PlayerRow[] = (rawMembers ?? []).map((member: any) => {
    const ra   = (member.riot_accounts as any[])?.[0] ?? null;
    const prof = (member.profiles as any[])?.[0] ?? null;

    // Resolução de player: primeiro por riot_account_id, depois por nome+tag
    const playerById = ra?.id ? playerMapById[ra.id] : null;
    const nameKey = `${(ra?.game_name ?? "").toLowerCase()}#${(ra?.tag_line ?? "").toLowerCase()}`;
    const playerByName = nameKey !== "#" ? playerMapByName[nameKey] : null;
    const player = playerById ?? playerByName ?? null;

    const snap = ra?.id ? (rankMap[ra.id] ?? null) : null;

    // Rank: prioridade rank_snapshots > player.tier/rank/lp (vindo diretamente da tabela players)
    const tier   = snap?.tier   ?? player?.tier   ?? null;
    const rank   = snap?.rank   ?? player?.rank   ?? null;
    const lp     = snap?.lp     ?? player?.lp     ?? null;
    const wins   = snap?.wins   ?? player?.wins   ?? null;
    const losses = snap?.losses ?? player?.losses ?? null;

    return {
      id:              member.id,
      lane:            member.lane ?? player?.role ?? null,
      team_role:       member.team_role ?? "member",
      summoner_name:   ra?.game_name  ?? prof?.full_name ?? player?.summoner_name ?? "Jogador",
      tag_line:        ra?.tag_line   ?? player?.tag_line ?? "BR1",
      profile_icon_id: ra?.profile_icon_id ?? player?.profile_icon_id ?? null,
      summoner_level:  ra?.summoner_level  ?? player?.summoner_level  ?? null,
      tier,
      rank,
      lp,
      wins,
      losses,
    };
  });

  // Fix 2c: se team_members está vazio mas players existe via team_id, monta roster direto
  let finalPlayers = players;
  if (players.length === 0 && (teamPlayers ?? []).length > 0) {
    finalPlayers = (teamPlayers ?? []).map((p) => ({
      id:              p.id,
      lane:            p.role ?? null,
      team_role:       "member",
      summoner_name:   p.summoner_name ?? "Jogador",
      tag_line:        p.tag_line ?? "BR1",
      profile_icon_id: (p as any).profile_icon_id ?? null,
      summoner_level:  (p as any).summoner_level  ?? null,
      tier:            p.tier   ?? null,
      rank:            p.rank   ?? null,
      lp:              p.lp     ?? null,
      wins:            p.wins   ?? null,
      losses:          p.losses ?? null,
    }));
  }

  const sortedPlayers = finalPlayers.sort(
    (a, b) => (ROLE_ORDER[a.lane ?? ""] ?? 99) - (ROLE_ORDER[b.lane ?? ""] ?? 99),
  );

  // Partidas
  const [{ data: matchesA }, { data: matchesB }] = await Promise.all([
    supabase
      .from("matches")
      .select(`id,round,status,score_a,score_b,scheduled_at,played_at,winner_id,team_a_id,team_b_id,
        team_b:teams!matches_team_b_id_fkey(id,name,tag,logo_url),
        tournament:tournaments!matches_tournament_id_fkey(id,name,slug)`)
      .eq("team_a_id", team.id)
      .in("status", ["FINISHED", "IN_PROGRESS", "SCHEDULED"])
      .order("scheduled_at", { ascending: false })
      .limit(30),
    supabase
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

  const wins   = allMatches.filter((m) => m.winner_id === team.id).length;
  const losses = allMatches.filter((m) => m.status === "FINISHED" && m.winner_id && m.winner_id !== team.id).length;
  const total  = wins + losses;
  const wr     = total > 0 ? Math.round((wins / total) * 100) : null;

  return (
    <div className="min-h-screen bg-[#050E1A]">
      {/* HERO BANNER */}
      <div className="relative h-52 md:h-64 overflow-hidden">
        {(team.banner_url || team.logo_url) && (
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url(${team.banner_url ?? team.logo_url})`,
              backgroundSize: team.banner_url ? "cover" : "300px",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat",
              filter: team.banner_url
                ? "brightness(0.35) saturate(1.3)"
                : "blur(40px) brightness(0.2) saturate(1.5)",
              transform: "scale(1.05)",
            }}
          />
        )}
        {!team.banner_url && !team.logo_url && (
          <div
            className="absolute inset-0"
            style={{ background: "linear-gradient(135deg, #0a1a2e 0%, #050e1a 40%, #0d1b2e 100%)" }}
          />
        )}
        <div
          className="absolute inset-0"
          style={{ background: "linear-gradient(180deg, rgba(5,14,26,0) 0%, rgba(5,14,26,0.6) 60%, #050E1A 100%)" }}
        />
        <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 flex items-end gap-4">
          {team.logo_url ? (
            <div className="relative flex-shrink-0">
              <div
                className="absolute -inset-[3px] rounded-xl opacity-60"
                style={{ background: "linear-gradient(135deg,#C8A84B,#8B6914,#C8A84B)" }}
              />
              <img
                src={team.logo_url} alt={team.name} width={72} height={72}
                className="relative rounded-xl object-cover w-16 h-16 md:w-[72px] md:h-[72px]"
                style={{ border: "2px solid rgba(200,168,75,0.4)" }}
              />
            </div>
          ) : (
            <div
              className="w-16 h-16 md:w-[72px] md:h-[72px] rounded-xl flex items-center justify-center text-3xl flex-shrink-0"
              style={{ background: "#0D1B2E", border: "2px solid #1E3A5F" }}
            >
              🛡️
            </div>
          )}
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.2em]" style={{ color: "#C8A84B" }}>
              [{team.tag}]
            </p>
            <h1 className="text-white font-black text-2xl md:text-3xl leading-tight truncate">
              {team.name}
            </h1>
            {team.description && (
              <p className="text-gray-400 text-sm mt-0.5 line-clamp-1">{team.description}</p>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-6">
        {/* STATS */}
        {total > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: "#0D1B2E", border: "1px solid #1E3A5F" }}>
            <div className="grid grid-cols-3 divide-x divide-[#1E3A5F]">
              <StatPill value={wins}   label="Vitórias" color="#2AC56F" />
              <StatPill value={losses} label="Derrotas" color="#CD4545" />
              <StatPill
                value={wr != null ? `${wr}%` : "—"}
                label="Win Rate"
                color={wr != null ? (wr >= 50 ? "#2AC56F" : "#CD4545") : "#4B5563"}
              />
            </div>
          </div>
        )}

        {/* ROSTER */}
        <div className="rounded-xl overflow-hidden" style={{ background: "#0D1B2E", border: "1px solid #1E3A5F" }}>
          <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid #1E3A5F" }}>
            <h2 className="text-white font-bold text-sm uppercase tracking-widest">Roster</h2>
            <span className="text-gray-600 text-xs">{sortedPlayers.length}/5 jogadores</span>
          </div>

          {sortedPlayers.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-4xl mb-3">🎮</p>
              <p className="text-gray-500 text-sm">Nenhum jogador no roster ainda.</p>
            </div>
          ) : (
            <div className="divide-y divide-[#1E3A5F]/50">
              {sortedPlayers.map((p) => {
                const tierColor = TIER_HEX[(p.tier ?? "UNRANKED").toUpperCase()] ?? TIER_HEX.UNRANKED;
                const lane      = (p.lane ?? "").toUpperCase();
                return (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#0A1428]/60 transition-colors"
                  >
                    <div className="w-8 flex-shrink-0 flex flex-col items-center gap-0.5">
                      {ROLE_ICON_URL[lane] ? (
                        <img
                          src={ROLE_ICON_URL[lane]} alt={lane} width={20} height={20} loading="lazy"
                          className="w-5 h-5 opacity-60"
                          style={{ filter: "invert(1) sepia(1) saturate(1.5) hue-rotate(5deg)" }}
                        />
                      ) : (
                        <span className="text-gray-700 text-xs">—</span>
                      )}
                      {lane && (
                        <span className="text-[9px] text-gray-700 uppercase">
                          {ROLE_LABELS[lane] ?? lane}
                        </span>
                      )}
                    </div>

                    <PlayerAvatar iconId={p.profile_icon_id} name={p.summoner_name} size={44} ddVersion={DDRAGON} />

                    <div className="flex-1 min-w-0">
                      <p className="text-white font-semibold text-sm truncate">
                        {p.summoner_name}
                        <span className="text-gray-600 font-normal text-xs ml-1">#{p.tag_line}</span>
                        {p.team_role === "captain" && (
                          <span
                            className="ml-2 text-[10px] font-black uppercase px-1.5 py-0.5 rounded"
                            style={{ color: "#C8A84B", background: "rgba(200,168,75,0.15)", border: "1px solid rgba(200,168,75,0.3)" }}
                          >
                            CAP
                          </span>
                        )}
                      </p>
                      {p.summoner_level && (
                        <p className="text-gray-600 text-xs">Nível {p.summoner_level}</p>
                      )}
                    </div>

                    <div className="flex-shrink-0">
                      <TierBadge tier={p.tier} rank={p.rank} lp={p.lp} />
                      {p.wins != null && (p.wins + (p.losses ?? 0)) > 0 && (
                        <p className="text-gray-700 text-[10px] text-right mt-0.5">
                          {p.wins}W {p.losses}L
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* HISTÓRICO DE PARTIDAS */}
        {allMatches.length > 0 && (
          <div className="rounded-xl overflow-hidden" style={{ background: "#0D1B2E", border: "1px solid #1E3A5F" }}>
            <div className="px-4 py-3" style={{ borderBottom: "1px solid #1E3A5F" }}>
              <h2 className="text-white font-bold text-sm uppercase tracking-widest">Histórico de Partidas</h2>
            </div>
            <div className="divide-y divide-[#1E3A5F]/50">
              {allMatches.slice(0, 10).map((match) => {
                const isA       = match.side === "A";
                const opponent  = isA ? (match as any).team_b : (match as any).team_a;
                const scoreUs   = isA ? match.score_a : match.score_b;
                const scoreThem = isA ? match.score_b : match.score_a;
                const won       = match.winner_id === team.id;
                const finished  = match.status === "FINISHED";
                const tournament = (match as any).tournament;

                return (
                  <div
                    key={match.id}
                    className="flex items-center gap-3 px-4 py-3"
                    style={{
                      borderLeft: `3px solid ${!finished ? "#1E3A5F" : won ? "rgba(42,197,111,0.6)" : "rgba(205,69,69,0.6)"}`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {opponent?.logo_url && (
                          <img src={opponent.logo_url} alt={opponent.name} width={20} height={20}
                            loading="lazy" className="rounded w-5 h-5 object-cover flex-shrink-0" />
                        )}
                        <p className="text-white text-sm font-medium truncate">
                          vs <span className="text-[#C8A84B]">[{opponent?.tag ?? "?"}]</span>{" "}
                          {opponent?.name ?? "Desconhecido"}
                        </p>
                      </div>
                      <p className="text-gray-600 text-xs mt-0.5">
                        {tournament?.name ?? "Torneio"} · Rodada {match.round ?? "?"}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      {finished ? (
                        <p className="font-black text-base tabular-nums" style={{ color: won ? "#2AC56F" : "#CD4545" }}>
                          {won ? "V" : "D"}{" "}
                          <span className="text-white font-bold">{scoreUs ?? 0}–{scoreThem ?? 0}</span>
                        </p>
                      ) : match.status === "IN_PROGRESS" ? (
                        <span className="text-yellow-400 text-xs font-bold animate-pulse">AO VIVO</span>
                      ) : (
                        <span className="text-gray-600 text-xs">
                          {match.scheduled_at
                            ? new Date(match.scheduled_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                            : "Agendado"}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <Link href="/times" className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-400 text-sm transition-colors">
          ← Todos os times
        </Link>
      </div>
    </div>
  );
}
