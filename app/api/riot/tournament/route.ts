/**
 * app/api/riot/tournament/route.ts
 *
 * Endpoints REST para gerenciar torneios via Riot Tournament API.
 *
 * POST /api/riot/tournament          → Criar provider + torneio (setup inicial)
 * GET  /api/riot/tournament?id=...   → Buscar detalhes de um torneio
 *
 * IMPORTANTE — Restrições Riot para callbackUrl:
 *  - Domínio próprio obrigatório (.com.br ✔, .vercel.app ✘, .app ✘)
 *  - Apenas porta 80 (http) ou 443 (https)
 *  - CAs emitidas após jan/2012 podem ser rejeitadas → usar HTTP é mais seguro
 *  - Definir RIOT_CALLBACK_URL no .env/.env.production com o domínio real
 *
 * Env vars necessárias:
 *  RIOT_CALLBACK_URL       → https://arenagg.com.br/api/riot/tournament/callback
 *  NEXT_PUBLIC_APP_URL     → https://arenagg.com.br  (fallback)
 *  RIOT_USE_STUB           → true (dev) | false (prod)
 *  RIOT_REGION             → BR (default)
 */
import { NextRequest, NextResponse } from 'next/server';
import {
  registerProvider,
  createTournament,
  setupTournament,
} from '@/lib/riot-tournament';
import { riotErrorResponse, RiotRateLimitError, RiotApiError } from '@/lib/riot-rate-limiter';
import { getAuthUser } from '@/lib/supabase/server';

// ── Helper: resolve a URL de callback de forma segura ──────────────────────────
//
// Prioridade:
//  1. RIOT_CALLBACK_URL (env explícita, mais segura)
//  2. NEXT_PUBLIC_APP_URL + path fixo
//  3. Erro em runtime — NUNCA usa fallback .vercel.app
//
function getCallbackUrl(): string {
  if (process.env.RIOT_CALLBACK_URL) {
    return process.env.RIOT_CALLBACK_URL;
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return `${process.env.NEXT_PUBLIC_APP_URL}/api/riot/tournament/callback`;
  }
  // Guard: sem URL configurada, lança erro explícito em runtime
  // para não registrar provider com URL inválida silenciosamente
  throw new Error(
    'Variável RIOT_CALLBACK_URL não definida. ' +
    'Configure no .env.production: RIOT_CALLBACK_URL=https://arenagg.com.br/api/riot/tournament/callback'
  );
}

// ── POST — Criar torneio completo (provider + tournament + 1 code inicial) ────
export async function POST(req: NextRequest) {
  const { userId, role } = await getAuthUser();

  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }
  if (role !== 'admin') {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
  }

  let body: {
    action?: string;
    tournamentName?: string;
    teamSize?: number;
    pickType?: string;
    mapType?: string;
    spectatorType?: string;
    providerId?: number;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Body JSON inválido' }, { status: 400 });
  }

  const { action = 'setup' } = body;

  try {
    if (action === 'setup') {
      const {
        tournamentName = 'BRLOL Tournament',
        teamSize = 5,
        pickType = 'TOURNAMENT_DRAFT',
        mapType = 'SUMMONERS_RIFT',
        spectatorType = 'ALL',
      } = body;

      const callbackUrl = getCallbackUrl();

      // Doc Riot: gere codes APENAS sob demanda, nunca em lote.
      // O setup cria 1 code inicial para validar o fluxo.
      // Os demais codes devem ser gerados via POST /api/riot/tournament/codes/by-match.
      const result = await setupTournament({
        tournamentName,
        callbackUrl,
        matchCount: 1,
        codeParams: {
          teamSize,
          pickType: pickType as 'TOURNAMENT_DRAFT',
          mapType: mapType as 'SUMMONERS_RIFT',
          spectatorType: spectatorType as 'ALL',
          // metaData: identifica o torneio no callback para validação
          // O valor real por partida é preenchido em by-match/route.ts
          metadata: JSON.stringify({ source: 'setup', ts: Date.now() }),
        },
      });

      return NextResponse.json({
        success: true,
        ...result,
        callbackUrl,
        message:
          `Torneio "${tournamentName}" criado. ` +
          `1 code de validação gerado. ` +
          `Gere os demais via POST /api/riot/tournament/codes/by-match.`,
      });
    }

    if (action === 'provider') {
      const callbackUrl = getCallbackUrl();
      const providerId = await registerProvider({
        region: (process.env.RIOT_REGION ?? 'BR').toUpperCase(),
        url: callbackUrl,
      });
      return NextResponse.json({ success: true, providerId, callbackUrl });
    }

    if (action === 'tournament') {
      const { providerId, tournamentName = 'BRLOL Tournament' } = body;
      if (!providerId) {
        return NextResponse.json({ error: 'providerId é obrigatório' }, { status: 400 });
      }
      const tournamentId = await createTournament({ name: tournamentName, providerId });
      return NextResponse.json({ success: true, tournamentId });
    }

    return NextResponse.json({ error: `Ação desconhecida: ${action}` }, { status: 400 });
  } catch (err) {
    // Guard de configuração (RIOT_CALLBACK_URL não definida)
    if (err instanceof Error && err.message.includes('RIOT_CALLBACK_URL')) {
      return NextResponse.json(
        { error: err.message },
        { status: 500 }
      );
    }
    const { error, status, retryAfter } = riotErrorResponse(err);
    const responseHeaders: Record<string, string> = {};
    if (retryAfter) responseHeaders['Retry-After'] = String(retryAfter);
    return NextResponse.json({ error }, { status, headers: responseHeaders });
  }
}

// ── GET — Buscar detalhes de um torneio ────────────────────────────────────────
export async function GET(req: NextRequest) {
  const { userId } = await getAuthUser();
  if (!userId) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
  }

  const id = req.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json(
      { error: "Parâmetro 'id' obrigatório. Ex: ?id=12345" },
      { status: 400 }
    );
  }

  return NextResponse.json({ tournamentId: id });
}
