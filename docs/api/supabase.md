# Supabase — Edge Functions e Integrações

Este documento descreve todas as Edge Functions ativas no projeto, seus contratos de entrada/saída, segurança e dependências de banco.

> Fonte de verdade: código real das funções em `supabase/functions/` + dados ao vivo do dashboard `awbieglbwhfavxlghuvy`.

---

## Edge Functions ativas

| Slug | Versão | `verify_jwt` | Status | Descrição |
|---|---|---|---|---|
| `riot-api-sync` | 23 | ✅ true | ACTIVE | Sync de rank/icon de jogadores em lote |
| `process-match-results` | 8 | ✅ true | ACTIVE | Processa resultados de partidas de torneio pendentes |
| `bracket-generator` | 20 | ✅ true | ACTIVE | Gera chaveamento de torneio (Single Elimination) |
| `discord-webhook` | 18 | ✅ true | ACTIVE | Dispara notificações Discord |
| `send-email` | 18 | ✅ true | ACTIVE | Envio de e-mails transacionais |

---

## `riot-api-sync`

**Arquivo:** `supabase/functions/riot-api-sync/index.ts`

**Segurança:** `verify_jwt: true`

**Variáveis de ambiente necessárias:**
- `RIOT_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

### Configuração interna

| Constante | Valor | Descrição |
|---|---|---|
| `BATCH_SIZE` (limit) | 20 | Máximo de jogadores sincronizados por execução |
| Stale threshold | 6h | Reprocessa jogadores com `last_synced` há mais de 6h |

### Fluxo

```
POST supabase/functions/riot-api-sync
  Body opcional: { player_id: uuid }  → sincroniza apenas 1 jogador
  Sem body        → batch dos 20 jogadores com last_synced mais antigo

Para cada jogador:
  1. Se puuid ausente:
     account-v1 (americas) /by-riot-id/{name}/{tag}  →  salva puuid
  2. summoner-v4 (br1) /by-puuid/{puuid}             →  profileIconId, summonerLevel
  3. league-v4  (br1) /entries/by-puuid/{puuid}      →  tier, rank, LP, wins, losses
  4. UPDATE players (puuid, profile_icon, summoner_level, tier, rank, lp, wins, losses, last_synced)
```

> ⚠️ **BREAKING CHANGE (Jun/2025):** `league-v4/entries/by-summoner/{summonerId}` foi **removido** pela Riot.
> O projeto usa `entries/by-puuid/{puuid}` desde esta versão. Não reverter.

### Retry e rate limiting

A função `riotGet()` trata 429 dinamicamente lendo o header `Retry-After`:

```typescript
if (res.status === 429) {
  const retryAfter = res.headers.get('Retry-After')
  const waitMs = retryAfter ? parseInt(retryAfter, 10) * 1000 : 6_000
  await new Promise((resolve) => setTimeout(resolve, waitMs))
  // Uma segunda tentativa após o backoff
  const retry = await fetch(url, { headers: { 'X-Riot-Token': RIOT_API_KEY } })
  if (!retry.ok) return null
  return retry.json()
}
```

| Cenário | Comportamento |
|---|---|
| `Retry-After` presente | Aguarda exatamente o valor em segundos informado pela Riot |
| `Retry-After` ausente | Fallback de 6s |
| Segunda tentativa também falha | Retorna `null` — jogador marca status `error` no resultado |

**Tipos de rate limit da Riot (`X-Rate-Limit-Type`):**
- `method` — limite por endpoint específico (curto prazo)
- `service` — limite global do serviço (mais longo)

Ambos são tratados igualmente pela lógica acima, respeitando o `Retry-After` em ambos os casos.

### Tabelas afetadas

| Tabela | Operação | Campos atualizados |
|---|---|---|
| `players` | UPDATE | `puuid`, `profile_icon`, `summoner_level`, `tier`, `rank`, `lp`, `wins`, `losses`, `last_synced` |

### Resposta de sucesso

```json
{
  "synced": 12,
  "results": [
    { "id": "uuid", "summoner_name": "Faker", "tier": "DIAMOND", "status": "synced" },
    { "id": "uuid", "summoner_name": "Desconhecido", "status": "not_found" }
  ]
}
```

**Possíveis valores de `status` por jogador:**

| Status | Causa |
|---|---|
| `synced` | Sincronizado com sucesso |
| `not_found` | Riot ID não encontrado na API |
| `summoner_not_found` | PUUID não retornou summoner válido |
| `error` | Exceção inesperada — ver campo `message` |

---

## `process-match-results`

**Arquivo:** `supabase/functions/process-match-results/index.ts`

**Segurança:** `verify_jwt: true` + header `x-internal-secret` (env `INTERNAL_SECRET`)

**Variáveis de ambiente necessárias:**
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `INTERNAL_SECRET`
- `SITE_URL` (default: `http://localhost:3000`)

