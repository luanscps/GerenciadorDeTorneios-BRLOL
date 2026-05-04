import { createClient } from "@supabase/supabase-js";
import { Database } from "../database.types";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Assumindo que tournament_match_results possui:
 * - tournament_code: string
 * - game_data: Json
 * - processed: boolean
 */
type RawResult = Database["public"]["Tables"]["tournament_match_results"]["Row"];

/**
 * Estrutura normalizada que o processador deve montar
 * para as próximas sub-tarefas de persistência.
 */
interface NormalizedMatchData {
  tournamentCode: string;
  gameId: number;
  rawPayload: any;
  // Preparado para receber participantes e stats na Subtarefa 2/3
}

/**
 * Subtarefa 1: Processador de Resultados (Estrutura Básica)
 * Responsável por:
 * 1. Ler o registro da fila
 * 2. Validar o conteúdo do JSON
 * 3. Logar a intenção de processamento
 */
export async function processMatchResult(tournamentCode: string) {
  console.log(`[IngestMatch] Iniciando processamento para: ${tournamentCode}`);

  const { data, error } = await supabase
    .from("tournament_match_results")
    .select("*")
    .eq("tournament_code", tournamentCode)
    .single();

  if (error || !data) {
    console.error(`[IngestMatch] Registro não encontrado para: ${tournamentCode}`);
    return { success: false, error: "Registro não encontrado" };
  }

  if (data.processed) {
    console.warn(`[IngestMatch] Registro já processado: ${tournamentCode}`);
    return { success: false, error: "Já processado" };
  }

  // Validação mínima dos dados brutos
  const gameData = data.game_data as any;
  if (!gameData || !gameData.gameId) {
    console.error(`[IngestMatch] Dados inválidos no JSON para: ${tournamentCode}`);
    return { success: false, error: "JSON inválido" };
  }

  // Objeto normalizado (Preparo para próximas tarefas)
  const normalized: NormalizedMatchData = {
    tournamentCode: data.tournament_code,
    gameId: gameData.gameId,
    rawPayload: gameData,
  };

  console.log(`[IngestMatch] Registro validado com sucesso. Pronto para extração.`);
  console.log(`[IngestMatch] Dados prontos para normalização:`, JSON.stringify(normalized, null, 2));

  return { success: true, data: normalized };
}
