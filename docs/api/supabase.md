# Supabase — Edge Functions e Integrações

Este documento descreve todas as Edge Functions ativas no projeto, seus contratos de entrada/saída, segurança e dependências de banco.

> Fonte de verdade: código real das funções em `supabase/functions/` + dados ao vivo do dashboard `awbieglbwhfavxlghuvy`.

---

## Edge Functions ativas

| Slug | Versão | `verify_jwt` | Status | Descrição |
|---|---|---|---|---|
| `riot-api-sync` | 21 | ❌ false | ACTIVE | Sync de rank/icon de contas Riot em lote |
| `process-match-results` | 8 | ✅ true | ACTIVE | Processa resultados de partidas de torneio pendentes |
| `bracket-generator` | 19 | ✅ true | ACTIVE | Gera chaveamento de torneio (Single Elimination) |
| `discord-webhook` | 18 | ✅ true | ACTIVE | Dispara notificações Discord |
| `send-email` | 18 | ✅ true | ACTIVE | Envio de e-mails transacionais |

---

## `riot-api-sync`

**Arquivo:** `supabase/functions/riot-api-sync/index.ts`

**Segurança:** `verify_jwt: false` — autenticada via `SUPABASE_SERVICE_ROLE_KEY` internamente. Não requer JWT de usuário.

> ⚠️ Por ter `verify_jwt: false`, a URL da função não deve ser exposta publicamente. Invocar apenas via cron ou chamada server-side com service role.

**Variáveis de ambiente necessárias:**
- `RIOT_API_KEY`
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`

**Parâmetros de configuração internos:**

| Constante | Valor | Descrição |
|---|---|---|
| `BATCH_SIZE` | 50 | Máximo de contas sincronizadas por execução |
| `STALE_MINUTES` | 10 | Reprocessa contas com `updated_at` mais antigo que 10min |
| `DELAY_MS` | 300 | Delay entre chamadas Riot API (anti-rate-limit) |

**Fluxo:**
1. Busca até 50 `riot_accounts` com `updated_at < now - 10min`
2. Para cada conta:
   - `summoner-v4/by-puuid` → atualiza `riot_accounts.profile_icon_id` e `summoner_level`
   - `league-v4/entries/by-puuid` → insere em `rank_snapshots` (apenas `RANKED_SOLO_5x5` e `RANKED_FLEX_SR`)
3. Retry em 429: sleep fixo de 6s (não lê o header `Retry-After` — melhoria pendente)

**Tabelas afetadas:** `riot_accounts` (UPDATE), `rank_snapshots` (INSERT)

**Resposta de sucesso:**
```json
{ "synced": 12, "total": 15, "results": [...] }
```

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

> 🔴 **Problemas identificados no código atual (v19) — correções pendentes:**
>
> 1. **`serve` deprecado** — usa `serve` de `https://deno.land/std@0.168.0/http/server.ts`. Migrar para `Deno.serve()` (padrão atual).
> 2. **`esm.sh` deprecado** — usa `https://esm.sh/@supabase/supabase-js@2`. Migrar para `jsr:@supabase/supabase-js@2`.
> 3. **Enum inválido** — atualiza `tournaments.status` para `'ongoing'`, mas o enum `tournament_status` **não possui esse valor**. Valores válidos: `DRAFT | OPEN | IN_PROGRESS | FINISHED | CANCELLED`. **Corrigir para `'IN_PROGRESS'`**.
> 4. **Notificação sem `user_id`** — o INSERT em `notifications` não passa `user_id` (coluna NOT NULL), causando falha silenciosa no fire-and-forget.

**Body da requisição:**
```json
{ "tournament_id": "uuid" }
```

**Fluxo:**
1. Verifica se bracket já existe (`matches` para o torneio → 409 se sim)
2. Busca inscrições `APPROVED + checked_in = true`; fallback para todos `APPROVED` se < 2 times
3. Fisher-Yates shuffle
4. Monta confrontos (seed: 1 vs N, 2 vs N-1...) — arredonda para próxima potência de 2, BYEs ignorados
5. INSERT em `matches` + atualiza status do torneio

**Tabelas afetadas:** `matches` (INSERT), `tournaments` (UPDATE status)

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
