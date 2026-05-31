# Riot Games API — Detalhes técnicos de integração

> Para a **visão funcional completa** (como os dados entram no banco Supabase, mapeamento de tabelas, Edge Functions de sync e fluxos de negócio), consulte primeiro:
> - [`../BRLOL-DOCS-UNIFICADO.md`](../BRLOL-DOCS-UNIFICADO.md) → seção "Riot Games API — Visão unificada"
>
> Este arquivo aprofunda **configuração de roteamento, rate limits, códigos HTTP, assets estáticos e exemplos de uso de funções helper** — é a referência de implementação.

---

## Roteamento: Platform vs. Regional

| Tipo | URL base | Endpoints |
|---|---|---|
| **Platform** (por servidor) | `https://br1.api.riotgames.com` | summoner-v4, league-v4, champion-mastery-v4, spectator-v5, tournament-stub-v5, lol-status-v4 |
| **Regional** (continental) | `https://americas.api.riotgames.com` | account-v1, match-v5 |

Brasil (`br1`) pertence à região `americas`. O projeto resolve isso automaticamente via `getPlatformUrl()` e `getRegionalUrl()` em `lib/riot.ts`, lendo a variável `RIOT_REGION`.

---

## Tipos de API Key

| Tipo | req/s | req/2min | Validade |
|---|---|---|---|
| Development | 20 | 100 | 24 h (renova manualmente) |
| Personal | 20 | 100 | Permanente |
| Production | 500 | 30.000/10min | Permanente |

