# tournament-stub-v5 — Torneios em Desenvolvimento

## O que é o tournament-stub-v5

O `tournament-stub-v5` é a API de **simulação** de torneios da Riot. Ela permite desenvolver e testar todo o fluxo de torneios sem precisar de uma Production Key aprovada. As partidas geradas pelo stub **não são partidas reais** — são registros simulados usados apenas para validar a integração.

Quando o BRLOL receber aprovação de Production Key, basta alterar **uma linha** em `lib/riot-tournament.ts`:

```typescript
// ATUAL (desenvolvimento)
const BASE = "/lol/tournament-stub/v5";

// PRODUÇÃO (trocar quando aprovado)
const BASE = "/lol/tournament/v5";
```

---

## Fluxo completo de criação de torneio

```
PASSO 1: Registrar Provider
POST /lol/tournament-stub/v5/providers
Body: { region: "BR", url: "https://brlol.app/api/riot/tournament/callback" }
Retorna: providerId (número inteiro)
──────────────────────────────────────────────────
PASSO 2: Criar Torneio
POST /lol/tournament-stub/v5/tournaments
Body: { name: "BRLOL Cup #1", providerId: 123 }
Retorna: tournamentId (número inteiro)
──────────────────────────────────────────────────
PASSO 3: Gerar Tournament Codes (um por partida)
POST /lol/tournament-stub/v5/codes?count=8&tournamentId=456
Body: { teamSize: 5, pickType: "TOURNAMENT_DRAFT", mapType: "SUMMONERS_RIFT", spectatorType: "ALL" }
Retorna: ["BR1_xxx", "BR1_yyy", ...] (array de strings)
──────────────────────────────────────────────────
PASSO 4: Distribuir codes para os times
Os jogadores entram no cliente do LoL e usam o code para criar o lobby
──────────────────────────────────────────────────
PASSO 5: Polling de eventos (a cada 30s)
GET /lol/tournament-stub/v5/lobby/events/by-code/BR1_xxx
Retorna: { eventList: [{ eventType, summonerId, timestamp }] }
──────────────────────────────────────────────────
PASSO 6: Resultado automático via Webhook
A Riot faz POST para a callbackUrl com os dados completos da partida
O BRLOL grava em tournament_match_results no Supabase
```

O helper `setupTournament()` em `lib/riot-tournament.ts` executa os passos 1, 2 e 3 automaticamente em sequência.

---

## Tournament Codes — detalhes

Um tournament code tem o formato `BR1_XXXXXXXXXXXX` e contém as regras da partida:

| Campo | Tipo | Valores possíveis | Descrição |
|---|---|---|---|
| `teamSize` | number | 1–5 | Jogadores por time (5 para Summoner's Rift) |
| `pickType` | string | `BLIND_PICK`, `DRAFT_MODE`, `ALL_RANDOM`, `TOURNAMENT_DRAFT` | Modo de seleção |
| `mapType` | string | `SUMMONERS_RIFT`, `TWISTED_TREELINE`, `HOWLING_ABYSS` | Mapa |
| `spectatorType` | string | `NONE`, `LOBBYONLY`, `ALL` | Quem pode assistir |
| `allowedSummonerIds` | string[] | PUUIDs | Restringe quais jogadores podem usar o code |
| `metadata` | string | qualquer | Dado customizado (ex: ID da partida no Supabase) |

**Recomendação:** use o campo `metadata` para guardar o ID da fase/partida no seu banco de dados. Assim, quando o callback chegar, você saberá exatamente qual partida do seu bracket foi concluída.

---

## Lobby Events — tipos de evento

O endpoint de eventos retorna uma lista de ações que aconteceram no lobby:

| `eventType` | Significado |
|---|---|
| `Practice` | Jogador entrou no lobby |
| `Start` | Partida iniciada (todos prontos) |
| (outros) | Saídas, timeouts, etc. |

O endpoint `app/api/riot/tournament/events/route.ts` adiciona dois campos extras de conveniência:
- `matchStarted: boolean` — true se evento `Start` foi detectado
- `playersInLobby: string[]` — summonerIds dos jogadores presentes

---

## Webhook Callback

Quando uma partida de torneio termina, a Riot faz um `POST` para a URL registrada no provider. No BRLOL, essa URL é:

```
https://gerenciador-de-torneios-brlol.vercel.app/api/riot/tournament/callback
```

### Payload recebido da Riot

```json
{
  "startTime": 1714123456000,
  "shortCode": "BR1_XXXXXXXXXXXX",
  "metaData": "fase-quartas-jogo-1",
  "gameId": 7001234567,
  "gameMode": "CLASSIC",
  "region": "BR1",
  "gameLength": 1823,
  "participants": [
    { "summonerId": "xxx", "teamId": 100, "win": true }
  ]
}
```

### O que acontece no callback

1. O payload é recebido em `app/api/riot/tournament/callback/route.ts`
2. É gravado na tabela `tournament_match_results` do Supabase com `processed: false`
3. Retorna `{ received: true }` imediatamente (mesmo em caso de erro de DB) para evitar retries infinitos da Riot
4. Um processo separado (ou trigger do Supabase) pode processar os resultados e atualizar o bracket

---

## Quando migrar para tournament-v5 (Production)

A Production Key exige aprovação da Riot. Para solicitar:

1. Acesse [developer.riotgames.com](https://developer.riotgames.com)
2. Clique em **Register Product**
3. Descreva o BRLOL: gerenciador de torneios comunitários de LoL no Brasil
4. Informe a URL do produto: `https://gerenciador-de-torneios-brlol.vercel.app`
5. A Riot avalia em dias a semanas

Após aprovação, altere `BASE` em `lib/riot-tournament.ts` de `tournament-stub-v5` para `tournament-v5`.
