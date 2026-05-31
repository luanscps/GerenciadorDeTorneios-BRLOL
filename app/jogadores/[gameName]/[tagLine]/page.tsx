import { notFound } from "next/navigation";
import {
  getAccountByRiotId, getSummonerByPuuid, getLeagueEntriesByPuuid,
  getTopMasteriesByPuuid, getMatchIdsByPuuid, getMatchById,
  getAllChampions, profileIconUrl, profileIconBorderStyle,
  profileBorderUrl, championSplashUrl,
} from "@/lib/riot";
import { createClient } from "@/lib/supabase/server";
import type { MatchParticipant } from "@/lib/riot";
import { HeroBanner }   from "@/components/profile/HeroBanner";
import { RankCard }     from "@/components/profile/RankCard";
import { MasteryGrid }  from "@/components/profile/MasteryGrid";
import { MatchRow }     from "@/components/profile/MatchRow";
import { ClipboardList, Gamepad2 } from "lucide-react";

export const maxDuration = 60;

function cleanGameName(raw: string): string {
  const idx = raw.indexOf('#');
  return idx !== -1 ? raw.slice(0, idx).trim() : raw.trim();
}

export async function generateMetadata({
  params,
}: { params: Promise<{ gameName: string; tagLine: string }> }) {
  const { gameName, tagLine } = await params;
  const name = cleanGameName(decodeURIComponent(gameName));
  const tag  = decodeURIComponent(tagLine);
  return {
    title: `${name}#${tag} — ArenaGG`,
    description: `Perfil competitivo de ${name} no ArenaGG`,
  };
}

export default async function PlayerProfilePage({
  params,
}: { params: Promise<{ gameName: string; tagLine: string }> }) {
  const { gameName: rawName, tagLine: rawTag } = await params;
  const gameName = cleanGameName(decodeURIComponent(rawName));
  const tagLine  = decodeURIComponent(rawTag);

  let account;
  try { account = await getAccountByRiotId(gameName, tagLine); }
  catch { return notFound(); }
  const { puuid } = account;

  const [summoner, leagueEntries, masteries, matchIds, champMap] = await Promise.allSettled([
    getSummonerByPuuid(puuid),
    getLeagueEntriesByPuuid(puuid),
    getTopMasteriesByPuuid(puuid, 7),
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

  const matchResults = await Promise.allSettled(mIds.slice(0, 5).map((id) => getMatchById(id)));
  const matches = matchResults
    .filter((r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof getMatchById>>> => r.status === "fulfilled")
    .map((r) => r.value);

  const iconUrl     = sum ? await profileIconUrl(sum.profileIconId) : null;
  const level       = sum?.summonerLevel ?? 0;
  const borderStyle = profileIconBorderStyle(level);
  const borderImg   = level > 0 ? profileBorderUrl(level) : null;

  const rankSolo = ranks.find((r) => r.queueType === "RANKED_SOLO_5x5") ?? null;
  const rankFlex = ranks.find((r) => r.queueType === "RANKED_FLEX_SR")  ?? null;

  const mainChampName = tops[0] ? (champById[tops[0].championId] ?? tops[0].championName) : null;
  const mainSplash    = mainChampName ? championSplashUrl(mainChampName, 0) : null;

  // Busca conta vinculada no ArenaGG via puuid (fonte de verdade)
  const supabase = await createClient();
  const { data: riotRows } = await supabase
    .from("riot_accounts")
    .select(`puuid, players ( id ), profiles ( full_name )`)
    .eq("puuid", puuid)
    .limit(1);
  const riotRow = riotRows?.[0] ?? null;
  // linkedProfileName: nome do perfil ArenaGG vinculado, ou null se não vinculado
  const linkedProfileName: string | null = (riotRow?.profiles as any)?.full_name ?? null;

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
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* HERO BANNER */}
      <HeroBanner
        gameName={account.gameName}
        tagLine={account.tagLine}
        level={level}
        iconUrl={iconUrl}
        borderImg={borderImg}
        borderStyle={borderStyle}
        mainSplash={mainSplash}
        mainChampName={mainChampName ?? null}
        totalGames={totalGames}
        totalWins={totalWins}
        totalLosses={totalLosses}
        recentWR={recentWR}
        avgKDA={avgKDA}
        linkedProfileName={linkedProfileName}
      />

      {/* CORPO */}
      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">

        {/* RANK CARDS */}
        {(rankSolo || rankFlex) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 16 }}>
            {[rankSolo, rankFlex].filter(Boolean).map((r) => (
              <RankCard key={r!.queueType} r={r!} />
            ))}
          </div>
        )}

        {/* MAESTRIA */}
        <MasteryGrid masteries={tops} champById={champById} />

        {/* HISTÓRICO */}
        {myMatches.length > 0 && (
          <div
            className="card"
            style={{ padding: 0, overflow: "hidden", borderRadius: "var(--radius-lg)" }}
          >
            <div
              style={{
                padding: "16px 20px 12px",
                borderBottom: "1px solid var(--border-soft, rgba(30,58,95,0.5))",
              }}
            >
              <p
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "var(--text-muted)",
                  fontSize: "var(--text-xs)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                }}
              >
                <ClipboardList size={13} />
                Histórico Recente ({myMatches.length} partidas)
              </p>
            </div>
            <div>
              {myMatches.map(({ match, me }) => (
                <MatchRow
                  key={match.metadata.matchId}
                  matchId={match.metadata.matchId}
                  win={me!.win}
                  championId={me!.championId}
                  championName={me!.championName}
                  kills={me!.kills}
                  deaths={me!.deaths}
                  assists={me!.assists}
                  teamPosition={me!.teamPosition}
                  individualPosition={me!.individualPosition}
                  items={[me!.item0, me!.item1, me!.item2, me!.item3, me!.item4, me!.item5]}
                  queueId={match.info.queueId}
                  gameDuration={match.info.gameDuration}
                  gameStartTimestamp={match.info.gameStartTimestamp}
                  pentaKills={me!.pentaKills}
                  champById={champById}
                />
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {totalGames === 0 && (
          <div className="card text-center" style={{ padding: "60px 20px" }}>
            <div
              className="mx-auto mb-4 flex items-center justify-center animate-float"
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--radius-xl)",
                background: "var(--gold-dim, rgba(200,168,75,0.08))",
                border: "1px solid var(--border-gold, rgba(200,168,75,0.2))",
                color: "var(--gold)",
              }}
            >
              <Gamepad2 size={28} />
            </div>
            <p
              style={{
                fontFamily: "var(--font-display)",
                fontSize: "var(--text-base)",
                fontWeight: 600,
                color: "var(--text)",
                marginBottom: "var(--sp-2)",
              }}
            >
              Nenhuma partida recente encontrada
            </p>
            <p style={{ fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
              Os dados são atualizados automaticamente.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