> ⚠️ Para produção, registre o produto em [developer.riotgames.com](https://developer.riotgames.com).

---

## Endpoints integrados

### account-v1 (regional: americas)
| Endpoint | Cache TTL |
|---|---|
| `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` — PUUID via Riot ID | 600 s |
| `/riot/account/v1/accounts/by-puuid/{puuid}` — conta via PUUID | — |

### summoner-v4 (platform: br1)
| Endpoint | Cache TTL | Notas |
|---|---|---|
| `/lol/summoner/v4/summoners/by-puuid/{puuid}` | 300 s | Retorna `profileIconId` e `summonerLevel`. O campo `id` (summonerId) **não é mais utilizado** — `entries/by-summoner` foi removido pela Riot em Jun/2025. |

### league-v4 (platform: br1)

> ⚠️ **BREAKING CHANGE (Jun/2025):** O endpoint `entries/by-summoner/{summonerId}` foi **removido** pela Riot.
> O projeto usa exclusivamente `entries/by-puuid/{puuid}` — confirme que nenhuma chamada legacy existe no código.

| Endpoint | Cache TTL |
|---|---|
| `/lol/league/v4/entries/by-puuid/{puuid}` — tier, LP, winrate | 300 s |

### match-v5 (regional: americas)
| Endpoint | Cache TTL |
|---|---|
| `/lol/match/v5/matches/by-puuid/{puuid}/ids` — IDs das últimas N partidas | 120 s |
| `/lol/match/v5/matches/{matchId}` — detalhes completos | 3600 s |

### champion-mastery-v4 (platform: br1)
| Endpoint | Cache TTL |
|---|---|
| `/lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top` | 600 s |

### tournament-stub-v5 (platform: br1) — apenas ambiente de dev

> ⚠️ **Stub vs. Produção:** `tournament-stub-v5` é exclusivo para chaves de Development/Personal.
> Em produção (chave Production aprovada), use `tournament-v5` (sem "stub") com os mesmos endpoints.

| Endpoint | Método | Uso |
|---|---|---|
| `/lol/tournament-stub/v5/providers` | POST | Registrar provider (URL callback) |
| `/lol/tournament-stub/v5/tournaments` | POST | Criar torneio |
| `/lol/tournament-stub/v5/codes` | POST | Gerar tournament codes |
| `/lol/tournament-stub/v5/codes/{code}` | GET/PUT | Consultar/atualizar code |
| `/lol/tournament-stub/v5/lobby/events/by-code/{code}` | GET | Eventos de lobby |

### lol-status-v4 (platform: br1)
| Endpoint | Frequência |
|---|---|
| `/lol/status/v4/platform-data` — manutenções e incidentes | Cron semanal (toda segunda às 12:00 UTC via `/api/cron/check-riot-status`) |

---

## Códigos HTTP e tratamento de erros

| Código | Ação no projeto |
|---|---|
| 200 | Processar normalmente |
| 400 | Verificar campos enviados |
| 401 | Configurar `RIOT_API_KEY` no servidor |
| 403 | Renovar chave em developer.riotgames.com |
| 404 | Verificar Nome#TAG ou ID |
| 415 | Enviar `Content-Type: application/json` |
| 429 | Ler header `Retry-After` e `X-Rate-Limit-Type`. Na Edge Function `riot-api-sync`, o retry é fixo em **6 segundos** (sleep hardcoded). Para produção, implementar leitura do header `Retry-After`. |
| 500/503 | Retry após delay — consultar lol-status-v4 |

---

## Fluxo de identificação de jogador (`lib/riot.ts` → route `app/api/riot/summoner`)

```
Nome#TAG
  └─▶ account-v1 (americas) ──▶ puuid
         └─▶ [paralelo via Promise.all()]
               ├─▶ summoner-v4 (br1)  →  { level, profileIconId }  ← summonerId ignorado
               ├─▶ league-v4   (br1)  →  entries/by-puuid → { tier, rank, LP, wins }
               └─▶ match-v5    (americas) → matchIds → detalhes
```

---

## Fluxo de sync de rank (Edge Function `riot-api-sync`)

```
Chamada POST → supabase/functions/riot-api-sync
  └─▶ riot_accounts onde updated_at < (now - 10min)  [BATCH_SIZE = 50]
        ├─▶ summoner-v4/by-puuid  →  atualiza riot_accounts (icon, level)
        └─▶ league-v4/entries/by-puuid
              └─▶ rank_snapshots INSERT (RANKED_SOLO_5x5 e RANKED_FLEX_SR)

Rate limit interno: DELAY_MS = 300ms entre contas
Retry em 429: sleep fixo de 6s (não lê Retry-After — melhoria pendente)
auth: verify_jwt = false (usa SUPABASE_SERVICE_ROLE_KEY internamente)
```

> 💡 `riot-api-sync` tem `verify_jwt: false` — é protegida apenas pelo `SUPABASE_SERVICE_ROLE_KEY` interno. Não expor a URL publicamente sem camada adicional de autenticação.

---

## Fluxo de processamento de resultados (Edge Function `process-match-results`)

```
Chamada POST → supabase/functions/process-match-results
  └─▶ tournament_match_results WHERE processed = false
        └─▶ lock atômico (processing_at = now)
              └─▶ POST {SITE_URL}/api/internal/process-match  [timeout 25s]
                    ├─▶ sucesso → processed = true
                    └─▶ erro    → processing_at = null (libera para retry)

Batch: até 50 registros por execução
Segurança: header x-internal-secret (INTERNAL_SECRET env var)
auth: verify_jwt = true
```

---

## Assets estáticos — sem API Key

### Data Dragon (`ddragon.leagueoflegends.com`)

| Função helper | Async | Descrição |
|---|---|---|
| `getDDVersion()` | sim | Versão atual do patch — usa `realms/br.json` (região BR precisa), fallback para `versions.json`, fallback hardcoded `15.1.1` |
| `profileIconUrl(id)` | sim | Ícone de perfil do invocador |
| `championIconUrl(name)` | sim | Ícone quadrado do campeão (DDragon) |
| `championIconByCDragon(championId)` | **não** | Ícone por ID numérico via CommunityDragon — útil quando só há `championId` |
| `championSplashUrl(name, skinNum?)` | **não** | Splash art (skin 0 = base). Fallback para CDragon quando `name` é null/vazio |
| `championLoadingUrl(name, skinNum?)` | **não** | Loading screen |
| `itemIconUrl(itemId)` | sim | Ícone de item |
| `summonerSpellIconUrl(spellId)` | sim | Ícone de summoner spell |
| `getAllChampions()` | sim | Todos os campeões em `pt_BR` — cache de 1h |

**URLs diretas úteis:**

```
# Versão do patch (regional BR)
https://ddragon.leagueoflegends.com/realms/br.json

# Ícone de perfil
https://ddragon.leagueoflegends.com/cdn/{v}/img/profileicon/{id}.png

# Ícone quadrado de campeão
https://ddragon.leagueoflegends.com/cdn/{v}/img/champion/{Name}.png

# Splash art (skin base)
https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{Name}_0.jpg

# Ícone de item
https://ddragon.leagueoflegends.com/cdn/{v}/img/item/{itemId}.png

# JSON de campeões em pt_BR
https://ddragon.leagueoflegends.com/cdn/{v}/data/pt_BR/champion.json
```

> **{Name}** usa o nome interno sem espaços: `MissFortune`, `AurelionSol`. As funções `championIconUrl()` e `championSplashUrl()` já aplicam `.replace(/[^a-zA-Z0-9]/g, '')` automaticamente.

---

### CommunityDragon (`raw.communitydragon.org`)

Usado para assets **não disponíveis** no Data Dragon oficial e para fallback de championId numérico.

| Função helper | Descrição |
|---|---|
| `rankEmblemUrl(tier)` | Emblema visual do rank — URL: `game/assets/loadouts/regalia/crests/ranked/ranked-emblem-{tier}.png` |
| `masteryIconUrl(level)` | Ícone de maestria — retorna `mastery-mark.png` (estático, nível não afeta URL atualmente) |
| `championIconByCDragon(championId)` | Ícone por ID numérico: `v1/champion-icons/{id}.png`. ID `-1` = campeão desconhecido |
| `profileBorderUrl(level)` | Borda de perfil por nível (7 tiers: 1–7 baseado em level) |

**URLs diretas:**

```
# Emblema de rank (tier em lowercase)
https://raw.communitydragon.org/latest/game/assets/loadouts/regalia/crests/ranked/ranked-emblem-{tier}.png

# Ícone de campeão por ID numérico
https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champion-icons/{championId}.png

# Borda de perfil (n = 1 a 7)
https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/images/summoner-level-border-{n}.png

# Maestria mark (estático)
https://raw.communitydragon.org/latest/plugins/rcp-fe-lol-static-assets/global/default/champion-mastery/mastery-mark.png
```

`rankEmblemUrl()` já aplica `.toLowerCase()` automaticamente — pode passar `entry.tier` diretamente.

---

### `getAllChampions()` — mapeamento de ID numérico → nome

```typescript
// A API retorna championId: 103 (numérico)
// O JSON do Data Dragon tem { key: "103", id: "Ahri" }
export async function getChampionNameById(championId: number): Promise<string | null> {
  const all = await getAllChampions();
  const found = Object.values(all).find(c => c.key === String(championId));
  return found?.id ?? null; // retorna o nome interno, ex: "MissFortune"
}
```

Alternativamente, use `championIconByCDragon(championId)` para renderizar o ícone diretamente pelo ID numérico **sem precisar do JSON**.

**Casos de uso:** seletor de campeão (ban/pick), filtro no histórico, nome em pt_BR no perfil.

---

## summonerName — campo deprecated

O campo `summonerName` em `MatchParticipant` está **em processo de remoção pela Riot desde nov/2023**. Para contas novas retorna UUID aleatório. Use sempre `riotIdGameName + riotIdTagLine` para exibição de nome. O `MatchDtoSchema` (Zod) marca o campo como `optional` corretamente.
