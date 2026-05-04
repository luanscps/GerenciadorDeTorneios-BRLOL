import { NextResponse } from "next/server";
import { finalizeMatchIngestion } from "@/lib/actions/ingest-match";

export async function POST(req: Request) {
  // 1. Validação de segurança interna
  const secret = req.headers.get("x-internal-secret");
  if (!secret || secret !== process.env.INTERNAL_SECRET) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // 2. Validar payload
  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const { tournamentCode, gameId } = body;
  if (!tournamentCode || typeof tournamentCode !== 'string') {
    return NextResponse.json({ error: "tournamentCode inválido" }, { status: 400 });
  }

  // Conversão e validação do gameId
  const parsedGameId = typeof gameId === 'string' ? parseInt(gameId, 10) : gameId;
  if (typeof parsedGameId !== 'number' || !Number.isFinite(parsedGameId)) {
    return NextResponse.json({ error: "gameId deve ser um número válido" }, { status: 400 });
  }

  // 3. Executar ingestão
  try {
    const result = await finalizeMatchIngestion(tournamentCode, parsedGameId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[InternalProcessMatch] Erro fatal:", err);
    return NextResponse.json({ error: "Erro interno ao processar partida" }, { status: 500 });
  }
}
