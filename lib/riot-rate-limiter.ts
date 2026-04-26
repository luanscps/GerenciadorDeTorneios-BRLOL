/**
 * lib/riot-rate-limiter.ts
 *
 * Rate limiter em memória para a Riot API — cobre as 3 camadas:
 *   1. Application Rate Limit  (por chave / por região)
 *   2. Method Rate Limit       (por endpoint específico)
 *   3. Service Rate Limit      (detectado pelo 429 sem X-Rate-Limit-Type)
 *
 * Limites configurados para Development/Personal Key (80% de segurança).
 * Ao obter Production Key, altere LIMITS.application.
 *
 * Não usa Redis — funciona em qualquer Vercel plan com in-memory store.
 * Para escalar horizontalmente (múltiplos workers) migre para @upstash/ratelimit.
 */

// ─── Sliding Window em memória ────────────────────────────────────────────────
interface Bucket {
  tokens: number[];
  limit: number;
  windowMs: number;
}

const buckets = new Map<string, Bucket>();

function allow(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  let bucket = buckets.get(key);

  if (!bucket) {
    bucket = { tokens: [], limit, windowMs };
    buckets.set(key, bucket);
  }

  // Remove tokens expirados da janela
  bucket.tokens = bucket.tokens.filter(ts => now - ts < windowMs);

  if (bucket.tokens.length >= limit) return false;

  bucket.tokens.push(now);
  return true;
}

// ─── Limites oficiais Riot (80% do real para margem de segurança) ─────────────
// Documentação: https://developer.riotgames.com/docs/portal#web-apis_rate-limiting
const LIMITS = {
  // Application Rate Limit — Development / Personal Key
  // Production Key: 400/s e 24000/10min — troque aqui quando aprovado
  application: [
    { limit: 16,  windowMs: 1_000 },    // 80% de 20/s
    { limit: 80,  windowMs: 120_000 },  // 80% de 100/2min
  ],

  // Method Rate Limits — por endpoint, janelas específicas da Riot
  // Fonte: cada endpoint no portal developer.riotgames.com/apis
  methods: {
    // account-v1
    "account-v1:by-riot-id":         [{ limit: 1000, windowMs: 60_000  }],
    "account-v1:by-puuid":           [{ limit: 1000, windowMs: 60_000  }],
    "account-v1:by-game":            [{ limit: 1000, windowMs: 60_000  }],

    // summoner-v4
    "summoner-v4:by-puuid":          [{ limit: 1600, windowMs: 60_000  }],
    "summoner-v4:by-name":           [{ limit: 1600, windowMs: 60_000  }],
    "summoner-v4:by-account":        [{ limit: 1600, windowMs: 60_000  }],
    "summoner-v4:by-summoner-id":    [{ limit: 1600, windowMs: 60_000  }],
    "summoner-v4:me":                [{ limit: 1600, windowMs: 60_000  }],

    // league-v4
    "league-v4:by-puuid":            [{ limit: 80,   windowMs: 120_000 }],
    "league-v4:entries":             [{ limit: 200,  windowMs: 60_000  }],
    "league-v4:challenger":          [{ limit: 30,   windowMs: 10_000  }],
    "league-v4:grandmaster":         [{ limit: 30,   windowMs: 10_000  }],
    "league-v4:master":              [{ limit: 30,   windowMs: 10_000  }],
    "league-v4:by-league-id":        [{ limit: 500,  windowMs: 10_000  }],

    // match-v5
    "match-v5:by-puuid":             [{ limit: 1600, windowMs: 60_000  }],
    "match-v5:by-match-id":          [{ limit: 1600, windowMs: 60_000  }],
    "match-v5:timeline":             [{ limit: 1600, windowMs: 60_000  }],

    // spectator-v5
    "spectator-v5:by-summoner":      [{ limit: 800,  windowMs: 60_000  }],
    "spectator-v5:featured":         [{ limit: 80,   windowMs: 120_000 }],

    // champion-mastery-v4
    "mastery-v4:by-puuid":           [{ limit: 1600, windowMs: 60_000  }],
    "mastery-v4:top":                [{ limit: 1600, windowMs: 60_000  }],
    "mastery-v4:score":              [{ limit: 1600, windowMs: 60_000  }],

    // champion-v3
    "champion-v3:rotations":         [{ limit: 400,  windowMs: 60_000  }],

    // lol-challenges-v1
    "challenges-v1:config":          [{ limit: 300,  windowMs: 60_000  }],
    "challenges-v1:percentiles":     [{ limit: 300,  windowMs: 60_000  }],
    "challenges-v1:by-puuid":        [{ limit: 300,  windowMs: 60_000  }],

    // lol-status-v4
    "status-v4:platform":            [{ limit: 1000, windowMs: 60_000  }],

    // clash-v1
    "clash-v1:by-puuid":             [{ limit: 400,  windowMs: 60_000  }],
    "clash-v1:tournaments":          [{ limit: 400,  windowMs: 60_000  }],
    "clash-v1:teams":                [{ limit: 400,  windowMs: 60_000  }],

    // tournament-stub-v5 (desenvolvimento)
    "tournament-stub-v5:providers":  [{ limit: 100,  windowMs: 10_000  }],
    "tournament-stub-v5:tournaments":[{ limit: 100,  windowMs: 10_000  }],
    "tournament-stub-v5:codes":      [{ limit: 100,  windowMs: 10_000  }],
    "tournament-stub-v5:events":     [{ limit: 100,  windowMs: 10_000  }],
    "tournament-stub-v5:lobby":      [{ limit: 100,  windowMs: 10_000  }],

    // tournament-v5 (produção — mesmos limites do stub)
    "tournament-v5:providers":       [{ limit: 100,  windowMs: 10_000  }],
    "tournament-v5:tournaments":     [{ limit: 100,  windowMs: 10_000  }],
    "tournament-v5:codes":           [{ limit: 100,  windowMs: 10_000  }],
    "tournament-v5:events":          [{ limit: 100,  windowMs: 10_000  }],
    "tournament-v5:lobby":           [{ limit: 100,  windowMs: 10_000  }],
  } as Record<string, { limit: number; windowMs: number }[]>,
};

