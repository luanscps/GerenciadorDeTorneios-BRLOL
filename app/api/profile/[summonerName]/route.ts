import { NextRequest, NextResponse } from 'next/server';
import { getRiotClient } from '@/lib/riot';

export async function GET(
  _req: NextRequest,
  { params }: { params: { summonerName: string } }
) {
  try {
    const raw = decodeURIComponent(params.summonerName);
    const [name, tag] = raw.includes('-') ? raw.split('-') : [raw, 'BR1'];

    const riot = getRiotClient();

    const account = await riot.getAccountByRiotId(name, tag);
    if (!account) {
      return NextResponse.json({ error: 'Jogador nao encontrado' }, { status: 404 });
    }

    const summoner = await riot.getSummonerByPuuid(account.puuid);
    const ranked = await riot.getRankedBySummonerId(summoner.id);
    const matchIds = await riot.getMatchIdsByPuuid(account.puuid, { count: 10 });

    const matchHistory = await Promise.all(
      matchIds.map(async (matchId: string) => {
        const match = await riot.getMatch(matchId);
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
          teamPosition: participant.teamPosition,
          gameMode: match.info.gameMode,
          kills: participant.kills,
          deaths: participant.deaths,
          assists: participant.assists,
          kda,
          win: participant.win,
          minutes: durationMin,
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
      rankedSolo: soloQueue
        ? { tier: soloQueue.tier, rank: soloQueue.rank, lp: soloQueue.leaguePoints, wins: soloQueue.wins, losses: soloQueue.losses }
        : null,
      rankedFlex: flexQueue
        ? { tier: flexQueue.tier, rank: flexQueue.rank, lp: flexQueue.leaguePoints, wins: flexQueue.wins, losses: flexQueue.losses }
        : null,
      matchHistory: matchHistory.filter(Boolean),
    });
  } catch (err) {
    console.error('[API profile]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
