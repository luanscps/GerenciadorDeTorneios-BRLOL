/**
 * app/api/riot/tournament/codes/by-stage/route.ts
 *
 * POST /api/riot/tournament/codes/by-stage
 *
 * Gera tournament codes para TODAS as partidas de uma stage de uma só vez.
 *
 * Útil para:
 *  - Início de uma fase (ex: semifinais): gerar os codes de todas as partidas
 *    simultaneamente para que os capitães já tenham os codes disponíveis.
 *  - Re-geração em massa após mudança de lineup.
 *
 * Comportamento:
 *  - Processa em série para respeitar rate-limit da Riot API.
 *  - Partidas com status FINISHED são ignoradas.
 *  - Por padrão, matches com codes válidos são pulados (skip_valid=true).
 *  - Erros em matches individuais não abortam os demais (retorna errors[]).
 *
 * Body (JSON):
 * {
 *   stage_id:          string  // UUID da stage
 *   force_regenerate?: boolean // default false
 *   lock_participants?: boolean // default true
 *   skip_valid?:       boolean // default true
 * }
 *
 * Response 200:
 * {
 *   success: true,
 *   stage_id: string,
 *   total_matches: number,
 *   processed: number,
 *   skipped: number,    // matches pulados por já terem codes válidos
 *   failed: number,
 *   results: GenerateCodesForMatchResult[],
 *   errors: { match_id: string, error: string }[]
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { generateCodesForStage } from "@/lib/tournament-codes-manager";
import { GenerateByStageBodySchema } from "@/lib/validations/tournament-codes.schema";
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
 * Verifica se userId é admin OU organizer do torneio que contém esta stage.
 */
async function canGenerateCodesForStage(
  userId: string,
  role: string | null,
  stageId: string
): Promise<boolean> {
  if (role === "admin") return true;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  const { data } = await supabase
    .from("tournament_stages")
    .select("tournaments!inner(organizer_id)")
    .eq("id", stageId)
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
  let body: ReturnType<typeof GenerateByStageBodySchema.parse>;
  try {
    const raw = await req.json();
    body = GenerateByStageBodySchema.parse(raw);
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
  const authorized = await canGenerateCodesForStage(userId, role, body.stage_id);
  if (!authorized) {
    return NextResponse.json(
      { error: "Sem permissão. Apenas admin ou organizer do torneio." },
      { status: 403 }
    );
  }

  // 4. Gerar codes em série
  try {
    const stageResult = await generateCodesForStage(body.stage_id, {
      forceRegenerate: body.force_regenerate,
      lockParticipants: body.lock_participants,
      skipValid: body.skip_valid,
    });

    const skipped = stageResult.results.filter((r) => r.from_cache).length;
    const processed = stageResult.results.filter((r) => !r.from_cache).length;
    const failed = stageResult.errors.length;

    return NextResponse.json({
      success: true,
      stage_id: body.stage_id,
      total_matches: stageResult.total_matches,
      processed,
      skipped,
      failed,
      results: stageResult.results,
      errors: stageResult.errors,
    });
  } catch (err) {
    const { error, status, retryAfter } = riotErrorResponse(err);
    const headers: Record<string, string> = {};
    if (retryAfter) headers["Retry-After"] = String(retryAfter);
    return NextResponse.json({ error }, { status, headers });
  }
}