// ─── Verificador principal ────────────────────────────────────────────────────
export interface RateLimitResult {
  allowed: boolean;
  retryAfterMs?: number;
  blockedBy?: "application" | "method" | "service";
}

export function checkRateLimit(methodKey: string): RateLimitResult {
  // 1. Application limits
  for (const conf of LIMITS.application) {
    const ok = allow(`app:${conf.windowMs}`, conf.limit, conf.windowMs);
    if (!ok) {
      return {
        allowed: false,
        blockedBy: "application",
        retryAfterMs: conf.windowMs,
      };
    }
  }

  // 2. Method limits
  const methodConfs = LIMITS.methods[methodKey];
  if (methodConfs) {
    for (const conf of methodConfs) {
      const ok = allow(`method:${methodKey}:${conf.windowMs}`, conf.limit, conf.windowMs);
      if (!ok) {
        return {
          allowed: false,
          blockedBy: "method",
          retryAfterMs: conf.windowMs,
        };
      }
    }
  }

  return { allowed: true };
}

// ─── Wrapper fetch com retry automático em 429 ────────────────────────────────
export async function riotFetch<T>(
  url: string,
  methodKey: string,
  options: RequestInit & { revalidate?: number } = {}
): Promise<T> {
  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) throw new Error("RIOT_API_KEY não configurada no servidor");

  // Verifica limites locais antes de fazer a requisição
  const check = checkRateLimit(methodKey);
  if (!check.allowed) {
    throw new RiotRateLimitError(
      `Rate limit local: ${check.blockedBy} — aguarde ${(check.retryAfterMs ?? 1000) / 1000}s`,
      check.blockedBy!,
      Math.ceil((check.retryAfterMs ?? 1000) / 1000)
    );
  }

  const revalidate = options.revalidate ?? 300;
  const { revalidate: _r, ...fetchOptions } = options as Record<string, unknown>;
  void _r;

  const res = await fetch(url, {
    ...fetchOptions,
    headers: {
      "X-Riot-Token": apiKey,
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string> ?? {}),
    },
    next: { revalidate },
  } as RequestInit & { next?: { revalidate: number } });

  // 429 da Riot — pode ser application, method ou service
  if (res.status === 429) {
    const retryAfter = parseInt(res.headers.get("Retry-After") ?? "5", 10);
    const limitType = res.headers.get("X-Rate-Limit-Type") as
      | "application"
      | "method"
      | undefined;
    throw new RiotRateLimitError(
      `Riot API 429 (${limitType ?? "service"}) — retry em ${retryAfter}s`,
      limitType ?? "service",
      retryAfter
    );
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({})) as Record<string, unknown>;
    const status = (body as { status?: { message?: string } })?.status;
    const msg = status?.message ?? res.statusText;
    throw new RiotApiError(`Riot API ${res.status}: ${msg}`, res.status);
  }

  // 204 No Content (ex: DELETE bem-sucedido)
  if (res.status === 204) return undefined as unknown as T;

  return res.json() as Promise<T>;
}

// ─── Erros tipados ────────────────────────────────────────────────────────────
export class RiotApiError extends Error {
  constructor(message: string, public readonly statusCode: number) {
    super(message);
    this.name = "RiotApiError";
  }
}

export class RiotRateLimitError extends Error {
  constructor(
    message: string,
    public readonly limitType: "application" | "method" | "service",
    public readonly retryAfterSeconds: number
  ) {
    super(message);
    this.name = "RiotRateLimitError";
  }
}

// ─── Helper para tratar erros nos route handlers ──────────────────────────────
export function riotErrorResponse(err: unknown): { error: string; retryAfter?: number } & { status: number } {
  if (err instanceof RiotRateLimitError) {
    return {
      error: `Rate limit atingido (${err.limitType}). Aguarde ${err.retryAfterSeconds}s.`,
      retryAfter: err.retryAfterSeconds,
      status: 429,
    };
  }
  if (err instanceof RiotApiError) {
    const messages: Record<number, string> = {
      400: "Parâmetro inválido enviado à Riot API",
      401: "API Key ausente — configure RIOT_API_KEY no servidor",
      403: "API Key inválida, expirada ou endpoint bloqueado",
      404: "Recurso não encontrado na Riot API",
      415: "Content-Type inválido",
      500: "Erro interno da Riot API — tente novamente",
      502: "Bad Gateway na Riot API",
      503: "Riot API temporariamente indisponível",
      504: "Timeout na Riot API",
    };
    return {
      error: messages[err.statusCode] ?? err.message,
      status: err.statusCode,
    };
  }
  const msg = err instanceof Error ? err.message : "Erro desconhecido";
  return { error: msg, status: 500 };
}
