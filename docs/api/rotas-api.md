# Referência de Rotas API

Todas as rotas são prefixadas por `/api`. O projeto usa Next.js App Router com `route.ts` por convenção.

---

## Rotas públicas (sem autenticação)

### `GET /api/riot/summoner`

Busca dados completos de um invocador pelo Riot ID.

**Query params:**
| Parâmetro | Tipo | Obrigatório | Exemplo |
|---|---|---|---|
| `riotId` | string | Sim | `Faker%23BR1` (usar `#` como `%23`) |

**Resposta de sucesso (200):**
```json
{
  "account": { "puuid": "...", "gameName": "Faker", "tagLine": "BR1" },
  "summoner": { "id": "...", "profileIconId": 5678, "summonerLevel": 412 },
  "entries": [
    {
      "queueType": "RANKED_SOLO_5x5",
      "tier": "DIAMOND",
      "rank": "II",
      "leaguePoints": 75,
      "wins": 123,
      "losses": 98
    }
  ],
  "masteries": [
    { "championId": 103, "championName": "Ahri", "championLevel": 7, "championPoints": 450000 }
  ]
}
```

**Rate limit cliente:** 30 req/min por IP.

---

### `GET /api/riot/matches`

Lista IDs das partidas recentes de um jogador.

**Query params:**
| Parâmetro | Tipo | Padrão | Descrição |
|---|---|---|---|
| `puuid` | string | — | PUUID do jogador |
| `count` | number | 20 | Quantidade de IDs (máx: 100) |
| `queue` | number | — | Filtro por fila (ex: 420 = Ranked Solo) |

---

### `GET /api/riot/match`

Detalhes completos de uma partida.

**Query params:**
| Parâmetro | Tipo | Obrigatório |
|---|---|---|
| `matchId` | string | Sim |

---

### `GET /api/riot/tournament/codes`

Busca detalhes de um tournament code específico.

**Query params:**
| Parâmetro | Tipo | Exemplo |
|---|---|---|
| `code` | string | `BR1_XXXXXXXXXXXX` |

**Resposta (200):**
```json
{
  "code": "BR1_XXXXXXXXXXXX",
  "teamSize": 5,
  "pickType": "TOURNAMENT_DRAFT",
  "mapType": "SUMMONERS_RIFT",
  "spectatorType": "ALL",
  "metaData": "fase-quartas-jogo-1",
  "participants": ["puuid1", "puuid2"]
}
```

---

### `GET /api/riot/tournament/events`

Polling de eventos de lobby de uma partida em andamento.

**Query params:**
| Parâmetro | Tipo | Exemplo |
|---|---|---|
| `code` | string | `BR1_XXXXXXXXXXXX` |

**Resposta (200):**
```json
{
  "eventList": [
    { "summonerId": "xxx", "eventType": "Practice", "timestamp": "..." }
  ],
  "matchStarted": false,
  "playersInLobby": ["summonerId1", "summonerId2"]
}
```

> **Recomendação:** faça polling a cada 30 segundos.

---

## Rotas protegidas (requer `role = "admin"`)

### `POST /api/riot/tournament`

Cria torneio via tournament-stub-v5. Suporta 3 ações via campo `action`.

**Body (action = "setup" — fluxo completo):**
```json
{
  "action": "setup",
  "tournamentName": "BRLOL Cup #1",
  "matchCount": 8,
  "teamSize": 5,
  "pickType": "TOURNAMENT_DRAFT",
  "mapType": "SUMMONERS_RIFT",
  "spectatorType": "ALL"
}
```

**Resposta (200):**
```json
{
  "success": true,
  "providerId": 123,
  "tournamentId": 456,
  "codes": ["BR1_AAA", "BR1_BBB"],
  "message": "Torneio \"BRLOL Cup #1\" criado com 8 códigos (stub-v5)."
}
```

---

### `POST /api/riot/tournament/codes`

Gera novos tournament codes para um torneio existente.

**Body:**
```json
{
  "tournamentId": 456,
  "count": 4,
  "teamSize": 5,
  "pickType": "TOURNAMENT_DRAFT",
  "mapType": "SUMMONERS_RIFT",
  "spectatorType": "ALL",
  "metadata": "fase-semi"
}
```

---

### `PUT /api/riot/tournament/codes?code=BR1_XXX`

Atualiza configurações de um code existente.

**Body:**
```json
{ "pickType": "BLIND_PICK", "spectatorType": "NONE" }
```

---

## Webhook (chamado pela Riot)

### `POST /api/riot/tournament/callback`

Recebe resultado de partida de torneio diretamente da Riot Games. Grava automaticamente na tabela `tournament_match_results` do Supabase com `processed: false`.

---

## Cron (chamado pela Vercel automaticamente)

### `GET /api/cron/check-riot-status`

Verifica o status da Riot API BR1. Executado toda segunda-feira às 12:00 UTC (09:00 BRT).

**Headers obrigatórios (chamada manual):**
```
Authorization: Bearer {CRON_SECRET}
```

---

## Códigos de erro padrão

```json
{ "error": "mensagem em português" }
```

| Status | Quando ocorre |
|---|---|
| 400 | Parâmetros inválidos ou ausentes |
| 401 | Usuário não autenticado ou sem role admin |
| 403 | API Key da Riot inválida ou expirada |
| 404 | Jogador, partida ou code não encontrado |
| 429 | Rate limit atingido — header `Retry-After` presente |
| 500 | Erro interno (server) ou Riot API instável |
