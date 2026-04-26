/**
 * app/api/riot/tournament/events/route.ts
 *
 * GET /api/riot/tournament/events?code=BR1_XXXX
 *
 * Polling de eventos de lobby de uma partida de torneio.
 * Retorna todos os eventos: entrada/saída de jogadores, início e fim da partida.
 *
 * Use a cada 30s no frontend para detectar quando a partida finalizou.
 */
import { NextRequest, NextResponse } from "next/server";
import { getLobbyEvents } from "@/lib/riot-tournament";
import { riotErrorResponse } from "@/lib/riot-rate-limiter";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { error: "Parâmetro 'code' obrigatório. Ex: ?code=BR1_XXXX" },
      { status: 400 }
    );
  }

  try {
    const data = await getLobbyEvents(code);
    return NextResponse.json({
      ...data,
      // Adiciona flag de conveniência: partida iniciou?
      matchStarted: data.eventList.some(e => e.eventType === "Start"),
      // Jogadores que entraram no lobby
      playersInLobby: data.eventList
        .filter(e => e.eventType === "Practice")
        .map(e => e.summonerId),
    });
  } catch (err) {
    const { error, status, retryAfter } = riotErrorResponse(err);
    const headers: Record<string, string> = {
      // Sem cache — eventos de lobby são em tempo real
      "Cache-Control": "no-store, max-age=0",
    };
    if (retryAfter) headers["Retry-After"] = String(retryAfter);
    return NextResponse.json({ error }, { status, headers });
  }
}
