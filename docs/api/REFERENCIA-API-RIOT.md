# Referência da Riot Games API — ArenaGG

> **Escopo:** endpoints reais consumidos pelo projeto + referência completa útil.
> Fonte dos assets: CommunityDragon (não Data Dragon).
> Última revisão: 2026-06-01

---

## Base URLs

| Tipo | URL Base | Usado para |
|---|---|---|
| **Platform BR1** | `https://br1.api.riotgames.com` | summoner-v4, league-v4, spectator-v5, champion-mastery-v4, lol-status-v4 |
| **Regional Americas** | `https://americas.api.riotgames.com` | account-v1, match-v5, tournament-v5 |

**Helper em `lib/riot.ts`:**
```ts
getPlatformUrl()  // → "https://br1.api.riotgames.com"
getRegionalUrl()  // → "https://americas.api.riotgames.com"
```

**Header obrigatório em todas as chamadas:**
```
X-Riot-Token: <RIOT_API_KEY>
```

---

## Rate Limits

| Tipo de Chave | Limite Pessoal | Limite de Método |
|---|---|---|
| **Development Key** | 20 req/1s, 100 req/2min | varia por endpoint |
| **Production Key** | 500 req/10s, 30.000 req/10min | varia por endpoint |

**Controle no projeto:** `lib/riot-rate-limiter.ts` — fila por método, backoff exponencial.

---

## account-v1

**Base:** `https://americas.api.riotgames.com/riot/account/v1`

| Endpoint | Método | Usado em |
|---|---|---|
| `/accounts/by-riot-id/{gameName}/{tagLine}` | GET | `linkRiotAccount()` — vincula conta ao perfil |
| `/accounts/by-puuid/{puuid}` | GET | `riot-api-sync` Edge Fn — valida puuid ativo |

**Campos armazenados em `riot_accounts`:** `puuid`, `game_name`, `tag_line`

---

## summoner-v4

**Base:** `https://br1.api.riotgames.com/lol/summoner/v4`

| Endpoint | Método | Usado em |
|---|---|---|
| `/summoners/by-puuid/{puuid}` | GET | `riot-api-sync` — obtém `summonerId` para league-v4 |

**Campos usados:** `id` (summonerId), `profileIconId`, `summonerLevel`

---

## league-v4

**Base:** `https://br1.api.riotgames.com/lol/league/v4`

| Endpoint | Método | Usado em |
|---|---|---|
| `/entries/by-summoner/{summonerId}` | GET | `riot-api-sync` — obtém rank/LP |

**Resposta relevante:**
```json
[{
  "queueType": "RANKED_SOLO_5x5",
  "tier": "GOLD",
  "rank": "II",
  "leaguePoints": 47,
  "wins": 123,
  "losses": 98
}]
```

**Tabelas:** `players` (tier, rank, lp atuais), `rank_snapshots` (histórico diário)

### Tiers e Ranks

| Tier | Ranks disponíveis |
|---|---|
| IRON, BRONZE, SILVER, GOLD, PLATINUM, EMERALD, DIAMOND | I, II, III, IV |
| MASTER, GRANDMASTER, CHALLENGER | (sem rank, apenas LP) |

### Tipos de Fila (queueType)

| queueType | Descrição |
|---|---|
| `RANKED_SOLO_5x5` | Solo/Duo Ranqueado |
| `RANKED_FLEX_SR` | Flex Ranqueado |
| `RANKED_TFT` | TFT Ranqueado |

---

## spectator-v5

**Base:** `https://br1.api.riotgames.com/lol/spectator/v5`

| Endpoint | Método | Usado em |
|---|---|---|
| `/active-games/by-summoner/{puuid}` | GET | `fazerCheckinOrganizador()` em `lib/actions/inscricao.ts` |

**Comportamento:** chamada best-effort no check-in do organizador. Se a Riot retornar erro (offline, jogador não em jogo), o check-in é **liberado mesmo assim** — não bloqueia o fluxo.

**Headers:**
```ts
{ 'X-Riot-Token': process.env.RIOT_API_KEY }
```

---

## champion-mastery-v4

**Base:** `https://br1.api.riotgames.com/lol/champion-mastery/v4`

| Endpoint | Método | Usado em |
|---|---|---|
| `/champion-masteries/by-puuid/{puuid}/top?count=10` | GET | Sync de maestria no perfil |

**Tabela:** `champion_masteries` (champion_id, mastery_level, mastery_points, last_play_time)

---

## lol-status-v4

**Base:** `https://br1.api.riotgames.com/lol/status/v4`

| Endpoint | Método | Usado em |
|---|---|---|
| `/platform-data` | GET | Cron monitor de incidentes BR1 |

