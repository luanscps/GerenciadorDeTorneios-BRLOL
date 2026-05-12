import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesByPuuid,
  getTopMasteriesByPuuid,
  getMatchIdsByPuuid,
  getMatchById,
  getAllChampions,
  profileIconUrl,
  profileIconBorderStyle,
  championIconByCDragon,
  championSplashUrl,
  rankEmblemUrl,
  masteryLevelColor,
  getDDVersion,
} from "@/lib/riot";
import { createClient } from "@/lib/supabase/server";
import type { MatchParticipant } from "@/lib/riot";

// Aumenta timeout desta rota para 60s (evita FUNCTION_INVOCATION_TIMEOUT na Riot API)
export const maxDuration = 60;

const TIER_COLORS: Record<string, string> = {
  IRON: "#8B7A6B", BRONZE: "#CD7F32", SILVER: "#A8A9AD", GOLD: "#FFD700",
  PLATINUM: "#00E5CC", EMERALD: "#50C878", DIAMOND: "#99CCFF",
  MASTER: "#9B59B6", GRANDMASTER: "#E74C3C", CHALLENGER: "#00D4FF",
};

const QUEUE_NAMES: Record<number, string> = {
  420: "Solo/Duo Ranqueada", 440: "Flex 5v5 Ranqueada", 450: "ARAM",
  400: "Normal Draft", 430: "Normal Cega", 0: "Personalizada",
};

const POSITION_PT: Record<string, string> = {
  TOP: "Top", JUNGLE: "Jungle", MIDDLE: "Mid",
  BOTTOM: "ADC", UTILITY: "Suporte", NONE: "—",
};

function itemIconUrl(ddVersion: string, itemId: number): string {
  if (!itemId || itemId === 0) return "";
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/item/${itemId}.png`;
}

function fmtDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s.toString().padStart(2, "0")}s`;
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)    return `${diff}s atrás`;
  if (diff < 3600)  return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

/**
 * Limpa o gameName recebido na URL.
 * Caso o banco tenha gravado "Nick #TAG" como gameName e o tagLine
 * tenha sido extraído de lá, o gameName pode chegar com "#TAG" no final.
 * Esta função remove qualquer coisa a partir do '#'.
 */
function cleanGameName(raw: string): string {
  const idx = raw.indexOf('#');
  return idx !== -1 ? raw.slice(0, idx).trim() : raw.trim();
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ gameName: string; tagLine: string }>;
}) {
  const { gameName, tagLine } = await params;
  const name = cleanGameName(decodeURIComponent(gameName));
  const tag  = decodeURIComponent(tagLine);
  return {
    title: `${name}#${tag} — LoL Tournament BR`,
    description: `Perfil competitivo de ${name} no LoL Tournament BR`,
  };
}

