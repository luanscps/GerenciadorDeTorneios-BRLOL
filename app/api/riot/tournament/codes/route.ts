/**
 * app/api/riot/tournament/codes/route.ts
 *
 * POST /api/riot/tournament/codes          → Gerar tournament codes (raw)
 * GET  /api/riot/tournament/codes?code=... → Buscar detalhes de um code
 * PUT  /api/riot/tournament/codes?code=... → Atualizar configurações de um code
 *
 * Autorização:
 *  - GET: qualquer usuário autenticado
 *  - POST/PUT: admin global OU organizer do torneio (via tournamentId no body)
 *
 * NOTA: Para gerar codes vinculados a um match específico (com idempotência,
 * cache e bind automático ao banco), prefira POST /api/riot/tournament/codes/by-match.
 * Este endpoint é para uso raw/manual.
 */
import { NextRequest, NextResponse } from "next/server";
import {
  generateTournamentCodes,
  getTournamentCode,
  updateTournamentCode,
  TournamentCodeParameters,
} from "@/lib/riot-tournament";
import { riotErrorResponse } from "@/lib/riot-rate-limiter";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// ── Auth helper ─────────────────────────────────────────────────────────────────

async function getAuthUser(): Promise<{
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
 * Verifica se o usuário pode operar sobre um tournamentId específico:
 * admin global OU organizer_id do torneio.
 */
async function canManageTournament(
  userId: string,
  role: string | null,
  tournamentId: number
): Promise<boolean> {
  if (role === "admin") return true;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );

  // Buscar torneio pelo riot_tournament_id registrado
  const { data } = await supabase
    .from("riot_tournament_registrations")
    .select("tournaments!inner(organizer_id)")
    .eq("riot_tournament_id", String(tournamentId))
    .single();

  const organizerId = (data?.tournaments as any)?.organizer_id;
  return organizerId === userId;
}

// ── GET — Buscar detalhes de um tournament code ────────────────────────────

export async function GET(req: NextRequest) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { error: "Parâmetro 'code' obrigatório. Ex: ?code=BR1_XXXX" },
      { status: 400 }
    );
  }

  try {
    const data = await getTournamentCode(code);
    return NextResponse.json(data);
  } catch (err) {
    const { error, status } = riotErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}

// ── POST — Gerar novos tournament codes (raw) ────────────────────────────

export async function POST(req: NextRequest) {
  const { userId, role } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  let rawBody: {
    tournamentId?: number;
    count?: number;
    teamSize?: number;
    pickType?: string;
    mapType?: string;
    spectatorType?: string;
    /** @deprecated Use allowedParticipants (PUUIDs) — mantido para compatibilidade de frontend legado */
    allowedSummonerIds?: string[];
    allowedParticipants?: string[];
    metadata?: string;
  };

  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  const {
    tournamentId,
    count = 1,
    teamSize = 5,
    pickType = "TOURNAMENT_DRAFT",
    mapType = "SUMMONERS_RIFT",
    spectatorType = "ALL",
    metadata,
  } = rawBody;

  if (!tournamentId) {
    return NextResponse.json(
      { error: "tournamentId é obrigatório" },
      { status: 400 }
    );
  }

  if (count < 1 || count > 1000) {
    return NextResponse.json(
      { error: "count deve ser entre 1 e 1000" },
      { status: 400 }
    );
  }

  // FIX: verificar admin OU organizer do torneio (antes só admin)
  const authorized = await canManageTournament(userId, role, tournamentId);
  if (!authorized) {
    return NextResponse.json(
      { error: "Sem permissão. Apenas admin ou organizer do torneio." },
      { status: 403 } // FIX: 403 (proibido) e não 401 (não autenticado)
    );
  }

  // Alias legado: se vier allowedSummonerIds, usa como allowedParticipants
  // A Riot v5 só aceita PUUIDs em allowedParticipants
  const allowedParticipants =
    rawBody.allowedParticipants ?? rawBody.allowedSummonerIds;

  const params: TournamentCodeParameters = {
    teamSize,
    pickType: pickType as TournamentCodeParameters["pickType"],
    mapType: mapType as TournamentCodeParameters["mapType"],
    spectatorType: spectatorType as TournamentCodeParameters["spectatorType"],
    ...(allowedParticipants?.length ? { allowedParticipants } : {}),
    ...(metadata ? { metadata } : {}),
  };

  try {
    const codes = await generateTournamentCodes(tournamentId, count, params);
    return NextResponse.json({ success: true, codes, count: codes.length });
  } catch (err) {
    const { error, status, retryAfter } = riotErrorResponse(err);
    const headers: Record<string, string> = {};
    if (retryAfter) headers["Retry-After"] = String(retryAfter);
    return NextResponse.json({ error }, { status, headers });
  }
}

// ── PUT — Atualizar configurações de um code ──────────────────────────────

export async function PUT(req: NextRequest) {
  const { userId, role } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const code = req.nextUrl.searchParams.get("code");
  if (!code) {
    return NextResponse.json(
      { error: "Parâmetro 'code' obrigatório" },
      { status: 400 }
    );
  }

  let rawBody: Pick<
    TournamentCodeParameters,
    "pickType" | "mapType" | "spectatorType" | "allowedParticipants"
  > & {
    /** @deprecated Use allowedParticipants */
    allowedSummonerIds?: string[];
    /** tournamentId necessário para verificar se é organizer */
    tournamentId?: number;
  };

  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Body JSON inválido" }, { status: 400 });
  }

  // FIX: verificar admin OU organizer (antes só admin)
  // PUT não tem tournamentId obrigatório, mas se vier usamos para checar
  // Se role === "admin" passa direto; se organizer, precisa do tournamentId
  if (role !== "admin") {
    if (!rawBody.tournamentId) {
      return NextResponse.json(
        { error: "tournamentId obrigatório para organizer atualizar um code" },
        { status: 400 }
      );
    }
    const authorized = await canManageTournament(userId, role, rawBody.tournamentId);
    if (!authorized) {
      return NextResponse.json(
        { error: "Sem permissão. Apenas admin ou organizer do torneio." },
        { status: 403 } // FIX: 403 correto
      );
    }
  }

  // Alias legado para PUT também
  const body: Pick<
    TournamentCodeParameters,
    "pickType" | "mapType" | "spectatorType" | "allowedParticipants"
  > = {
    ...rawBody,
    allowedParticipants:
      rawBody.allowedParticipants ?? rawBody.allowedSummonerIds,
  };

  try {
    await updateTournamentCode(code, body);
    return NextResponse.json({ success: true, code, updated: body });
  } catch (err) {
    const { error, status } = riotErrorResponse(err);
    return NextResponse.json({ error }, { status });
  }
}