**Fluxo (pattern lock-and-process):**
1. Busca até 50 registros em `tournament_match_results` onde `processed = false` E (`processing_at IS NULL` OU `processing_at < now - 10min`)
2. Aplica lock atômico: `processing_at = now()`
3. Para cada registro: `POST {SITE_URL}/api/internal/process-match` com timeout de 25s
4. Sucesso → `processed = true` (via rota interna)
5. Falha/timeout → `processing_at = null` (libera para retry na próxima execução)

**Tabelas afetadas:** `tournament_match_results` (UPDATE)

**Rota interna chamada:** `POST /api/internal/process-match`
- Header: `x-internal-secret: {INTERNAL_SECRET}`
- Body: `{ tournamentCode: string, gameId: number }`

> ⚠️ A coluna `processing_at` precisa existir em `tournament_match_results`. Verifique a migration se houver erro ao executar esta função.

**Resposta:**
```json
{ "processed": 8, "failed": 1, "errors": [{"tournamentCode": "BR1_XXX", "gameId": 123, "error": "timeout"}] }
```

---

## `bracket-generator`

**Arquivo:** `supabase/functions/bracket-generator/index.ts`

**Segurança:** `verify_jwt: true`

**Body da requisição:**
```json
{ "tournament_id": "uuid" }
```

**Fluxo:**
1. Verifica se bracket já existe (`matches` para o torneio → 409 se sim)
2. Busca inscrições `APPROVED + checked_in = true`; fallback para todos `APPROVED` se < 2 times
3. Fisher-Yates shuffle
4. Monta confrontos (seed: 1 vs N, 2 vs N-1...) — arredonda para próxima potência de 2, BYEs ignorados
5. INSERT em `matches` com `status = 'SCHEDULED'`
6. UPDATE `tournaments.status = 'IN_PROGRESS'`
7. Busca capitães via `team_members` (role=captain, status=accepted) e insere notificações com `user_id`

**Tabelas afetadas:** `matches` (INSERT), `tournaments` (UPDATE), `notifications` (INSERT)

**Resposta:**
```json
{ "success": true, "matches_created": 4 }
```

---

## `discord-webhook`

**Arquivo:** `supabase/functions/discord-webhook/index.ts`

**Segurança:** `verify_jwt: true`

Dispara mensagens para o `discord_webhook_url` configurado na tabela `tournaments`. Acionado por eventos de torneio (bracket gerado, resultado de partida, etc.).

---

## `send-email`

**Arquivo:** `supabase/functions/send-email/index.ts`

**Segurança:** `verify_jwt: true`

Envio de e-mails transacionais (convites de time, confirmação de inscrição, etc.).

---

## Webhook da Riot Games

A Riot envia callbacks de resultado de partida para:

```
POST /api/riot/tournament/callback
```

Essa rota Next.js grava o payload em `tournament_match_results` com `processed: false`. A Edge Function `process-match-results` consome esses registros de forma assíncrona via lock-and-process.

**Fluxo completo:**
```
Riot Games
  └─▶ POST /api/riot/tournament/callback (Next.js)
        └─▶ INSERT tournament_match_results { processed: false }
              └─▶ [cron / trigger] process-match-results (Edge Function)
                    └─▶ POST /api/internal/process-match (Next.js)
                          └─▶ atualiza matches + match_games + player_stats
```

---

## Variáveis de ambiente — resumo

| Variável | Usado em | Obrigatória |
|---|---|---|
| `RIOT_API_KEY` | `riot-api-sync`, `lib/riot.ts` | Sim |
| `SUPABASE_URL` | todas as Edge Functions | Sim |
| `SUPABASE_SERVICE_ROLE_KEY` | `riot-api-sync`, `process-match-results`, `bracket-generator` | Sim |
| `INTERNAL_SECRET` | `process-match-results` ↔ `/api/internal/process-match` | Sim |
| `SITE_URL` | `process-match-results` | Sim (produção) |
| `RIOT_REGION` | `lib/riot.ts` | Não (default: `br1`) |
| `RIOT_REGIONAL_HOST` | `lib/riot.ts` | Não (default: `americas`) |
| `CRON_SECRET` | `/api/cron/check-riot-status` | Sim |
