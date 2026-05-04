import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const INTERNAL_SECRET = Deno.env.get("INTERNAL_SECRET")!;
const SITE_URL = Deno.env.get("SITE_URL") || "http://localhost:3000";

Deno.serve(async (req) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  // 1. Buscar até 50 registros pendentes
  const { data: results, error: fetchError } = await supabase
    .from("tournament_match_results")
    .select("tournament_code, game_id")
    .eq("processed", false)
    .limit(50);

  if (fetchError) {
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!results || results.length === 0) {
    return new Response(JSON.stringify({ message: "Nenhum resultado pendente" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }

  const report = {
    processed: 0,
    failed: 0,
    errors: [] as { tournamentCode: string; gameId: number; error: string }[],
  };

  // 2. Processar cada resultado
  for (const match of results) {
    try {
      const response = await fetch(`${SITE_URL}/api/internal/process-match`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-secret": INTERNAL_SECRET,
        },
        body: JSON.stringify({
          tournamentCode: match.tournament_code,
          gameId: match.game_id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        report.failed++;
        report.errors.push({
          tournamentCode: match.tournament_code,
          gameId: match.game_id,
          error: data.error || "Erro desconhecido na rota",
        });
      } else {
        report.processed++;
      }
    } catch (err) {
      report.failed++;
      report.errors.push({
        tournamentCode: match.tournament_code,
        gameId: match.game_id,
        error: err instanceof Error ? err.message : "Erro de conexão",
      });
    }
  }

  return new Response(JSON.stringify(report), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
