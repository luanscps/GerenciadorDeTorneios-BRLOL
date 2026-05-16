import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/jogadores/buscar?q=SummonerName%23BR1
 *
 * Busca jogadores por game_name (e opcionalmente tag_line) via riot_accounts.
 * Retorna profileId para que o InvitePlayerForm passe ao enviarConvite().
 * Não expõe dados sensíveis — apenas campos públicos.
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ error: "Query muito curta" }, { status: 400 });
    }

    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    let nameQuery = q;
    let tagQuery: string | null = null;
    if (q.includes("#")) {
      const parts = q.split("#");
      nameQuery = parts[0].trim();
      tagQuery  = parts[1]?.trim() ?? null;
    }

    // Busca em riot_accounts (fonte de verdade de game_name/tag_line)
    // com join em players para stats de ranking
    let query = supabase
      .from("riot_accounts")
      .select(`
        id,
        profile_id,
        game_name,
        tag_line,
        player:players (
          id,
          role,
          tier,
          rank,
          lp,
          puuid
        )
      `)
      .ilike("game_name", `%${nameQuery}%`)
      .limit(10);

    if (tagQuery) {
      query = query.ilike("tag_line", `%${tagQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Verifica quais profiles já têm time ativo
    const profileIds = (data ?? []).map(r => r.profile_id).filter(Boolean);
    let profilesWithTeam = new Set<string>();
    if (profileIds.length > 0) {
      const { data: members } = await supabase
        .from("team_members")
        .select("profile_id")
        .in("profile_id", profileIds)
        .eq("status", "active");
      profilesWithTeam = new Set((members ?? []).map((m: any) => m.profile_id));
    }

    const results = (data ?? []).map((r: any) => {
      const player = Array.isArray(r.player) ? r.player[0] : r.player;
      return {
        id:           player?.id ?? r.id,
        profileId:    r.profile_id,
        summonerName: r.game_name,
        tagLine:      r.tag_line,
        role:         player?.role ?? null,
        tier:         player?.tier ?? "UNRANKED",
        rank:         player?.rank ?? "",
        lp:           player?.lp ?? 0,
        puuid:        player?.puuid ?? null,
        hasTeam:      profilesWithTeam.has(r.profile_id),
      };
    });

    return NextResponse.json(results);
  } catch (err) {
    console.error("[API jogadores/buscar]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
