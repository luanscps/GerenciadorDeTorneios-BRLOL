# Riot Games API — Conceitos e Integração

## Como a Riot API funciona

A Riot Games API é uma REST API autenticada por chave (`X-Riot-Token`). Ela opera em dois níveis de roteamento:

### Roteamento de plataforma vs. regional

| Tipo | URL | Usado para |
|---|---|---|
| **Platform** (por servidor) | `https://br1.api.riotgames.com` | summoner-v4, league-v4, champion-mastery-v4, spectator-v5, tournament-stub-v5 |
| **Regional** (continental) | `https://americas.api.riotgames.com` | account-v1, match-v5 |

O Brasil (`br1`) pertence à região continental `americas`. Isso significa que histórico de partidas e dados de conta são consultados via `americas.api.riotgames.com`, enquanto dados de invocador e rank usam `br1.api.riotgames.com`.

Essa configuração é automatizada em `lib/riot.ts` através das funções `getPlatformUrl()` e `getRegionalUrl()`, que leem a variável `RIOT_REGION`.

---

## Tipos de API Key

| Tipo | Limite por segundo | Limite por 2 min | Validade | Uso |
|---|---|---|---|---|
| **Development** | 20 req/s | 100 req/2min | Expira a cada 24h | Desenvolvimento local |
| **Personal** | 20 req/s | 100 req/2min | Permanente | Projetos pessoais/privados |
| **Production** | 500 req/s | 30.000 req/10min | Permanente | Produtos públicos aprovados |

> ⚠️ O BRLOL está em produção. Acesse [developer.riotgames.com](https://developer.riotgames.com) e registre o produto para obter uma **Production Key**.

---

## Todos os endpoints integrados ao projeto

### account-v1 (regional: americas)
| Endpoint | Método | Descrição | Cache TTL |
|---|---|---|---|
| `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` | GET | Busca PUUID por Nome#TAG | 600s |
| `/riot/account/v1/accounts/by-puuid/{puuid}` | GET | Busca conta por PUUID | — |

### summoner-v4 (platform: br1)
| Endpoint | Método | Descrição | Cache TTL |
|---|---|---|---|
| `/lol/summoner/v4/summoners/by-puuid/{puuid}` | GET | Dados do invocador | 300s |

### league-v4 (platform: br1)
| Endpoint | Método | Descrição | Cache TTL |
|---|---|---|---|
| `/lol/league/v4/entries/by-puuid/{puuid}` | GET | Rank solo/flex (tier, LP, winrate) | 300s |

### match-v5 (regional: americas)
| Endpoint | Método | Descrição | Cache TTL |
|---|---|---|---|
| `/lol/match/v5/matches/by-puuid/{puuid}/ids` | GET | IDs das últimas N partidas | 120s |
| `/lol/match/v5/matches/{matchId}` | GET | Detalhes completos de uma partida | 3600s |

### champion-mastery-v4 (platform: br1)
| Endpoint | Método | Descrição | Cache TTL |
|---|---|---|---|
| `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top` | GET | Top N maestrias | 600s |

### tournament-stub-v5 (platform: br1) — Desenvolvimento
| Endpoint | Método | Descrição |
|---|---|---|
| `/lol/tournament-stub/v5/providers` | POST | Registrar provider (URL callback) |
| `/lol/tournament-stub/v5/tournaments` | POST | Criar torneio |
| `/lol/tournament-stub/v5/codes` | POST | Gerar tournament codes |
| `/lol/tournament-stub/v5/codes/{tournamentCode}` | GET | Detalhes de um code |
| `/lol/tournament-stub/v5/codes/{tournamentCode}` | PUT | Atualizar code |
| `/lol/tournament-stub/v5/lobby/events/by-code/{code}` | GET | Eventos de lobby |

### lol-status-v4 (platform: br1)
| Endpoint | Método | Descrição | Usado em |
|---|---|---|---|
| `/lol/status/v4/platform-data` | GET | Status de manutenções e incidentes | Cron semanal |

---

## Códigos de resposta HTTP

| Código | Significado | Ação recomendada |
|---|---|---|
| 200 | Sucesso | Processar normalmente |
| 400 | Parâmetro inválido | Verificar campos enviados |
| 401 | API Key ausente | Configurar `RIOT_API_KEY` no servidor |
| 403 | API Key inválida/expirada | Renovar em developer.riotgames.com |
| 404 | Recurso não encontrado | Verificar Nome#TAG ou ID |
| 415 | Content-Type errado | Enviar `application/json` |
| 429 | Rate limit atingido | Ver header `Retry-After` e `X-Rate-Limit-Type` |
| 500 | Erro interno da Riot | Tentar novamente após alguns segundos |
| 503 | Serviço indisponível | Aguardar — consultar lol-status-v4 |

Todos esses códigos são tratados em `lib/riot-rate-limiter.ts` pela função `riotErrorResponse()`, que retorna mensagens em português para o frontend.

---

## Fluxo de identificação de jogador

Para obter dados completos de um jogador a partir do Riot ID (`Nome#TAG`):

```
Nome#TAG
   │
   ▼ account-v1 (americas)
 puuid ──────────────────────────────────────┐
   │                                         │
   ▼ summoner-v4 (br1)    ▼ league-v4       ▼ mastery-v4
 { id, level,           { tier, rank,      [ { championId,
   profileIconId }        LP, wins }          points } ]
   │
   ▼ match-v5 (americas)
 [ matchId1, matchId2, ... ]
   │
   ▼ match-v5 (americas)
 { participants, teams, duration, ... }
```

Esse fluxo é executado em `app/api/riot/summoner/route.ts` usando `Promise.all()` para paralelizar as 3 chamadas após obter o PUUID.

---

## Data Dragon (assets estáticos)

Ícones de campeões e perfis são servidos pelo CDN da Riot:

```
https://ddragon.leagueoflegends.com/cdn/{versão}/img/profileicon/{iconId}.png
https://ddragon.leagueoflegends.com/cdn/{versão}/img/champion/{championName}.png
```

A versão atual é obtida dinamicamente via:
```
https://ddragon.leagueoflegends.com/api/versions.json
```

Em `lib/riot.ts`, a função `getDDVersion()` faz cache dessa versão por 1 hora para evitar chamadas repetidas.
