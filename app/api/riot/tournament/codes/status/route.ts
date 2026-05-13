/**
 * app/api/riot/tournament/codes/status/route.ts
 *
 * GET /api/riot/tournament/codes/status?match_id=<uuid>
 *
 * Retorna o status atual dos tournament codes de um match sem
 * gerar novos codes nem chamar a Riot API.
 *
 * Útil para:
 *  - Dashboard do organizer: checar quais codes já foram gerados.
 *  - Frontend do match: exibir os codes para os capitães.
 *  - Monitorar quais games já foram jogados (used=true).
 *
 * Acesso: admin, organizer do torneio, ou capitão de um dos dois times.
 *
 * Response 200:
 * {
 *   match_id: string,
 *   has_codes: boolean,
 *   codes_count: number,
 *   codes: TournamentCodeEntry[],
 *   generated_at: string | null,
 *   expire_at: string | null,
 *   is_expired: boolean,
 *   days_until_expiry: number | null
 * }
 */
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { TournamentCodeEntry } from "@/lib/tournament-codes-manager";

async function getAuthContext() {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookieStore.getAll() } }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { userId: null, role: null, supabase };

  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return { userId: user.id, role: data?.role ?? null, supabase };
}

export async function GET(req: NextRequest) {
  const matchId = req.nextUrl.searchParams.get("match_id");
  if (!matchId) {
    return NextResponse.json(
      { error: "Parâmetro 'match_id' obrigatório" },
      { status: 400 }
    );
  }

  const { userId, role, supabase } = await getAuthContext();
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  // Buscar match com dados de autorização
  const { data: match, error } = await supabase
    .from("matches")
    .select(
      `id, tournament_codes, codes_generated_at, codes_expire_at,
       team_a_id, team_b_id,
       tournaments!inner(organizer_id)`
    )
    .eq("id", matchId)
    .single();

  if (error || !match) {
    return NextResponse.json({ error: "Match não encontrado" }, { status: 404 });
  }

  // Autorização: admin / organizer / capitão de um dos times
  const organizerId = (match.tournaments as any)?.organizer_id;
  let authorized = role === "admin" || organizerId === userId;

  if (!authorized && (match.team_a_id || match.team_b_id)) {
    const teamIds = [match.team_a_id, match.team_b_id].filter(Boolean);
    const { data: membership } = await supabase
      .from("team_members")
      .select("id")
      .in("team_id", teamIds)
      .eq("profile_id", userId)
      .in("team_role", ["captain"])
      .eq("status", "accepted")
      .limit(1);

    authorized = (membership ?? []).length > 0;
  }

  if (!authorized) {
    return NextResponse.json(
      { error: "Sem permissão para ver os codes desta partida" },
      { status: 403 }
    );
  }

  // Calcular status de expiração
  const codes = (match.tournament_codes as TournamentCodeEntry[] | null) ?? [];
  const expireAt = match.codes_expire_at ? new Date(match.codes_expire_at) : null;
  const now = new Date();

  const isExpired = expireAt ? expireAt <= now : true;
  const daysUntilExpiry = expireAt
    ? Math.max(0, Math.ceil((expireAt.getTime() - now.getTime()) / 86400000))
    : null;

  return NextResponse.json({
    match_id: matchId,
    has_codes: codes.length > 0,
    codes_count: codes.length,
    codes,
    generated_at: match.codes_generated_at ?? null,
    expire_at: match.codes_expire_at ?? null,
    is_expired: codes.length > 0 ? isExpired : true,
    days_until_expiry: daysUntilExpiry,
  });
}
