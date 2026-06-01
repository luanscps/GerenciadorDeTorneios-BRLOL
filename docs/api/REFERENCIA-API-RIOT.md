# Referência da API Riot Games

> **Fonte de verdade:** `lib/riot.ts`, `lib/riot-tournament.ts`, `lib/riot-rate-limiter.ts`, `lib/riot-cache.ts`.
> Documentação oficial: [developer.riotgames.com](https://developer.riotgames.com)

---

## Base URLs

| Tipo | Base URL | Usado para |
|---|---|---|
| Regional BR1 | `https://br1.api.riotgames.com` | summoner-v4, league-v4, champion-mastery-v4 |
| Continental Americas | `https://americas.api.riotgames.com` | account-v1, match-v5, tournament-v5 |

---

## Autenticação

Todas as chamadas exigem a chave de API no header:

```
X-Riot-Token: {RIOT_API_KEY}
```

Variáveis de ambiente (`.env.local`):

```
RIOT_API_KEY=RGAPI-xxxx-xxxx-xxxx-xxxx
RIOT_TOURNAMENT_API_KEY=RGAPI-yyyy-yyyy-yyyy (chave Tournament — produção)
RIOT_CALLBACK_SECRET=<HMAC secret para validação do callback>
```

---

## Endpoints Utilizados

### account-v1

**Plataforma:** `americas.api.riotgames.com`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | Retorna `puuid`, `gameName`, `tagLine` |
| GET | `/riot/account/v1/accounts/by-puuid/{puuid}` | Retorna dados da conta pelo puuid |

```typescript
// lib/riot.ts
const account = await riotRequest<RiotAccount>(
  `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${name}/${tag}`
)
```

---

### summoner-v4

**Plataforma:** `br1.api.riotgames.com`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/lol/summoner/v4/summoners/by-puuid/{puuid}` | `summonerId`, `profileIconId`, `summonerLevel` |
| GET | `/lol/summoner/v4/summoners/{summonerId}` | Busca pelo summonerId |

---

### league-v4

**Plataforma:** `br1.api.riotgames.com`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/lol/league/v4/entries/by-puuid/{puuid}` | Entradas de filas ranqueadas (SoloQ, FlexQ) |
| GET | `/lol/league/v4/entries/{queue}/{tier}/{division}` | Listagem geral por tier/divisão |

Resposta por entrada:
```json
{
  "queueType": "RANKED_SOLO_5x5",
  "tier": "DIAMOND",
  "rank": "II",
  "leaguePoints": 75,
  "wins": 120,
  "losses": 98
}
```

---

### match-v5

**Plataforma:** `americas.api.riotgames.com`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/lol/match/v5/matches/{matchId}` | Detalhes completos da partida |
| GET | `/lol/match/v5/matches/by-puuid/{puuid}/ids` | IDs de partidas por jogador |
| GET | `/lol/match/v5/matches/{matchId}/timeline` | Timeline de eventos da partida |

Usado em: `app/api/riot/match/route.ts`, `app/api/riot/matches/route.ts`

---

### champion-mastery-v4

**Plataforma:** `br1.api.riotgames.com`

| Método | Endpoint | Descrição |
|---|---|---|
| GET | `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}` | Lista de maestrias do invocador |
| GET | `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top` | Top 3 maestrias |

Tabela destino: `champion_masteries` (puuid, champion_id, mastery_level, mastery_points)

---

### tournament-v5 (produção)

**Plataforma:** `americas.api.riotgames.com`  
**Chave:** `RIOT_TOURNAMENT_API_KEY` (aprovação especial Riot)

| Método | Endpoint | Descrição |
|---|---|---|
| POST | `/lol/tournament/v5/providers` | Registra provider (URL de callback) |
| POST | `/lol/tournament/v5/tournaments` | Cria torneio na Riot |
| POST | `/lol/tournament/v5/codes` | Gera tournament codes por partida |
| GET | `/lol/tournament/v5/codes/{code}` | Detalhes de um código |
| PUT | `/lol/tournament/v5/codes/{code}` | Atualiza parâmetros do código |
| GET | `/lol/tournament/v5/lobby-events/by-code/{code}` | Eventos de lobby |

Armazenamento: `riot_tournament_registrations` (riot_provider_id, riot_tournament_id)  
Códigos: `matches.tournament_codes` (JSON)

### tournament-stub-v5 (desenvolvimento)

**Plataforma:** `americas.api.riotgames.com`  
**Chave:** chave de desenvolvimento padrão (`RIOT_API_KEY`)

Endpoints idênticos ao `tournament-v5`, porém no path `/lol/tournament-stub/v5/`.  
Não gera partidas reais. Usado em ambiente local/dev/staging.

Detalhes completos de stub/produção: [`docs/api/tournament-stub.md`](./tournament-stub.md)

---

## Rate Limiting

Detalhes completos: [`docs/api/rate-limiting.md`](./rate-limiting.md)

Regras Riot (produção — Production Key):

| Janela | Limite |
|---|---|---|
| 1 segundo | 20 requisições |
| 2 minutos | 100 requisições |

Implementação no projeto: `lib/riot-rate-limiter.ts`
- Rate limiting multi-camada (em memória)
- Fila com retry automático em caso de `429`
- Back-off exponencial: `Retry-After` header respeitado

---

## Cache

Implementação: `lib/riot-cache.ts`

| Dado | TTL padrão |
|---|---|
| Summoner data (ícone, nível) | 10 minutos |
| League entries (rank/LP) | 5 minutos |
| Match data | 24 horas (imutável após a partida) |
| Account (puuid) | 1 hora |

O cache é **em memória** (não persistido entre instâncias Vercel). Em produção, cada serverless function tem cache independente.

---

## Assets (CDragon / DDragon)

O projeto usa CommunityDragon para assets de campeões e ícones:

| Asset | URL |
|---|---|
| Ícone de perfil | `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/{id}.jpg` |
| Splash de campeão | `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-splashes/{champId}/{champId}000.jpg` |
| Square de campeão | `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/{champId}.png` |
| Item | `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/assets/items/icons2d/{itemId}_t1_itemicon.png` |

Versão de patch fixada: `16.10` (ou `latest` para sempre buscar o mais recente).

```typescript
// Exemplo de helper em lib/riot.ts
export function getProfileIconUrl(iconId: number) {
  return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/profile-icons/${iconId}.jpg`
}
```

---

## Callback da Riot (Webhook)

Endpoint: `POST /api/riot/tournament/callback`  
Arquivo: `app/api/riot/tournament/callback/route.ts`

**Payload recebido da Riot:**
```json
{
  "startTime": 1717200000000,
  "shortCode": "BR1-12345-ABCDE-...",
  "metaData": "{}",
  "gameId": 7123456789,
  "gameName": "teambuilder-match-7123456789",
  "gameType": "TeamBuilderDraftMode5x5",
  "gameMap": 11,
  "gameMode": "CLASSIC",
  "region": "BR1",
  "participants": [
    { "summonerId": "...", "team": 100 },
    ...
  ],
  "winningTeam": [
    { "summonerId": "..." },
    ...
  ]
}
```

**Validação HMAC:**
```typescript
const signature = req.headers.get('X-Riot-Token')
const expected  = createHmac('sha256', RIOT_CALLBACK_SECRET)
                    .update(body)
                    .digest('hex')
if (signature !== expected) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
```

**Fluxo completo:** ver [`docs/api/fluxos.md`](./fluxos.md) — Seção 2.
