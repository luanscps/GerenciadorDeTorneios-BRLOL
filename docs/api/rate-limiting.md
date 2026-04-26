# Sistema de Rate Limiting

## Por que rate limiting é crítico

A Riot Games pode **banir permanentemente** a API Key caso os limites sejam excedidos de forma sistemática. O sistema do BRLOL possui **duas camadas independentes** de proteção:

1. **Rate limit por IP** (`lib/rate-limit.ts`) — protege o servidor BRLOL de abusos de clientes
2. **Rate limit para a Riot API** (`lib/riot-rate-limiter.ts`) — protege a chave Riot de ser banida

---

## Camada 1 — Rate limit por IP (clientes)

**Arquivo:** `lib/rate-limit.ts`

Implementação simples em memória com janela fixa (fixed window):

```typescript
const requests = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(ip: string, limit = 30, windowMs = 60_000): boolean {
  // Retorna false se o IP excedeu o limite na janela atual
}
```

Configuração atual em `app/api/riot/summoner/route.ts`:
- **30 requisições por minuto** por IP
- Retorna `429` com mensagem em português ao ser excedido

---

## Camada 2 — Rate limit para a Riot API (3 subcamadas)

**Arquivo:** `lib/riot-rate-limiter.ts`

Implementação com **sliding window** (janela deslizante) em memória, cobrindo as 3 camadas que a Riot API impõe:

### Subcamada A — Application Rate Limit

Conta **todas as requisições** feitas com a chave, independentemente do endpoint.

| Key type | Limite atual (80% do real) | Janela |
|---|---|---|
| Development / Personal | 16 req | 1 segundo |
| Development / Personal | 80 req | 2 minutos |
| Production (quando aprovado) | 400 req | 1 segundo |
| Production (quando aprovado) | 24.000 req | 10 minutos |

Para migrar para Production Key, altere os valores em `LIMITS.application` dentro de `riot-rate-limiter.ts`.

### Subcamada B — Method Rate Limit

Cada endpoint tem seu próprio bucket isolado. A Riot aplica limites diferentes por operação:

| API | Method Key | Limite | Janela |
|---|---|---|---|
| account-v1 | `account-v1:by-riot-id` | 1000 | 60s |
| summoner-v4 | `summoner-v4:by-puuid` | 1600 | 60s |
| league-v4 | `league-v4:by-puuid` | 80 | 2min |
| league-v4 | `league-v4:challenger` | 30 | 10s |
| match-v5 | `match-v5:by-puuid` | 1600 | 60s |
| match-v5 | `match-v5:by-match-id` | 1600 | 60s |
| spectator-v5 | `spectator-v5:by-summoner` | 800 | 60s |
| mastery-v4 | `mastery-v4:top` | 1600 | 60s |
| champion-v3 | `champion-v3:rotations` | 400 | 60s |
| challenges-v1 | `challenges-v1:by-puuid` | 300 | 60s |
| status-v4 | `status-v4:platform` | 1000 | 60s |
| clash-v1 | `clash-v1:by-puuid` | 400 | 60s |
| tournament-stub-v5 | `tournament-stub-v5:codes` | 100 | 10s |
| tournament-stub-v5 | `tournament-stub-v5:events` | 100 | 10s |
| tournament-v5 | `tournament-v5:codes` | 100 | 10s |

### Subcamada C — Service Rate Limit

Limite compartilhado entre **todos os desenvolvedores** que usam a Riot API. Quando atingido:
- A Riot retorna `429` **sem** o header `X-Rate-Limit-Type`
- Não há como prevenir — apenas detectar e aguardar
- O `riotFetch()` detecta automaticamente e lança `RiotRateLimitError` com `limitType: "service"`

---

## Algoritmo: Sliding Window

```
Janela de 2 minutos exemplo (limite: 80 req):

Tempo →  0s   30s   60s   90s   120s  150s
        [req] [req] [req] [req] [req] [req]
              └── janela desliza ──┘

Bucket guarda timestamps de cada requisição.
A cada nova req, remove timestamps com mais de 2min de idade.
Se bucket.length >= 80 → BLOQUEADO.
```

Vantagem sobre fixed window: evita "bursts" no limite de janela (ex: 80 req no último segundo de uma janela + 80 req no primeiro segundo da próxima = 160 req em 2s).

---

## Tratamento de erros tipados

O sistema usa duas classes de erro dedicadas:

### `RiotApiError`
Erros HTTP da Riot (4xx, 5xx):
```typescript
throw new RiotApiError("Riot API 403: Forbidden", 403);
```

### `RiotRateLimitError`
Rate limit atingido (local ou da Riot):
```typescript
throw new RiotRateLimitError(
  "Rate limit (application) — aguarde 5s",
  "application", // "application" | "method" | "service"
  5              // segundos para retry
);
```

### `riotErrorResponse()` — Helper para route handlers

```typescript
const { error, status, retryAfter } = riotErrorResponse(err);
// Retorna objeto com mensagem em português, status HTTP e retryAfter (segundos)
```

Quando `retryAfter` está presente, o route handler inclui o header `Retry-After` na resposta ao cliente.

---

## Limitações do in-memory store

O rate limiter atual usa `Map` em memória do Node.js. Isso funciona bem para **uma única instância** do servidor.

Em produção com múltiplas instâncias Vercel (escalonamento automático), cada worker tem seu próprio contador — o limite efetivo se multiplica pelo número de workers.

**Para produção com alta carga**, migre para [@upstash/ratelimit](https://github.com/upstash/ratelimit) com Redis distribuído. A interface é quase idêntica e a mudança é localizada em `lib/riot-rate-limiter.ts`.
