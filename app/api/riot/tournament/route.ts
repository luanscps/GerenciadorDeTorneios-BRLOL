/**
 * app/api/riot/tournament/route.ts
 *
 * Endpoints REST para gerenciar torneios via tournament-stub-v5.
 *
 * POST /api/riot/tournament          → Criar provider + torneio (setup inicial)
 * GET  /api/riot/tournament?id=...   → Buscar detalhes de um torneio
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import {
  registerProvider,
  createTournament,
  setupTournament,
} from "@/lib/riot-tournament";
import { riotErrorResponse, RiotRateLimitError, RiotApiError } from "@/lib/riot-rate-limiter";

// ─── Helpers Supabase Auth ─────────────────────────────────────────────────────
async function isAdmin(): Promise<boolean> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return data?.role === "admin";
}

// ─── POST — Criar torneio completo (provider + tournament + codes) ─────────────
export async function POST(req: NextRequest) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  let body: {
    action?: string;
    tournamentName?: string;
    matchCount?: number;
    teamSize?: number;
    pickType?: string;
    mapType?: string;
    spectatorType?: string;
    providerId?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const { action = "setup" } = body;

  try {
    if (action === "setup") {
      // Fluxo completo: provider + torneio + codes
      const {
        tournamentName = "BRLOL Tournament",
        matchCount = 8,
        teamSize = 5,
        pickType = "TOURNAMENT_DRAFT",
        mapType = "SUMMONERS_RIFT",
        spectatorType = "ALL",
      } = body;

      const callbackUrl =
        process.env.NEXT_PUBLIC_APP_URL
          ? `${process.env.NEXT_PUBLIC_APP_URL}/api/riot/tournament/callback`
          : "https://gerenciador-de-torneios-brlol.vercel.app/api/riot/tournament/callback";

      const result = await setupTournament({
        tournamentName,
        callbackUrl,
        matchCount,
        codeParams: {
          teamSize,
          pickType: pickType as "TOURNAMENT_DRAFT",
          mapType: mapType as "SUMMONERS_RIFT",
          spectatorType: spectatorType as "ALL",
        },
      });

      return NextResponse.json({
        success: true,
        ...result,
        message: `Torneio "${tournamentName}" criado com ${result.codes.length} códigos (stub-v5).`,
      });
    }

    if (action === "provider") {
      const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL ?? "https://gerenciador-de-torneios-brlol.vercel.app"}/api/riot/tournament/callback`;
      const providerId = await registerProvider({
        region: (process.env.RIOT_REGION ?? "BR").toUpperCase(),
        url: callbackUrl,
      });
      return NextResponse.json({ success: true, providerId });
    }

    if (action === "tournament") {
      const { providerId, tournamentName = "BRLOL Tournament" } = body;
      if (!providerId) {
        return NextResponse.json({ error: "providerId é obrigatório" }, { status: 400 });
      }
      const tournamentId = await createTournament({ name: tournamentName, providerId });
      return NextResponse.json({ success: true, tournamentId });
    }

    return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
  } catch (err) {
    const { error, status, retryAfter } = riotErrorResponse(err);
    const headers: Record<string, string> = {};
    if (retryAfter) headers["Retry-After"] = String(retryAfter);
    return NextResponse.json({ error }, { status, headers });
  }
}