export default async function PlayerProfilePage({
  params,
}: {
  params: Promise<{ gameName: string; tagLine: string }>;
}) {
  const { gameName: rawName, tagLine: rawTag } = await params;

  // Decodifica URL e limpa resquícios de '#TAG' no gameName
  const gameName = cleanGameName(decodeURIComponent(rawName));
  const tagLine  = decodeURIComponent(rawTag);

  // ── 1. Riot Account ────────────────────────────────────────────────────────
  let account;
  try {
    account = await getAccountByRiotId(gameName, tagLine);
  } catch {
    return notFound();
  }
  const { puuid } = account;

  // ── 2. Summoner + League + Masteries + Matches + Champions (paralelo) ──────
  const [summoner, leagueEntries, masteries, matchIds, champMap] = await Promise.allSettled([
    getSummonerByPuuid(puuid),
    getLeagueEntriesByPuuid(puuid),
    getTopMasteriesByPuuid(puuid, 7),
    // Reduzido de 10 para 5 para diminuir tempo total de SSR e evitar timeout
    getMatchIdsByPuuid(puuid, 5),
    getAllChampions(),
  ]);

  const sum    = summoner.status      === "fulfilled" ? summoner.value      : null;
  const ranks  = leagueEntries.status === "fulfilled" ? leagueEntries.value : [];
  const tops   = masteries.status     === "fulfilled" ? masteries.value     : [];
  const mIds   = matchIds.status      === "fulfilled" ? matchIds.value      : [];
  const champs = champMap.status      === "fulfilled" ? champMap.value      : {};

  const champById: Record<number, string> = {};
  for (const c of Object.values(champs)) champById[Number(c.key)] = c.name;

  // ── 3. Matches (até 5) ─────────────────────────────────────────────────────
  const matchResults = await Promise.allSettled(
    mIds.slice(0, 5).map((id) => getMatchById(id))
  );
  const matches = matchResults
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getMatchById>>> => r.status === "fulfilled")
    .map((r) => r.value);

  // ── 4. Assets ──────────────────────────────────────────────────────────────
  const ddVersion   = await getDDVersion();
  const iconUrl     = sum ? await profileIconUrl(sum.profileIconId) : null;
  const level       = sum?.summonerLevel ?? 0;
  const borderStyle = profileIconBorderStyle(level);

  const rankSolo = ranks.find((r) => r.queueType === "RANKED_SOLO_5x5") ?? null;
  const rankFlex = ranks.find((r) => r.queueType === "RANKED_FLEX_SR")  ?? null;

  const mainChampName = tops[0] ? (champById[tops[0].championId] ?? tops[0].championName) : null;
  const mainSplash    = mainChampName ? championSplashUrl(mainChampName, 0) : null;

  // ── 5. Busca perfil interno (opcional) ────────────────────────────────────
  const supabase = await createClient();
  const { data: riotRow } = await supabase
    .from("riot_accounts")
    .select(`id, profile_id, profiles ( full_name ), champion_masteries ( champion_id, champion_name, mastery_level, mastery_points )`)
    .ilike("game_name", gameName)
    .ilike("tag_line",  tagLine)
    .maybeSingle();

  // ── 6. Stats rápidas ───────────────────────────────────────────────────────
  const myMatches = matches
    .map((m) => ({ match: m, me: m.info.participants.find((p: MatchParticipant) => p.puuid === puuid) }))
    .filter((x) => x.me !== undefined);

  const totalGames  = myMatches.length;
  const totalWins   = myMatches.filter((x) => x.me!.win).length;
  const totalLosses = totalGames - totalWins;
  const recentWR    = totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0;
  const avgKDA      = totalGames > 0
    ? (myMatches.reduce((acc, x) => acc + (x.me!.kills + x.me!.assists) / Math.max(1, x.me!.deaths), 0) / totalGames).toFixed(2)
    : "0.00";

  return (
    <div className="min-h-screen bg-[#050E1A]">
      <style>{`
        @keyframes glow-pulse {
          0%, 100% { opacity:1; box-shadow: 0 0 0 3px var(--border-color), 0 0 12px 2px var(--border-glow); }
          50%       { opacity:.9; box-shadow: 0 0 0 3px var(--border-color), 0 0 22px 6px var(--border-glow); }
        }
        .icon-border-anim { animation: glow-pulse 2.6s ease-in-out infinite; border-radius: 50%; }
        .match-row:hover { background: rgba(30,58,95,0.5); }
        .stat-pill {
          display:inline-flex; align-items:center; gap:4px;
          background:rgba(200,168,75,0.1); border:1px solid rgba(200,168,75,0.25);
          border-radius:9999px; padding:3px 10px; font-size:12px; color:#C8A84B;
          font-weight:600; white-space:nowrap;
        }
      `}</style>

      {/* HERO BANNER */}
      <div className="relative w-full overflow-hidden" style={{ minHeight: 260 }}>
        {mainSplash ? (
          <div style={{ position:"absolute", inset:0, backgroundImage:`url(${mainSplash})`, backgroundSize:"cover", backgroundPosition:"center 15%", filter:"brightness(0.35) saturate(1.2)" }} />
        ) : (
          <div style={{ position:"absolute", inset:0, background:"#050E1A" }} />
        )}
        <div style={{ position:"absolute", inset:0, background:"linear-gradient(to bottom, transparent 40%, #050E1A 100%)" }} />

        <div className="relative max-w-6xl mx-auto px-4 pt-10 pb-8" style={{ display:"flex", alignItems:"flex-end", gap:24, flexWrap:"wrap" }}>
          {/* Ícone com moldura CSS (sem depender de imagem externa) */}
          <div style={{ position:"relative", width:110, height:126, flexShrink:0 }}>
            {iconUrl && (
              <>
                <img
                  src={iconUrl}
                  width={86} height={86}
                  alt="Ícone de perfil"
                  className="icon-border-anim"
                  style={{
                    position:"absolute", top:8, left:12,
                    width:86, height:86,
                    display:"block", zIndex:1,
                    ["--border-color" as string]: borderStyle.color,
                    ["--border-glow" as string]: borderStyle.glow,
                  } as React.CSSProperties}
                />
                <span style={{
                  position:"absolute", bottom:0, left:"50%",
                  transform:"translateX(-50%)",
                  zIndex:3,
                  background:"#050E1A",
                  border:`1.5px solid ${borderStyle.color}`,
                  color:borderStyle.color,
                  fontSize:11, fontWeight:700,
                  padding:"2px 10px",
                  borderRadius:9999, lineHeight:"16px",
                  whiteSpace:"nowrap",
                  boxShadow:`0 0 8px ${borderStyle.glow}`,
                }}>
                  Nv. {level}
                </span>
              </>
            )}
          </div>

          {/* Nome + stats */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, flexWrap:"wrap", marginBottom:6 }}>
              <h1 style={{ fontSize:28, fontWeight:800, color:"#fff", lineHeight:1.1, letterSpacing:"-0.5px" }}>
                {account.gameName}
              </h1>
              <span style={{ color:"#6B7280", fontSize:22, fontWeight:700 }}>#{account.tagLine}</span>
              {mainChampName && <span className="stat-pill">⚔️ {mainChampName}</span>}
            </div>
            <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
              {totalGames > 0 && (
                <>
                  <span className="stat-pill">{totalGames} jogos recentes</span>
                  <span className="stat-pill" style={{
                    background: recentWR >= 50 ? "rgba(74,222,128,0.1)" : "rgba(248,113,113,0.1)",
                    borderColor: recentWR >= 50 ? "rgba(74,222,128,0.3)" : "rgba(248,113,113,0.3)",
                    color: recentWR >= 50 ? "#4ADE80" : "#F87171",
                  }}>
                    {totalWins}V {totalLosses}D · {recentWR}% WR
                  </span>
                  <span className="stat-pill">KDA médio {avgKDA}</span>
                </>
              )}
              {riotRow?.profiles && (
                <span className="stat-pill" style={{ color:"#60A5FA", borderColor:"rgba(96,165,250,0.3)", background:"rgba(96,165,250,0.1)" }}>
                  👤 {(riotRow.profiles as any).full_name}
                </span>
              )}
            </div>
          </div>

          <Link href="/jogadores" style={{ fontSize:13, color:"#9CA3AF", border:"1px solid #1E3A5F", borderRadius:8, padding:"6px 14px", background:"rgba(10,20,40,0.7)", textDecoration:"none", flexShrink:0, alignSelf:"flex-start", marginTop:4 }}>
            ← Jogadores
          </Link>
        </div>
      </div>

      {/* CORPO */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* RANK CARDS */}
        {(rankSolo || rankFlex) && (
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill, minmax(280px, 1fr))", gap:16 }}>
            {[rankSolo, rankFlex].filter(Boolean).map((r) => {
              const tier  = r!.tier;
              const color = TIER_COLORS[tier] ?? "#fff";
              const total = r!.wins + r!.losses;
              const wr    = total > 0 ? Math.round((r!.wins / total) * 100) : 0;
              return (
                <div key={r!.queueType} style={{ background:"#0A1428", border:"1px solid rgba(30,58,95,0.8)", borderRadius:16, padding:"20px 20px 20px 16px", display:"flex", alignItems:"center", gap:16, position:"relative", overflow:"hidden" }}>
                  <div style={{ position:"absolute", left:0, top:16, bottom:16, width:3, borderRadius:9999, background:color, boxShadow:`0 0 10px ${color}88` }} />
                  <img
                    src={rankEmblemUrl(tier)}
                    width={80} height={80}
                    alt={tier}
                    style={{ width:80, height:80, objectFit:"contain", flexShrink:0 }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                  />
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ color:"#9CA3AF", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:4 }}>
                      {r!.queueType === "RANKED_SOLO_5x5" ? "Solo / Duo" : "Flex 5v5"}
                    </p>
                    <p style={{ fontSize:22, fontWeight:800, color, lineHeight:1.1, marginBottom:2 }}>
                      {tier} <span style={{ fontSize:18 }}>{r!.rank}</span>
                    </p>
                    <p style={{ fontSize:14, color:"#fff", fontWeight:600, marginBottom:6 }}>{r!.leaguePoints} LP</p>
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <div style={{ flex:1, height:5, borderRadius:9999, background:"#1E3A5F", overflow:"hidden" }}>
                        <div style={{ width:`${wr}%`, height:"100%", borderRadius:9999, background: wr >= 50 ? "#4ADE80" : "#F87171" }} />
                      </div>
                      <span style={{ fontSize:12, color: wr >= 50 ? "#4ADE80" : "#F87171", fontWeight:700, minWidth:38 }}>{wr}%</span>
                    </div>
                    <p style={{ fontSize:11, color:"#6B7280", marginTop:4 }}>{r!.wins}V · {r!.losses}D · {total} jogos</p>
                    <div style={{ display:"flex", gap:4, flexWrap:"wrap", marginTop:8 }}>
                      {r!.hotStreak && <span style={{ fontSize:10, background:"rgba(249,115,22,0.15)", color:"#FB923C", border:"1px solid rgba(249,115,22,0.3)", borderRadius:9999, padding:"2px 7px", fontWeight:700 }}>🔥 Hot Streak</span>}
                      {r!.veteran   && <span style={{ fontSize:10, background:"rgba(200,168,75,0.12)", color:"#C8A84B", border:"1px solid rgba(200,168,75,0.3)", borderRadius:9999, padding:"2px 7px", fontWeight:700 }}>⚔️ Veterano</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TOP CAMPEÕES */}
        {tops.length > 0 && (
          <div style={{ background:"#0A1428", border:"1px solid rgba(30,58,95,0.8)", borderRadius:16, padding:"20px" }}>
            <p style={{ color:"#9CA3AF", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em", marginBottom:14 }}>🏆 Top Campeões — Maestria</p>
            <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
              {tops.map((m) => {
                const name  = champById[m.championId] ?? m.championName;
                const color = masteryLevelColor(m.championLevel);
                const pts   = m.championPoints >= 1_000_000 ? `${(m.championPoints/1_000_000).toFixed(1)}M`
                            : m.championPoints >= 1000      ? `${(m.championPoints/1000).toFixed(0)}k`
                            : String(m.championPoints);
                return (
                  <div key={m.championId} style={{ display:"flex", flexDirection:"column", alignItems:"center", gap:4, background:"rgba(10,20,40,0.7)", border:`1.5px solid ${color}44`, borderRadius:12, padding:"10px 10px 8px", minWidth:76 }} title={`${name} — M${m.championLevel} — ${pts}`}>
                    <div style={{ position:"relative", width:52, height:52 }}>
                      <img src={championIconByCDragon(m.championId)} width={52} height={52} alt={name} style={{ width:52, height:52, borderRadius:8, objectFit:"cover", display:"block", border:`2px solid ${color}` }} />
                      <span style={{ position:"absolute", bottom:-6, right:-6, background:"#050E1A", border:`1px solid ${color}`, color, fontSize:9, fontWeight:800, borderRadius:9999, padding:"1px 5px", lineHeight:"14px", whiteSpace:"nowrap", zIndex:2 }}>M{m.championLevel}</span>
                    </div>
                    <p style={{ fontSize:11, color:"#D1D5DB", maxWidth:72, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap", textAlign:"center", marginTop:8 }}>{name}</p>
                    <p style={{ fontSize:11, color, fontWeight:700, textAlign:"center" }}>{pts}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* HISTÓRICO */}
        {myMatches.length > 0 && (
          <div style={{ background:"#0A1428", border:"1px solid rgba(30,58,95,0.8)", borderRadius:16, overflow:"hidden" }}>
            <div style={{ padding:"16px 20px 12px", borderBottom:"1px solid rgba(30,58,95,0.6)" }}>
              <p style={{ color:"#9CA3AF", fontSize:11, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.1em" }}>📋 Histórico Recente ({myMatches.length} partidas)</p>
            </div>
            <div>
              {myMatches.map(({ match, me }) => {
                const p         = me!;
                const win       = p.win;
                const kda       = ((p.kills + p.assists) / Math.max(1, p.deaths)).toFixed(2);
                const champName = champById[p.championId] ?? p.championName;
                const queueName = QUEUE_NAMES[match.info.queueId] ?? `Fila ${match.info.queueId}`;
                const duration  = fmtDuration(match.info.gameDuration);
                const ago       = timeAgo(match.info.gameStartTimestamp);
                const items     = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5];
                const pos       = POSITION_PT[p.teamPosition] ?? POSITION_PT[p.individualPosition] ?? "—";
                return (
                  <div key={match.metadata.matchId} className="match-row" style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", borderBottom:"1px solid rgba(30,58,95,0.4)", transition:"background 0.15s", borderLeft:`3px solid ${win ? "#22C55E" : "#EF4444"}` }}>
                    <div style={{ width:36, flexShrink:0, textAlign:"center", fontSize:12, fontWeight:800, color: win ? "#4ADE80" : "#F87171" }}>{win ? "V" : "D"}</div>
                    <div style={{ position:"relative", flexShrink:0 }}>
                      <img src={championIconByCDragon(p.championId)} width={44} height={44} alt={champName} style={{ width:44, height:44, borderRadius:8, objectFit:"cover", display:"block", border:`2px solid ${win ? "#22C55E44" : "#EF444444"}` }} />
                      {pos !== "—" && <span style={{ position:"absolute", bottom:-4, right:-4, background:"#050E1A", fontSize:8, fontWeight:700, color:"#C8A84B", border:"1px solid #1E3A5F", borderRadius:4, padding:"1px 3px", lineHeight:1.2 }}>{pos}</span>}
                    </div>
                    <div style={{ minWidth:90, flexShrink:0 }}>
                      <p style={{ fontSize:14, fontWeight:700, color:"#fff", lineHeight:1 }}>{p.kills} / <span style={{ color:"#F87171" }}>{p.deaths}</span> / {p.assists}</p>
                      <p style={{ fontSize:11, color:"#9CA3AF", marginTop:2 }}>KDA <span style={{ color: Number(kda) >= 3 ? "#4ADE80" : "#9CA3AF", fontWeight:700 }}>{kda}</span></p>
                    </div>
                    <div style={{ display:"flex", gap:3, flexShrink:0, flexWrap:"wrap", maxWidth:180 }}>
                      {items.map((itemId, idx) => (
                        <div key={idx} style={{ width:24, height:24, background: itemId ? "#0A1E38" : "rgba(30,58,95,0.3)", borderRadius:4, overflow:"hidden", border:"1px solid rgba(30,58,95,0.6)", flexShrink:0 }}>
                          {itemId > 0 && <img src={itemIconUrl(ddVersion, itemId)} width={24} height={24} alt="" style={{ width:24, height:24, display:"block" }} />}
                        </div>
                      ))}
                    </div>
                    <div style={{ marginLeft:"auto", textAlign:"right", flexShrink:0 }}>
                      <p style={{ fontSize:11, color:"#9CA3AF", lineHeight:1 }}>{queueName}</p>
                      <p style={{ fontSize:11, color:"#6B7280", marginTop:2 }}>{duration} · {ago}</p>
                      {p.pentaKills > 0 && <p style={{ fontSize:11, color:"#FFD700", fontWeight:700, marginTop:2 }}>PENTA KILL 🎉</p>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {totalGames === 0 && (
          <div style={{ textAlign:"center", padding:"60px 20px", color:"#4B5563" }}>
            <p style={{ fontSize:40, marginBottom:12 }}>🎮</p>
            <p style={{ fontSize:16, fontWeight:600 }}>Nenhuma partida recente encontrada</p>
            <p style={{ fontSize:13, marginTop:6 }}>Os dados são atualizados automaticamente.</p>
          </div>
        )}
      </div>
    </div>
  );
}
