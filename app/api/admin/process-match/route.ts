import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { finalizeMatchIngestion } from "@/lib/actions/ingest-match";

export async function POST(req: Request) {
  const supabase = await createClient();

  // 1. Validar autenticação
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  // 2. Validar permissão de admin
  const { data: profile } = await supabase
    .from("profiles")
    .select("is_admin")
    .eq("id", user.id)
    .single();

  if (!profile?.is_admin) {
    return NextResponse.json({ error: "Acesso restrito a administradores" }, { status: 403 });
  }

  // 3. Validar payload
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

  // 4. Executar ingestão
  try {
    const result = await finalizeMatchIngestion(tournamentCode, parsedGameId);
    
    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true, data: result.data });
  } catch (err) {
    console.error("[ProcessMatch] Erro fatal:", err);
    return NextResponse.json({ error: "Erro interno ao processar partida" }, { status: 500 });
  }
}
