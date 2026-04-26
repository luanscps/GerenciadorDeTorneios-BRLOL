/**
 * app/api/riot/tournament/callback/route.ts
 *
 * Webhook que a Riot chama via POST quando uma partida de torneio termina.
 * Registrado como 'url' no registerProvider().
 *
 * Payload recebido da Riot:
 * {
 *   startTime: number,       // epoch ms
 *   shortCode: string,       // tournament code usado
 *   metaData: string,        // metadata que você definiu no code
 *   gameId: number,
 *   gameName: string,
 *   gameType: string,
 *   gameMap: number,
 *   gameMode: string,
 *   region: string,
 *   gameVersion: string,
 *   platformId: string,
 *   gameCreation: number,
 *   gameLastUpdate: number,
 *   gameLength: number,
 *   participants: Array<{ summonerId, teamId, win, ... }>
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Cliente admin do Supabase (service_role) para gravar sem restrição de auth
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const shortCode = payload.shortCode as string | undefined;
  if (!shortCode) {
    return NextResponse.json({ error: "shortCode ausente" }, { status: 400 });
  }

  try {
    const supabase = getAdminClient();

    // Persiste o resultado bruto da partida para processamento posterior
    const { error } = await supabase
      .from("tournament_match_results")
      .upsert(
        {
          tournament_code: shortCode,
          game_id: payload.gameId,
          game_data: payload,
          processed: false,
          received_at: new Date().toISOString(),
        },
        { onConflict: "tournament_code" }
      );

    if (error) {
      console.error("[tournament/callback] Supabase error:", error.message);
      // Retorna 200 mesmo com erro de DB para a Riot não retentar indefinidamente
      return NextResponse.json({ received: true, dbError: error.message });
    }

    console.log(`[tournament/callback] Partida recebida: ${shortCode} (gameId: ${payload.gameId})`);
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Erro interno";
    console.error("[tournament/callback]", msg);
    return NextResponse.json({ received: true, error: msg });
  }
}
