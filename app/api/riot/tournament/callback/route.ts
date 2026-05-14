/**
 * app/api/riot/tournament/callback/route.ts
 *
 * Webhook que a Riot chama via POST quando uma partida de torneio termina.
 * Registrado como 'url' no registerProvider().
 *
 * SEGURANÇA (doc oficial Riot):
 *  - A Riot NÃO assina os requests com secret/token
 *  - Validação recomendada pela própria Riot: usar o campo metaData
 *  - O shortCode é verificado contra tournament_codes (JSONB) em matches
 *  - Se shortCode não existir no banco, o payload é rejeitado (possível forge)
 *  - Rate limit por IP real (cf-connecting-ip) para bloquear flood
 *
 * Payload recebido da Riot:
 * {
 *   startTime: number,       // epoch ms
 *   shortCode: string,       // tournament code usado
 *   metaData: string,        // metadata definida no generateCode
 *   gameId: number,
 *   gameName: string,
 *   gameType: string,
 *   gameMap: number,
 *   gameMode: string,
 *   region: string,
 *   gameVersion: string,
 *   platformId: string,
 *   gameCreation: number,
 *   gameLastUpdate: number,
 *   gameLength: number,
 *   participants: Array<{ summonerId, teamId, win, ... }>
 * }
 */
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getRealIp, rateLimit } from '@/lib/rate-limit';

// ── Tipos internos ────────────────────────────────────────────────────────────

/** Entrada de um tournament code gravado no JSONB de matches.tournament_codes */
interface TournamentCodeEntry {
  game_number: number;
  code: string;
  used: boolean;
  used_at: string | null;
}

// ── Cliente admin ─────────────────────────────────────────────────────────────

/** Service-role para gravar sem bloqueio de RLS */
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

// ── Handler ───────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  // ── 1. Rate limit por IP real (Cloudflare-aware) ──────────────────────────
  //
  // FIX: getRealIp usa next/headers internamente (não precisa de req),
  // portanto a assinatura sem argumento está correta conforme lib/rate-limit.ts.
  // Mantemos o await correto aqui.
  const clientIp = await getRealIp();
  if (!rateLimit(clientIp, 20, 60_000)) {
    console.warn(`[tournament/callback] Rate limit excedido: ${clientIp}`);
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // ── 2. Parse do payload ───────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const shortCode = typeof payload.shortCode === 'string' ? payload.shortCode.trim() : undefined;
  if (!shortCode) {
    console.warn(`[tournament/callback] shortCode ausente. IP: ${clientIp}`);
    return NextResponse.json({ error: 'shortCode ausente' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // ── 3. Valida shortCode contra matches.tournament_codes (JSONB array) ─────
  //
  // Os tournament codes ficam em matches.tournament_codes como:
  // [{ game_number, code, used, used_at }, ...]
  //
  // Usamos o operador JSONB @> (contains) para encontrar o match que contém
  // o shortCode recebido. O cast JSON.stringify garante escape seguro.
  //
  // Nota: o índice GIN em tournament_codes (se existir) acelera essa query;
  // sem índice ela fará seq scan em matches, o que é aceitável para o volume
  // de torneios esperado.
  const { data: matchRecord, error: matchError } = await supabase
    .from('matches')
    .select('id, tournament_codes, tournament_id')
    .contains('tournament_codes', JSON.stringify([{ code: shortCode }]))
    .maybeSingle();

  if (matchError) {
    console.error(
      `[tournament/callback] Erro ao buscar shortCode ${shortCode}:`,
      matchError.message
    );
    // Retorna 200 para a Riot não retentar por instabilidade nossa
    return NextResponse.json({ received: true, dbError: matchError.message });
  }

  if (!matchRecord) {
    // shortCode desconhecido — não foi gerado por nós
    console.warn(
      `[tournament/callback] shortCode desconhecido: "${shortCode}". ` +
      `IP: ${clientIp}. Possível tentativa de forge.`
    );
    // Retorna 200 para a Riot não retentar, mas não persiste nada
    return NextResponse.json({ received: true });
  }

  // ── 4. Validação extra via metaData do code (quando disponível) ───────────
  //
  // Compara metaData recebida no payload com a metaData que foi definida
  // ao gerar o code (se houver). Discordância é logada para auditoria.
  // Ainda aceita o payload: a Riot pode reenviar com metaData em stub.
  const payloadMeta = typeof payload.metaData === 'string' ? payload.metaData : undefined;
  const codesArray = (matchRecord.tournament_codes as TournamentCodeEntry[] | null) ?? [];
  // tournament-codes-manager não persiste metadata no code entry; a validação
  // aqui é baseada apenas no match_id (o próprio shortCode já confirma origem).
  // Bloco mantido como ponto de extensão para futura validação extra.
  if (payloadMeta) {
    console.log(
      `[tournament/callback] metaData recebida para ${shortCode}: "${payloadMeta}"`
    );
  }

  // ── 5. Marcar o code como usado no JSONB de matches ───────────────────────
  //
  // Atualiza o entry do code no array JSONB com used=true e used_at=now().
  // Isso mantém o estado de quais games do BO já foram jogados.
  const updatedCodes: TournamentCodeEntry[] = codesArray.map((entry) =>
    entry.code === shortCode
      ? { ...entry, used: true, used_at: new Date().toISOString() }
      : entry
  );

  const { error: updateCodeError } = await supabase
    .from('matches')
    .update({
      tournament_codes: updatedCodes,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchRecord.id);

  if (updateCodeError) {
    // Não crítico: persiste o resultado mesmo se a atualização do code falhar
    console.error(
      `[tournament/callback] Falha ao marcar code como usado (match ${matchRecord.id}):`,
      updateCodeError.message
    );
  }

  // ── 6. Persiste resultado bruto para processamento posterior ──────────────
  //
  // A tabela tournament_match_results armazena o payload cru recebido da Riot.
  // O processamento real (atualizar score, winner, etc.) deve ser feito por
  // um worker/job separado que lê processed=false.
  //
  // Colunas existentes: id, tournament_code, game_id, game_data,
  //                     processed, received_at, match_id, origin_ip
  // (match_id e origin_ip adicionados na migration 20260514120000)
  try {
    const gameId = typeof payload.gameId === 'number' ? payload.gameId : null;

    const { error: upsertError } = await supabase
      .from('tournament_match_results')
      .upsert(
        {
          tournament_code: shortCode,
          match_id: matchRecord.id,           // FK para matches.id (nova coluna)
          game_id: gameId,
          game_data: payload,
          processed: false,
          received_at: new Date().toISOString(),
          origin_ip: clientIp,                // auditoria (nova coluna)
        },
        { onConflict: 'tournament_code' }    // UNIQUE constraint adicionada na migration
      );

    if (upsertError) {
      console.error('[tournament/callback] Supabase upsert error:', upsertError.message);
      // Retorna 200 mesmo com erro de DB para a Riot não retentar indefinidamente
      return NextResponse.json({ received: true, dbError: upsertError.message });
    }

    console.log(
      `[tournament/callback] Partida recebida: ${shortCode} ` +
      `(gameId: ${gameId ?? 'N/A'}, matchId: ${matchRecord.id}, IP: ${clientIp})`
    );
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[tournament/callback]', msg);
    // Retorna 200 mesmo em erro inesperado para a Riot não retentar
    return NextResponse.json({ received: true, error: msg });
  }
}
