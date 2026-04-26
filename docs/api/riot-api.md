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
 puuid ────────────────────────────────────────────┬
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

## Assets Estáticos — Sem API Key

Todos os assets de imagem do jogo são servidos por CDNs públicas que **não requerem API Key**. O projeto possui funções helper em `lib/riot.ts` para cada tipo de asset.

### Data Dragon (`ddragon.leagueoflegends.com`)

CDN oficial da Riot para assets estáticos. A versão do patch é obtida dinamicamente por `getDDVersion()` e cacheada por 1 hora.

| Função | Fonte | Descrição |
|---|---|---|
| `profileIconUrl(id)` | Data Dragon | Ícone de perfil do invocador |
| `championIconUrl(name)` | Data Dragon | Ícone quadrado do campeão |
| `championSplashUrl(name, skinNum?)` | Data Dragon | Splash art do campeão (skin 0 = base) |
| `championLoadingUrl(name, skinNum?)` | Data Dragon | Loading screen do campeão |
| `itemIconUrl(itemId)` | Data Dragon | Ícone do item (item0–item6 de `MatchParticipant`) |
| `summonerSpellIconUrl(spellId)` | Data Dragon | Ícone de summoner spell |
| `getAllChampions()` | Data Dragon JSON | Todos os campeões em `pt_BR` com metadados |

#### URLs diretas (Data Dragon)

```
# Ícone de perfil
https://ddragon.leagueoflegends.com/cdn/{v}/img/profileicon/{id}.png

# Ícone quadrado de campeão
https://ddragon.leagueoflegends.com/cdn/{v}/img/champion/{Name}.png

# Splash art (skin base)
https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{Name}_0.jpg

# Splash art (skin específica)
https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{Name}_{num}.jpg

# Loading screen
https://ddragon.leagueoflegends.com/cdn/img/champion/loading/{Name}_{num}.jpg

# Ícone de item
https://ddragon.leagueoflegends.com/cdn/{v}/img/item/{itemId}.png

# Ícone de summoner spell
https://ddragon.leagueoflegends.com/cdn/{v}/img/spell/{spellId}.png

# Versão atual do patch
https://ddragon.leagueoflegends.com/api/versions.json

# JSON de todos os campeões (pt_BR)
https://ddragon.leagueoflegends.com/cdn/{v}/data/pt_BR/champion.json
```

> **Nota sobre `{Name}`:** o Data Dragon usa o nome interno do campeão sem espaços e com capitalização específica. Exemplos: `MissFortune`, `AurelionSol`, `Wukong`. Use a propriedade `id` do JSON de `getAllChampions()` para obter o nome correto.

#### Exemplo de uso no componente

```tsx
import { championSplashUrl, itemIconUrl, rankEmblemUrl } from "@/lib/riot";

// Splash art como banner de perfil
<img
  src={championSplashUrl("Jinx", 0)}
  alt="Jinx splash art"
  width={1215}
  height={717}
/>

// Item no histórico de partida
{participant.item0 > 0 && (
  <img
    src={await itemIconUrl(participant.item0)}
    alt={`Item ${participant.item0}`}
    width={32}
    height={32}
  />
)}

// Emblema de rank
<img
  src={rankEmblemUrl(entry.tier)}
  alt={entry.tier}
  width={48}
  height={48}
/>
```

---

### CommunityDragon (`raw.communitydragon.org`)

Projeto da comunidade que extrai assets diretamente do cliente do jogo. Usado para assets **não disponíveis** no Data Dragon oficial.

| Função | Descrição |
|---|---|
| `rankEmblemUrl(tier)` | Emblema visual do rank (Iron → Challenger) |
| `masteryIconUrl(level)` | Ícone de nível de maestria (1–10) |

#### URLs diretas (CommunityDragon)

```
# Emblema de rank
https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-mini-regalia/{tier}.png

# Exemplo: iron, bronze, silver, gold, platinum, emerald, diamond, master, grandmaster, challenger
https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-shared-components/global/default/ranked-mini-regalia/gold.png

# Nível de maestria (1 a 10)
https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-champion-mastery/global/default/mastery-{level}.png
```

#### Parâmetros aceitos por `rankEmblemUrl()`

| Tier | Parâmetro |
|---|---|
| Ferro | `"iron"` |
| Bronze | `"bronze"` |
| Prata | `"silver"` |
| Ouro | `"gold"` |
| Platina | `"platinum"` |
| Esmeralda | `"emerald"` |
| Diamante | `"diamond"` |
| Mestre | `"master"` |
| Grã-Mestre | `"grandmaster"` |
| Desafiante | `"challenger"` |

A função `rankEmblemUrl()` já aplica `.toLowerCase()` automaticamente, então `rankEmblemUrl(entry.tier)` funciona diretamente com o retorno da API `league-v4`.

---

### getAllChampions() — JSON completo em pt_BR

Retorna um objeto com **todos os campeões** do patch atual indexados pelo nome interno (`id`).

```typescript
const champions = await getAllChampions();
// champions["Ahri"] =>
// {
//   id: "Ahri",
//   key: "103",
//   name: "Ahri",           // nome em pt_BR
//   title: "a Raposa de Nove Caudas",
//   blurb: "...",            // descrição curta
//   tags: ["Mage", "Assassin"],
//   image: { full: "Ahri.png", ... }
// }
```

**Casos de uso no projeto:**
- Seletor de campeão ao criar fase do torneio (ban/pick)
- Filtro de campeão no histórico de partidas
- Exibição do nome em português no perfil do jogador
- Mapeamento de `championId` (numérico) → nome interno para montar URLs de asset

> **Mapeando ID numérico para nome:** A API retorna `championId: 103` (Ahri). O JSON do Data Dragon contém o campo `key: "103"`. Para converter, itere sobre `getAllChampions()` e encontre o campeão onde `champion.key === String(championId)`.

```typescript
export async function getChampionNameById(championId: number): Promise<string | null> {
  const all = await getAllChampions();
  const found = Object.values(all).find(c => c.key === String(championId));
  return found?.id ?? null; // retorna o nome interno (ex: "MissFortune")
}
```

---

## Referência completa de funções de asset em `lib/riot.ts`

| Função | Async | Parâmetros | Retorno | CDN |
|---|---|---|---|---|
| `getDDVersion()` | sim | — | `string` (ex: `"16.8.1"`) | Data Dragon |
| `profileIconUrl(id)` | sim | `id: number` | URL `.png` | Data Dragon |
| `championIconUrl(name)` | sim | `name: string` | URL `.png` | Data Dragon |
| `championSplashUrl(name, skinNum?)` | **não** | `name: string`, `skinNum?: number` (default 0) | URL `.jpg` | Data Dragon |
| `championLoadingUrl(name, skinNum?)` | **não** | `name: string`, `skinNum?: number` (default 0) | URL `.jpg` | Data Dragon |
| `itemIconUrl(itemId)` | sim | `itemId: number` | URL `.png` | Data Dragon |
| `summonerSpellIconUrl(spellId)` | sim | `spellId: string` | URL `.png` | Data Dragon |
| `rankEmblemUrl(tier)` | **não** | `tier: string` | URL `.png` | CommunityDragon |
| `masteryIconUrl(level)` | **não** | `level: number` (1–10) | URL `.png` | CommunityDragon |
| `getAllChampions()` | sim | — | `Record<string, ChampionBasic>` | Data Dragon |

> Funções **não-async** (splash, loading, rank, maestria) retornam a URL imediatamente sem precisar esperar a versão do patch, pois seus URLs não dependem de `{v}`.