**Nota:** este cron é **somente monitoramento** — não atualiza ranks nem dados de jogadores.

---

## match-v5

**Base:** `https://americas.api.riotgames.com/lol/match/v5`

| Endpoint | Método | Usado em |
|---|---|---|
| `/matches/by-puuid/{puuid}/ids?queue=420&start=0&count=20` | GET | Histórico de partidas ranqueadas |
| `/matches/{matchId}` | GET | Detalhes de uma partida para `player_stats` |

**Tipos de fila (queue):**

| queue | Tipo |
|---|---|
| 420 | Solo/Duo Ranqueado |
| 440 | Flex Ranqueado |
| 450 | ARAM |
| 400 | Normal Draft |

---

## tournament-v5 (Production) / tournament-stub-v5 (Dev)

**Base:**
- Production: `https://americas.api.riotgames.com/lol/tournament/v5`
- Stub (dev): `https://americas.api.riotgames.com/lol/tournament-stub/v5`

> ⚠️ **tournament-v5 exige Production Key.** Em desenvolvimento, use `tournament-stub-v5` — os códigos gerados não funcionam em partidas reais, mas o fluxo é idêntico.

| Endpoint | Método | Usado em |
|---|---|---|
| `POST /providers` | POST | Registra provider (URL do callback) |
| `POST /tournaments` | POST | Cria torneio na Riot |
| `POST /codes` | POST | Gera `tournamentCode` por partida |
| `GET /codes/{tournamentCode}` | GET | Verifica status do código |
| `GET /lobby-events/by-code/{tournamentCode}` | GET | Eventos de lobby da partida |

**Campos armazenados em `riot_tournament_registrations`:**
- `riot_provider_id` — ID do provider registrado
- `riot_tournament_id` — ID do torneio na Riot
- `tournament_id` — FK para `tournaments`

**Códigos de torneio:**
- Armazenados em `matches.tournament_codes` (JSONB)
- Formato: `BR1-XXXX-XXXX-XXXX-XXXX-XX`

---

## Callback da Riot (Resultado de Partida)

**Rota no projeto:** `POST /api/riot/tournament/callback`

**Validação:** header `X-Riot-Token` (HMAC) — rejeitado com 401 se inválido.

**Payload recebido:**
```json
{
  "startTime": 1700000000000,
  "shortCode": "BR1-XXXX-XXXX-XXXX-XXXX-XX",
  "metaData": "matchId_123",
  "gameId": 987654321,
  "gameName": "teambuilder-match-987654321",
  "gameType": "MATCHED_GAME",
  "gameMap": 11,
  "gameMode": "CLASSIC",
  "region": "BR1",
  "winningTeam": [{ "puuid": "...", "summonerId": "..." }],
  "losingTeam": [{ "puuid": "...", "summonerId": "..." }]
}
```

**Fluxo após recebimento:**
1. Insere em `tournament_match_results` (campo `game_data` JSONB)
2. Chama `process-match` para atualizar `match_games` e avançar bracket

---

## Assets — CommunityDragon (CDragon)

> O projeto usa **CommunityDragon**, não Data Dragon (ddragon).

**Base URLs CDragon:**
```
https://raw.communitydragon.org/16.10/
https://raw.communitydragon.org/latest/
```

### Profile Icons
```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/{iconId}.jpg
```

### Champion Square (avatar 120×120)
```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/{championId}.png
```

### Champion Splash (loading screen art)
```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/{championId}/{championId}000.jpg
```

### Items
```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/items/icons2d/{itemId}.png
// Formato do nome: geralmente lowercase sem espaços, ex: "rageblade.png"
```

### Spell Icons (Summoner Spells)
```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/data/spells/icons2d/{spellName}.png
```

### Rune / Perks
```
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/perk-images/styles/{path}.png
```

> Para mapear `championId → nome/assets`, consulte:
> `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-summary.json`

---

## Tratamento de Erros Riot API

| HTTP Status | Significado | Ação recomendada |
|---|---|---|
| 400 | Bad Request | Validar parâmetros antes de chamar |
| 401 | Unauthorized | Checar `RIOT_API_KEY` no `.env` |
| 403 | Forbidden | Endpoint requer Production Key |
| 404 | Not Found | Conta/partida não existe |
| 429 | Rate Limit | Backoff exponencial (`lib/riot-rate-limiter.ts`) |
| 500/503 | Riot offline | Log + fallback (não bloquear fluxo) |

---

## Variáveis de Ambiente Necessárias

```env
RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
RIOT_CALLBACK_URL=https://arenagg.com.br/api/riot/tournament/callback
RIOT_TOURNAMENT_REGION=BRAZIL
```
