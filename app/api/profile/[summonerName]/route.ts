import { NextRequest, NextResponse } from 'next/server';
import {
  getAccountByRiotId,
  getSummonerByPuuid,
  getLeagueEntriesByPuuid,
  getTopMasteriesByPuuid,
  getMatchIdsByPuuid,
  getMatchById,
} from '@/lib/riot';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ summonerName: string }> }
) {
  const { summonerName } = await params;
  try {
    const raw = decodeURIComponent(summonerName);
    const [name, tag] = raw.includes('-') ? raw.split('-') : [raw, 'BR1'];

    const account = await getAccountByRiotId(name, tag);
    if (!account) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 });
    }

    const summoner = await getSummonerByPuuid(account.puuid);
    const ranked = await getLeagueEntriesByPuuid(account.puuid);
    const topMasteries = await getTopMasteriesByPuuid(account.puuid, 5);
    const matchIds = await getMatchIdsByPuuid(account.puuid, 10);

    const matchHistory = await Promise.all(
      matchIds.map(async (matchId: string) => {
        const match = await getMatchById(matchId);
        const participant = match.info.participants.find(
          (p: any) => p.puuid === account.puuid
        );
        if (!participant) return null;
        const durationMin = Math.round(match.info.gameDuration / 60);
        const kda =
          participant.deaths === 0
            ? 'Perfect'
            : ((participant.kills + participant.assists) / participant.deaths).toFixed(2);

        return {
          matchId,
          championName: participant.championName,
          championId: participant.championId,
          teamPosition: participant.teamPosition,
          gameMode: match.info.gameMode,
          kills: participant.kills,
          deaths: participant.deaths,
          assists: participant.assists,
          kda,
          win: participant.win,
          minutes: durationMin,
          items: [
            participant.item0, participant.item1, participant.item2,
            participant.item3, participant.item4, participant.item5,
            participant.item6
          ],
          cs: participant.totalMinionsKilled + (participant.neutralMinionsKilled || 0),
          vision: participant.visionScore,
          gold: participant.goldEarned,
          damage: participant.totalDamageDealtToChampions,
        };
      })
    );

    const soloQueue = ranked.find((r: any) => r.queueType === 'RANKED_SOLO_5x5');
    const flexQueue = ranked.find((r: any) => r.queueType === 'RANKED_FLEX_SR');

    return NextResponse.json({
      summonerName: name,
      tagLine: tag,
      puuid: account.puuid,
      profileIconId: summoner.profileIconId,
      summonerLevel: summoner.summonerLevel,
      topMasteries: topMasteries.map(m => ({
        championId: m.championId,
        championName: m.championName,
        masteryLevel: m.championLevel,
        masteryPoints: m.championPoints,
      })),
      rankedSolo: soloQueue
        ? { tier: soloQueue.tier, rank: soloQueue.rank, lp: soloQueue.leaguePoints, wins: soloQueue.wins, losses: soloQueue.losses }
        : null,
      rankedFlex: flexQueue
        ? { tier: flexQueue.tier, rank: flexQueue.rank, lp: flexQueue.leaguePoints, wins: flexQueue.wins, losses: flexQueue.losses }
        : null,
      matchHistory: matchHistory.filter(Boolean),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
