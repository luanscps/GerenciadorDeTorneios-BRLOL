import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * GET /api/jogadores/buscar?q=SummonerName%23BR1
 *
 * Busca jogadores por summoner_name (e opcionalmente tag_line).
 * Aceita formato "Nome#TAG" ou apenas "Nome".
 * Retorna até 10 resultados para o InvitePlayerForm.
 * Não expõe dados sensíveis — apenas campos públicos.
 */
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get("q")?.trim();
    if (!q || q.length < 2) {
      return NextResponse.json({ error: "Query muito curta" }, { status: 400 });
    }

    const supabase = await createClient();

    // Verifica autenticação — rota semiprivada (apenas usuários logados)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Suporta formato "Nome#TAG"
    let nameQuery = q;
    let tagQuery: string | null = null;
    if (q.includes("#")) {
      const [name, tag] = q.split("#");
      nameQuery = name.trim();
      tagQuery = tag.trim();
    }

    // Fix 1: removido team_id do select — coluna foi dropada na migration
    // hasTeam agora é verificado via team_members se necessário
    let query = supabase
      .from("players")
      .select("id, summoner_name, tag_line, role, tier, rank, lp, puuid")
      .ilike("summoner_name", `%${nameQuery}%`)
      .limit(10);

    if (tagQuery) {
      query = query.ilike("tag_line", `%${tagQuery}%`);
    }

    const { data, error } = await query;
    if (error) throw error;

    const results = (data ?? []).map((p) => ({
      id:           p.id,
      summonerName: p.summoner_name,
      tagLine:      p.tag_line,
      role:         p.role,
      tier:         p.tier,
      rank:         p.rank,
      lp:           p.lp,
      puuid:        p.puuid,
    }));

    return NextResponse.json(results);
  } catch (err) {
    console.error("[API jogadores/buscar]", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
