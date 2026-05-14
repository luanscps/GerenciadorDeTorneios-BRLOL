import { headers } from 'next/headers';

/**
 * Extrai o IP real do cliente considerando proxies Cloudflare + Vercel.
 *
 * Ordem de prioridade (mais confiável → menos confiável):
 * 1. cf-connecting-ip   → definido pela Cloudflare, confiável quando CF está na frente
 * 2. x-forwarded-for    → primeiro IP da cadeia (IP do cliente original)
 * 3. x-real-ip          → fallback Nginx/Vercel
 * 4. 'unknown'          → fallback final (jamais null para não quebrar Map do rate limiter)
 *
 * IMPORTANTE: nunca confiar no IP inteiro de x-forwarded-for (pode ser forjado
 * por clientes maliciosos). Apenas o PRIMEIRO da cadeia importa, pois a
 * Cloudflare já garantiu que o cliente real está nessa posição.
 */
export async function getRealIp(): Promise<string> {
  const h = await headers();

  const cf = h.get('cf-connecting-ip');
  if (cf) return cf.trim();

  const xff = h.get('x-forwarded-for');
  if (xff) return xff.split(',')[0]?.trim() ?? 'unknown';

  const real = h.get('x-real-ip');
  if (real) return real.trim();

  return 'unknown';
}

// Mapa em memória para rate limit (por processo/instancia Vercel)
// Para rate limit distribuído em produção, usar Redis/Upstash.
const requests = new Map<string, { count: number; resetAt: number }>();

/**
 * Rate limiter simples por IP.
 *
 * @param ip      - IP do cliente (use getRealIp() para obter)
 * @param limit   - Máximo de requisições na janela (default: 30)
 * @param windowMs - Janela em ms (default: 60s)
 * @returns true se a requisição é permitida, false se excedeu o limite
 *
 * @example
 * const ip = await getRealIp();
 * if (!rateLimit(ip, 10, 60_000)) {
 *   return NextResponse.json({ error: 'Rate limit excedido' }, { status: 429 });
 * }
 */
export function rateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  const now = Date.now();
  const entry = requests.get(ip);

  if (!entry || now > entry.resetAt) {
    requests.set(ip, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (entry.count >= limit) return false;
  entry.count++;
  return true;
}
