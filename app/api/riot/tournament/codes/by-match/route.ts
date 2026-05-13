/**
 * app/api/riot/tournament/codes/by-match/route.ts
 *
 * POST /api/riot/tournament/codes/by-match
 *
 * Gera (ou retorna do cache) os tournament codes de UMA partida específica.
 *
 * Regras de negócio:
 *  - Idempotente: se codes válidos já existem, retorna sem chamar a Riot API.
 *  - Quantidade de codes = match.best_of (BO1→1, BO3→3, BO5→5).
 *  - Se codes estiverem expirados (>90d) ou force_regenerate=true, regera.
 *  - Apenas admin ou organizer do torneio podem chamar este endpoint.
 *
 * Body (JSON):
 * {
 *   match_id:          string  // UUID do match
 *   force_regenerate?: boolean // default false
 *   lock_participants?: boolean // default true — adiciona PUUIDs ao allowedParticipants
 * }
 *
 * Response 200:
 * {
 *   success: true,
 *   match_id: string,
 *   codes: TournamentCodeEntry[],
 *   generated_at: string,
 *   expire_at: string,
 *   from_cache: boolean,
 *   regenerated: boolean
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateCodesForMatch } from "@/lib/tournament-codes-manager";
import { GenerateByMatchBodySchema } from "@/lib/validations/tournament-codes.schema";
import { riotErrorResponse } from "@/lib/riot-rate-limiter";
import { ZodError } from "zod";

// ── Auth helper ────────────────────────────────────────────────────────────────
async function getAuthContext(): Promise<{
  userId: string | null;
  role: string | null;
}> {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null };

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { userId: user.id, role: data?.role ?? null };
}

/**
 * Verifica se o usuário é admin OU organizer do torneio ao qual o match pertence.
 */
async function canGenerateCodes(
  userId: string,
  role: string | null,
  matchId: string
): Promise<boolean> {
  if (role === "admin") return true;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  // Verifica se userId é organizer_id do torneio deste match
  const { data } = await supabase
    .from("matches")
    .select("tournaments!inner(organizer_id)")
    .eq("id", matchId)
    .single();

  const organizerId = (data?.tournaments as any)?.organizer_id;
  return organizerId === userId;
}

// ── POST handler ───────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  // 1. Auth
  const { userId, role } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // 2. Parse + validação Zod
  let body: ReturnType<typeof GenerateByMatchBodySchema.parse>;
  try {
    const raw = await req.json();
    body = GenerateByMatchBodySchema.parse(raw);
  } catch (err) {
    if (err instanceof ZodError) {
      return NextResponse.json(
        { error: "Dados inválidos", details: err.flatten().fieldErrors },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  // 3. Autorização
  const authorized = await canGenerateCodes(userId, role, body.match_id);
  if (!authorized) {
    return NextResponse.json(
      { error: "Sem permissão. Apenas admin ou organizer do torneio." },
      { status: 403 }
    );
  }

  // 4. Gerar codes
  try {
    const result = await generateCodesForMatch(body.match_id, {
      forceRegenerate: body.force_regenerate,
      lockParticipants: body.lock_participants,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    // Erros da Riot API (rate limit, 400, 403, etc)
    if (
      err instanceof Error &&
      (err.message.includes("Riot") ||
        err.message.includes("tournament") ||
        err.message.includes("registration"))
    ) {
      const { error, status, retryAfter } = riotErrorResponse(err);
      const headers: Record<string, string> = {};
      if (retryAfter) headers["Retry-After"] = String(retryAfter);
      return NextResponse.json({ error }, { status, headers });
    }

    const message = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
