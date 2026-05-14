/**
 * app/api/riot/tournament/callback/route.ts
 *
 * Webhook que a Riot chama via POST quando uma partida de torneio termina.
 * Registrado como 'url' no registerProvider().
 *
 * SEGURANÇA (doc oficial Riot):
 *  - A Riot NÃO assina os requests com secret/token
 *  - Validação recomendada pela própria Riot: usar o campo metaData
 *  - O shortCode é verificado contra tournament_codes no banco
 *  - Se shortCode não existir no banco, o payload é rejeitado (possível forge)
 *  - Rate limit por IP real (cf-connecting-ip) para bloquear flood
 *
 * Payload recebido da Riot:
 * {
 *   startTime: number,       // epoch ms
 *   shortCode: string,       // tournament code usado
 *   metaData: string,        // metadata que você definiu no code
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

// Cliente admin do Supabase (service_role) para gravar sem restrição de RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function POST(req: NextRequest) {
  // ── 1. Rate limit por IP real (Cloudflare-aware) ──────────────────────────
  const clientIp = await getRealIp();
  if (!rateLimit(clientIp, 20, 60_000)) {
    console.warn(`[tournament/callback] Rate limit excedido: ${clientIp}`);
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  // ── 2. Parse do payload ─────────────────────────────────────────────────
  let payload: Record<string, unknown>;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 });
  }

  const shortCode = payload.shortCode as string | undefined;
  if (!shortCode) {
    console.warn(`[tournament/callback] shortCode ausente. IP: ${clientIp}`);
    return NextResponse.json({ error: 'shortCode ausente' }, { status: 400 });
  }

  const supabase = getAdminClient();

  // ── 3. Valida shortCode contra banco (doc Riot: use metaData para validar) ─
  //
  // A Riot recomenda usar metaData para autenticar callbacks.
  // O shortCode gerado pelo nosso sistema já está registrado em tournament_codes.
  // Se não encontrar, o callback não é nosso — rejeita com 404 silencioso.
  //
  // Adicionalmente, o campo metadata do payload (preenchido no generateCode)
  // pode conter um token que você valida aqui para segurança extra.
  const { data: codeRecord, error: codeError } = await supabase
    .from('tournament_codes')
    .select('id, match_id, metadata')
    .eq('code', shortCode)
    .maybeSingle();

  if (codeError) {
    console.error(`[tournament/callback] Erro ao buscar code ${shortCode}:`, codeError.message);
    // Retorna 200 para a Riot não retentar por instabilidade nossa
    return NextResponse.json({ received: true, dbError: codeError.message });
  }

  if (!codeRecord) {
    // shortCode desconhecido — não foi gerado por nós
    console.warn(
      `[tournament/callback] shortCode desconhecido: "${shortCode}". ` +
      `IP: ${clientIp}. Possível tentativa de forge.`
    );
    // Retorna 200 para a Riot não retentar, mas não persiste nada
    return NextResponse.json({ received: true });
  }

  // ── 4. Validação extra por metaData (quando preenchido) ───────────────────
  //
  // Se o code foi gerado com metadata contendo um token/matchId,
  // compara com o que veio no payload da Riot.
  // Caso haja discordância, loga para auditoria mas ainda aceita
  // (a Riot pode reenviar com metaData diferente em stub).
  const payloadMeta = payload.metaData as string | undefined;
  if (codeRecord.metadata && payloadMeta) {
    if (codeRecord.metadata !== payloadMeta) {
      console.warn(
        `[tournament/callback] metaData divergente para ${shortCode}. ` +
        `Esperado: ${codeRecord.metadata}. Recebido: ${payloadMeta}. ` +
        `IP: ${clientIp}`
      );
    }
  }

  // ── 5. Persiste resultado bruto para processamento posterior ──────────────
  try {
    const { error: upsertError } = await supabase
      .from('tournament_match_results')
      .upsert(
        {
          tournament_code: shortCode,
          match_id: codeRecord.match_id ?? null,
          game_id: payload.gameId,
          game_data: payload,
          processed: false,
          received_at: new Date().toISOString(),
          origin_ip: clientIp,
        },
        { onConflict: 'tournament_code' }
      );

    if (upsertError) {
      console.error('[tournament/callback] Supabase upsert error:', upsertError.message);
      // Retorna 200 mesmo com erro de DB para a Riot não retentar indefinidamente
      return NextResponse.json({ received: true, dbError: upsertError.message });
    }

    console.log(
      `[tournament/callback] Partida recebida: ${shortCode} ` +
      `(gameId: ${payload.gameId}, matchId: ${codeRecord.match_id ?? 'N/A'}, IP: ${clientIp})`
    );
    return NextResponse.json({ received: true });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro interno';
    console.error('[tournament/callback]', msg);
    return NextResponse.json({ received: true, error: msg });
  }
}
