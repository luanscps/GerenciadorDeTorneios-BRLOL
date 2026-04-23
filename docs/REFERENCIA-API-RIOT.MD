# Riot Games API - Referencia Completa para GerenciadorDeTorneios-BRLOL

> Documentacao baseada em: https://developer.riotgames.com/docs/lol
> Gerado em: 2026-04-22
> Uso: Integracao com Supabase Edge Functions (riot-api-sync, riot-match-import)

---

## INDICE

1. Autenticacao e Rate Limits
2. Regioes e Endpoints Base
3. ACCOUNT-V1 (PUUID / Riot ID)
4. SUMMONER-V4 (Summoner por PUUID)
5. LEAGUE-V4 (Ranked / Elo)
6. MATCH-V5 (Historico de Partidas)
7. CHAMPION-MASTERY-V4
8. SPECTATOR-V5 (Partidas ao Vivo)
9. LOL-STATUS-V4
10. Data Dragon (Assets Estaticos)
11. Mapeamentos Uteis (Filas, Tiers, Roles)
12. Exemplos de Uso para o Projeto

---

## 1. AUTENTICACAO E RATE LIMITS

### API Key
Todo request exige o header:
  X-Riot-Token: RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

Tipos de chave:
  - Development Key : expira em 24h, limite baixo, uso local/dev
  - Personal Key    : uso pessoal, sem expiracao, aprovacao simples
  - Production Key  : uso em producao, rate limits maiores, aprovacao formal

### Rate Limits (Development Key)
  20 requests por 1 segundo
  100 requests por 2 minutos

### Rate Limits (Production Key)
  500 requests por 10 segundos
  30000 requests por 10 minutos

### Headers de Rate Limit na Resposta
  X-Rate-Limit-Type        : method ou service
  X-App-Rate-Limit         : limite da app (ex: 20:1,100:120)
  X-App-Rate-Limit-Count   : uso atual
  X-Method-Rate-Limit      : limite do endpoint especifico
  X-Method-Rate-Limit-Count: uso atual do endpoint

### Codigos de Erro
  400 - Bad Request        : parametro invalido
  401 - Unauthorized       : API key ausente
  403 - Forbidden          : API key invalida ou expirada
  404 - Not Found          : recurso nao encontrado
  405 - Not Allowed        : metodo HTTP incorreto
  415 - Unsupported Media  : Content-Type incorreto
  429 - Too Many Requests  : rate limit excedido (respeitar Retry-After)
  500 - Server Error       : erro interno Riot
  502 - Bad Gateway        : problema de gateway
  503 - Service Unavailable: servico indisponivel
  504 - Gateway Timeout    : timeout

### Estrategia de Retry no Projeto
  if status == 429:
      retry_after = response.headers.get('Retry-After', 5)
      await sleep(retry_after)
      retry request
  if status in [500, 502, 503, 504]:
      await sleep(exponential_backoff)
      retry up to 3x

---

## 2. REGIOES E ENDPOINTS BASE

### Regioes de Plataforma (por servidor de jogo)
  BR1  : https://br1.api.riotgames.com    <- Brasil (usar este)
  NA1  : https://na1.api.riotgames.com
  EUW1 : https://euw1.api.riotgames.com
  EUN1 : https://eun1.api.riotgames.com
  KR   : https://kr.api.riotgames.com
  JP1  : https://jp1.api.riotgames.com
  LA1  : https://la1.api.riotgames.com    <- America Latina Norte
  LA2  : https://la2.api.riotgames.com    <- America Latina Sul
  TR1  : https://tr1.api.riotgames.com
  RU   : https://ru.api.riotgames.com
  OC1  : https://oc1.api.riotgames.com

### Regioes Continentais (para ACCOUNT-V1 e MATCH-V5)
  AMERICAS : https://americas.api.riotgames.com  <- BR1, NA1, LA1, LA2
  ASIA     : https://asia.api.riotgames.com      <- KR, JP1
  EUROPE   : https://europe.api.riotgames.com    <- EUW1, EUN1, TR1, RU
  SEA      : https://sea.api.riotgames.com       <- OC1

### Regra de Roteamento para o Projeto (servidores BR)
  ACCOUNT-V1  -> americas.api.riotgames.com
  SUMMONER-V4 -> br1.api.riotgames.com
  LEAGUE-V4   -> br1.api.riotgames.com
  MATCH-V5    -> americas.api.riotgames.com
  SPECTATOR-V5-> br1.api.riotgames.com

---

## 3. ACCOUNT-V1 (Identificacao Universal - PUUID / Riot ID)

Base URL: https://americas.api.riotgames.com

### 3.1 Buscar Conta por Riot ID (nome#tag)
  GET /riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}

  Parametros:
    gameName : string - nome do jogador (ex: "ProPlayer")
    tagLine  : string - tag sem # (ex: "BR1", "1234")

  Resposta:
    {
      "puuid"    : "string-uuid-unico-global",
      "gameName" : "ProPlayer",
      "tagLine"  : "BR1"
    }

  Uso no Projeto:
    Quando admin adiciona jogador pelo nome -> buscar PUUID para salvar em players.puuid
    PUUID eh o identificador permanente, nao muda com troca de nome

  Exemplo Edge Function (riot-api-sync):
    const url = `https://americas.api.riotgames.com/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`

### 3.2 Buscar Conta por PUUID
  GET /riot/account/v1/accounts/by-puuid/{puuid}

  Resposta:
    {
      "puuid"    : "string-uuid",
      "gameName" : "NomeAtual",
      "tagLine"  : "BR1"
    }

  Uso no Projeto:
    Detectar mudancas de nome do jogador (sync periodico)
    Atualizar summoner_name em players se mudou

---

## 4. SUMMONER-V4 (Dados do Invocador)

Base URL: https://br1.api.riotgames.com

### 4.1 Buscar Summoner por PUUID (PRINCIPAL - usar este)
  GET /lol/summoner/v4/summoners/by-puuid/{encryptedPUUID}

  Resposta:
    {
      "id"             : "summonerId-encriptado",
      "accountId"      : "accountId-encriptado",
      "puuid"          : "puuid-global",
      "profileIconId"  : 4321,
      "revisionDate"   : 1713000000000,
      "summonerLevel"  : 312
    }

  Campos usados no Projeto:
    profileIconId -> players.profile_icon (para exibir avatar)
    summonerLevel -> players.summoner_level
    id            -> necessario para buscar ranked (LEAGUE-V4)

### 4.2 Buscar Summoner por Nome (DEPRECATED - evitar)
  GET /lol/summoner/v4/summoners/by-name/{summonerName}
  ATENCAO: endpoint legado, sera removido. Usar by-puuid.

---

## 5. LEAGUE-V4 (Ranked / Elo / Fila)

Base URL: https://br1.api.riotgames.com

### 5.1 Entradas Ranked por Summoner ID (PRINCIPAL)
  GET /lol/league/v4/entries/by-summoner/{encryptedSummonerId}

  Resposta (array - pode ter multiplas filas):
    [
      {
        "leagueId"     : "uuid-da-liga",
        "summonerId"   : "id-encriptado",
        "queueType"    : "RANKED_SOLO_5x5",
        "tier"         : "GOLD",
        "rank"         : "II",
        "leaguePoints" : 75,
        "wins"         : 123,
        "losses"       : 98,
        "hotStreak"    : false,
        "veteran"      : false,
        "freshBlood"   : false,
        "inactive"     : false,
        "miniSeries"   : null
      },
      {
        "queueType"    : "RANKED_FLEX_SR",
        ...
      }
    ]

  Filtrar no Projeto (pegar SoloQ):
    const soloQ = entries.find(e => e.queueType === "RANKED_SOLO_5x5")
    
  Mapear para tabela players:
    tier   -> soloQ?.tier ?? "UNRANKED"
    rank   -> soloQ?.rank ?? ""
    lp     -> soloQ?.leaguePoints ?? 0
    wins   -> soloQ?.wins ?? 0
    losses -> soloQ?.losses ?? 0

### 5.2 Challenger League (Top 300)
  GET /lol/league/v4/challengerleagues/by-queue/{queue}
  queue: RANKED_SOLO_5x5

### 5.3 Grandmaster League
  GET /lol/league/v4/grandmasterleagues/by-queue/{queue}

### 5.4 Master League
  GET /lol/league/v4/masterleagues/by-queue/{queue}

### 5.5 Entries por Tier/Division (paginado)
  GET /lol/league/v4/entries/{queue}/{tier}/{division}
  
  Parametros:
    queue    : RANKED_SOLO_5x5 | RANKED_FLEX_SR
    tier     : IRON|BRONZE|SILVER|GOLD|PLATINUM|EMERALD|DIAMOND
    division : I|II|III|IV
    page     : integer (default 1)

  Uso no Projeto:
    Validar min_tier do torneio - verificar se jogador esta no tier minimo exigido

---

## 6. MATCH-V5 (Historico e Detalhes de Partidas)

Base URL: https://americas.api.riotgames.com
ATENCAO: usar regiao continental (americas), nao br1

### 6.1 Buscar IDs de Partidas por PUUID
  GET /lol/match/v5/matches/by-puuid/{puuid}/ids

  Query Params:
    queue     : integer - filtrar por tipo de fila (ex: 420 = SoloQ, 450 = ARAM)
    type      : ranked|normal|tourney|tutorial
    start     : integer - offset (default 0)
    count     : integer - quantidade (default 20, max 100)
    startTime : epoch seconds - filtrar por data inicio
    endTime   : epoch seconds - filtrar por data fim

  Resposta:
    ["BR1_1234567890", "BR1_0987654321", ...]

### 6.2 Detalhes Completos de uma Partida (PRINCIPAL para o projeto)
  GET /lol/match/v5/matches/{matchId}

  matchId formato: "BR1_1234567890"

  Resposta completa (simplificada):
    {
      "metadata": {
        "dataVersion"  : "2",
        "matchId"      : "BR1_1234567890",
        "participants" : ["puuid1", "puuid2", ... "puuid10"]
      },
      "info": {
        "gameId"         : 1234567890,
        "gameDuration"   : 1823,        <- segundos
        "gameEndTimestamp": 1713000000000,
        "gameMode"       : "CLASSIC",
        "gameType"       : "MATCHED_GAME",
        "gameVersion"    : "14.8.612.1234",
        "mapId"          : 11,          <- 11 = Summoners Rift
        "queueId"        : 420,         <- 420 = Ranked SoloQ
        "platformId"     : "BR1",
        "teams": [
          {
            "teamId"  : 100,            <- 100 = Blue, 200 = Red
            "win"     : true,
            "bans"    : [
              { "championId": 235, "pickTurn": 1 },
              { "championId": 147, "pickTurn": 2 },
              ...
            ],
            "objectives": {
              "baron"     : { "first": true,  "kills": 1 },
              "dragon"    : { "first": true,  "kills": 3 },
              "tower"     : { "first": true,  "kills": 8 },
              "inhibitor" : { "first": false, "kills": 1 },
              "riftHerald": { "first": true,  "kills": 1 },
              "champion"  : { "first": true,  "kills": 34 }
            }
          }
        ],
        "participants": [
          {
            "puuid"                          : "puuid-do-jogador",
            "summonerName"                   : "NomeJogador",
            "teamId"                         : 100,
            "championId"                     : 235,
            "championName"                   : "Senna",
            "individualPosition"             : "UTILITY",
            "teamPosition"                   : "UTILITY",
            "kills"                          : 8,
            "deaths"                         : 2,
            "assists"                        : 14,
            "totalMinionsKilled"             : 42,
            "neutralMinionsKilled"           : 0,
            "totalDamageDealtToChampions"    : 28450,
            "totalDamageTaken"               : 18230,
            "visionScore"                    : 67,
            "wardsPlaced"                    : 12,
            "wardsKilled"                    : 5,
            "visionWardsBoughtInGame"        : 3,
            "goldEarned"                     : 14230,
            "goldSpent"                      : 13800,
            "win"                            : true,
            "pentaKills"                     : 0,
            "quadraKills"                    : 0,
            "tripleKills"                    : 0,
            "doubleKills"                    : 1,
            "firstBloodKill"                 : false,
            "firstTowerKill"                 : false,
            "inhibitorKills"                 : 1,
            "turretKills"                    : 3,
            "longestTimeSpentLiving"         : 312,
            "item0"                          : 6671,
            "item1"                          : 3031,
            "item2"                          : 3036,
            "item3"                          : 3033,
            "item4"                          : 3139,
            "item5"                          : 1038,
            "item6"                          : 3340,
            "summoner1Id"                    : 4,
            "summoner2Id"                    : 7,
            "perks": {
              "statPerks": { "defense": 5002, "flex": 5008, "offense": 5005 },
              "styles": [
                {
                  "description": "primaryStyle",
                  "selections": [
                    { "perk": 8008, "var1": 9, "var2": 0, "var3": 0 },
                    ...
                  ],
                  "style": 8000
                }
              ]
            }
          }
        ]
      }
    }

  Mapeamento para player_stats no Projeto:
    champion     <- participant.championName
    kills        <- participant.kills
    deaths       <- participant.deaths
    assists      <- participant.assists
    cs           <- participant.totalMinionsKilled + participant.neutralMinionsKilled
    vision_score <- participant.visionScore
    damage_dealt <- participant.totalDamageDealtToChampions
    is_mvp       <- calcular: maior KDA do time vencedor

  Mapeamento para picks_bans JSONB:
    teams[].bans -> bans por team (championId -> buscar nome no Data Dragon)
    participants[].championName + teamId -> picks por ordem de pickTurn

### 6.3 Timeline da Partida (eventos frame a frame)
  GET /lol/match/v5/matches/{matchId}/timeline

  Resposta:
    {
      "info": {
        "frameInterval": 60000,  <- intervalo em ms (1 minuto)
        "frames": [
          {
            "timestamp": 60000,
            "participantFrames": {
              "1": {
                "participantId": 1,
                "position": { "x": 512, "y": 512 },
                "currentGold": 500,
                "totalGold": 500,
                "level": 1,
                "xp": 0,
                "minionsKilled": 0,
                "jungleMinionsKilled": 0,
                "dominionScore": 0,
                "teamScore": 0
              }
            },
            "events": [
              {
                "timestamp"     : 312000,
                "type"          : "CHAMPION_KILL",
                "killerId"      : 3,
                "victimId"      : 7,
                "assistingParticipantIds": [1, 2],
                "position"      : { "x": 7200, "y": 4800 }
              },
              {
                "type"          : "BUILDING_KILL",
                "timestamp"     : 892000,
                "teamId"        : 200,
                "buildingType"  : "TOWER_BUILDING",
                "laneType"      : "MID_LANE",
                "towerType"     : "INNER_BUILDING_TURRET"
              },
              {
                "type"          : "ELITE_MONSTER_KILL",
                "timestamp"     : 1240000,
                "monsterType"   : "BARON_NASHOR",
                "killerTeamId"  : 100
              }
            ]
          }
        ]
      }
    }

  Uso no Projeto (Match Timeline visual):
    Extrair eventos CHAMPION_KILL para mostrar kills por minuto
    Extrair BUILDING_KILL para mostrar torres destruidas
    Extrair ELITE_MONSTER_KILL para mostrar Baron/Dragon
    Gerar grafico de gold difference por frame

"""
---

## 7. CHAMPION-MASTERY-V4

Base URL: https://br1.api.riotgames.com

### 7.1 Maestrias por PUUID (todos os campeoes)
  GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{encryptedPUUID}

  Resposta (array ordenado por pontos desc):
    [
      {
        "puuid"                    : "puuid",
        "championId"               : 235,
        "championLevel"            : 7,
        "championPoints"           : 287450,
        "lastPlayTime"             : 1713000000000,
        "championPointsSinceLastLevel": 87450,
        "championPointsUntilNextLevel": 0,
        "chestGranted"             : true,
        "tokensEarned"             : 0
      }
    ]

### 7.2 Top N Maestrias por PUUID
  GET /lol/champion-mastery/v4/champion-masteries/by-puuid/{puuid}/top

  Query Params:
    count : integer (default 3, max 10)

  Uso no Projeto:
    Exibir top 3 campeoes do jogador no perfil publico

### 7.3 Pontuacao Total de Maestria
  GET /lol/champion-mastery/v4/scores/by-puuid/{puuid}

  Resposta: integer (soma de todos os niveis de maestria)

---

## 8. SPECTATOR-V5 (Partidas ao Vivo)

Base URL: https://br1.api.riotgames.com

### 8.1 Partida ao Vivo por PUUID
  GET /lol/spectator/v5/active-games/by-summoner/{encryptedPUUID}

  Resposta (se jogador estiver em partida):
    {
      "gameId"         : 1234567890,
      "gameType"       : "MATCHED_GAME",
      "gameStartTime"  : 1713000000000,
      "mapId"          : 11,
      "gameLength"     : 842,  <- segundos desde inicio
      "platformId"     : "BR1",
      "gameMode"       : "CLASSIC",
      "gameQueueConfigId": 420,
      "participants"   : [
        {
          "puuid"        : "puuid",
          "summonerId"   : "id",
          "teamId"       : 100,
          "championId"   : 235,
          "perks"        : { ... },
          "spell1Id"     : 4,
          "spell2Id"     : 7,
          "bot"          : false
        }
      ],
      "bannedChampions": [
        { "championId": 235, "teamId": 100, "pickTurn": 1 },
        ...
      ],
      "observers"      : { "encryptionKey": "chave-para-spectate" }
    }

  Resposta (se nao estiver em partida):
    HTTP 404

  Uso no Projeto:
    Verificar se jogador esta em partida durante check-in
    Exibir badge "Em partida" no perfil do jogador
    Obter picks/bans em tempo real durante a partida do torneio

### 8.2 Partidas em Destaque
  GET /lol/spectator/v5/featured-games

---

## 9. LOL-STATUS-V4

Base URL: https://br1.api.riotgames.com

### 9.1 Status da Plataforma BR1
  GET /lol/status/v4/platform-data

  Resposta:
    {
      "id"           : "BR1",
      "name"         : "Brazil",
      "locales"      : ["pt_BR"],
      "maintenances" : [],
      "incidents"    : []
    }

  Uso no Projeto:
    Verificar se Riot API esta operacional antes de sync
    Exibir aviso de manutencao na dashboard se necessario

---

## 10. DATA DRAGON (Assets Estaticos - sem API Key)

Base URL: https://ddragon.leagueoflegends.com
IMPORTANTE: Nao requer API Key. CDN publica da Riot.

### 10.1 Versoes Disponiveis
  GET https://ddragon.leagueoflegends.com/api/versions.json

  Resposta: ["14.8.1", "14.7.1", "14.6.1", ...]
  Usar versions[0] para pegar a versao mais recente.

  No Projeto:
    Armazenar versao atual em variavel de ambiente ou banco
    Atualizar periodicamente via Edge Function

### 10.2 Lista de Campeoes (por idioma)
  GET https://ddragon.leagueoflegends.com/cdn/{version}/data/{locale}/champion.json

  locale: pt_BR (portugues), en_US (ingles)

  Resposta (simplificada):
    {
      "data": {
        "Ahri": {
          "id"    : "Ahri",
          "key"   : "103",
          "name"  : "Ahri",
          "title" : "a Raposa de Nove Caudas",
          "tags"  : ["Mage", "Assassin"],
          "stats" : { ... }
        },
        "Jinx": { ... }
      }
    }

  Uso no Projeto (PicksBansEditor):
    Fetch unico ao carregar componente
    Cachear em localStorage com versao como cache key
    Busca fuzzy por nome usando filtro no array

### 10.3 Icone de Campeao
  URL: https://ddragon.leagueoflegends.com/cdn/{version}/img/champion/{championName}.png

  Exemplos:
    https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/Ahri.png
    https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/Jinx.png
    https://ddragon.leagueoflegends.com/cdn/14.8.1/img/champion/MissFortune.png

  ATENCAO: Nome deve ser exato como no champion.json (ex: "MissFortune", nao "Miss Fortune")

### 10.4 Splash Art (tela cheia)
  URL: https://ddragon.leagueoflegends.com/cdn/img/champion/splash/{championName}_{skinNum}.jpg
  skinNum 0 = skin padrao

### 10.5 Icone de Perfil (Profile Icon)
  URL: https://ddragon.leagueoflegends.com/cdn/{version}/img/profileicon/{iconId}.png

  Uso no Projeto:
    players.profile_icon -> exibir avatar do jogador

### 10.6 Icone de Item
  URL: https://ddragon.leagueoflegends.com/cdn/{version}/img/item/{itemId}.png

  Uso no Projeto:
    Exibir build do jogador na match timeline

### 10.7 Spell de Invocador
  GET https://ddragon.leagueoflegends.com/cdn/{version}/data/pt_BR/summoner.json

  Mapear summoner1Id/summoner2Id para nomes e icones

### 10.8 Icone de Spell de Invocador
  URL: https://ddragon.leagueoflegends.com/cdn/{version}/img/spell/{spellName}.png

  Exemplos:
    Flash  -> SummonerFlash.png  (id: 4)
    Ignite -> SummonerDot.png    (id: 14)
    TP     -> SummonerTeleport.png (id: 12)

### 10.9 Icone de Runa
  URL: https://ddragon.leagueoflegends.com/cdn/img/{runeIconPath}

  Buscar path em:
  GET https://ddragon.leagueoflegends.com/cdn/{version}/data/pt_BR/runesReforged.json

---

## 11. MAPEAMENTOS UTEIS

### 11.1 Tier Order (para calcular seedagem)
  CHALLENGER  = 9  (mais alto)
  GRANDMASTER = 8
  MASTER      = 7
  DIAMOND     = 6
  EMERALD     = 5
  PLATINUM    = 4
  GOLD        = 3
  SILVER      = 2
  BRONZE      = 1
  IRON        = 0
  UNRANKED    = -1 (mais baixo)

### 11.2 Division Order
  I   = 4
  II  = 3
  III = 2
  IV  = 1

### 11.3 LP Total para Ranking
  lp_total = (tier_value * 400) + (division_value * 100) + lp_atual

  Exemplo: GOLD II 75LP = (3*400) + (3*100) + 75 = 1575

  Uso no Projeto (seedings/calcAvgLP):
    Calcular LP medio do time para sugerir seedagem automatica

### 11.4 Queue IDs (queueId)
  420  : Ranked Solo/Duo
  440  : Ranked Flex
  400  : Normal Draft
  430  : Normal Blind
  450  : ARAM
  900  : URF
  1020 : One for All
  1900 : URF
  490  : Normal (Quickplay)

### 11.5 Map IDs
  11 : Summoners Rift
  12 : Howling Abyss (ARAM)
  21 : Nexus Blitz

### 11.6 Team IDs
  100 : Blue Side
  200 : Red Side

### 11.7 Roles (individualPosition)
  TOP     : TOP
  JUNGLE  : JUNGLE
  MIDDLE  : MID
  BOTTOM  : ADC
  UTILITY : SUPPORT

  Mapear para player_role enum do banco:
    "TOP"     -> "TOP"
    "JUNGLE"  -> "JUNGLE"
    "MIDDLE"  -> "MID"
    "BOTTOM"  -> "ADC"
    "UTILITY" -> "SUPPORT"

### 11.8 Tipos de Evento (Match Timeline)
  CHAMPION_KILL      : abate de campeao
  BUILDING_KILL      : torre/inibidor destruido
  ELITE_MONSTER_KILL : Baron, Dragon, Herald
  ITEM_PURCHASED     : item comprado
  ITEM_SOLD          : item vendido
  LEVEL_UP           : subiu de nivel
  SKILL_LEVEL_UP     : skill skilada
  WARD_PLACED        : ward colocada
  WARD_KILL          : ward destruida
  CHAMPION_SPECIAL_KILL: penta, quadra, triple, double

---

## 12. EXEMPLOS DE USO PARA O PROJETO

### 12.1 Fluxo Completo de Adicionar Jogador

  1. Admin informa: summoner_name="ProPlayer", tag_line="BR1"
  2. GET americas.../riot/account/v1/accounts/by-riot-id/ProPlayer/BR1
     <- Obter puuid
  3. GET br1.../lol/summoner/v4/summoners/by-puuid/{puuid}
     <- Obter summonerId, profileIconId, summonerLevel
  4. GET br1.../lol/league/v4/entries/by-summoner/{summonerId}
     <- Filtrar RANKED_SOLO_5x5 para tier/rank/lp
  5. INSERT INTO players (summoner_name, tag_line, puuid, profile_icon,
     summoner_level, tier, rank, lp, wins, losses, last_synced, team_id)

### 12.2 Fluxo de Importacao de Resultado via Riot Match ID

  Admin informa riot_game_id = "BR1_1234567890"

  1. GET americas.../lol/match/v5/matches/BR1_1234567890
  2. Extrair info.gameDuration -> match_games.duration_sec
  3. Extrair info.gameEndTimestamp -> match_games.played_at
  4. Extrair info.teams[].win -> determinar winner_id
  5. Extrair info.teams[].bans -> picks_bans JSONB (fase de bans)
  6. Para cada participant:
     - Buscar player por puuid em players table
     - Mapear kills/deaths/assists/cs/vision_score/damage_dealt
     - Determinar is_mvp: maior (kills+assists)/deaths do time vencedor
  7. INSERT match_games + 10x INSERT player_stats

### 12.3 Validacao de Tier Minimo (min_tier)

  tournaments.min_tier = "GOLD"

  Para cada jogador do time inscrito:
  1. Buscar players.tier
  2. Comparar: tier_value[players.tier] >= tier_value[tournament.min_tier]
  3. Se qualquer jogador abaixo do minimo: rejeitar inscricao automaticamente
     ou notificar admin para revisao manual

### 12.4 Sync Periodico (Edge Function riot-api-sync com cron)

  Cron: a cada 6 horas
  SELECT id, puuid FROM players
  WHERE last_synced < now() - interval '6 hours'
     OR last_synced IS NULL
  LIMIT 20;

  Para cada player:
    1. Se puuid IS NULL: GET account by riot-id
    2. GET summoner by-puuid
    3. GET league entries by-summoner
    4. UPDATE players SET tier, rank, lp, wins, losses,
       profile_icon, summoner_level, last_synced = now()

  Rate limit safety: delay 100ms entre requests
  20 players * 3 requests = 60 requests por ciclo
  Dentro dos limites de development key (100/2min)

### 12.5 Estrutura picks_bans JSONB recomendada

  {
    "version": "1.0",
    "blue_team_id": "uuid-do-time-azul",
    "red_team_id" : "uuid-do-time-vermelho",
    "bans": {
      "blue": ["Jinx", "Ahri", "Thresh", "Graves", "Yone"],
      "red" : ["Caitlyn", "Lulu", "Lee Sin", "Akali", "Zed"]
    },
    "picks": {
      "blue": [
        { "order": 1, "champion": "Garen",    "role": "TOP",     "player_id": "uuid" },
        { "order": 2, "champion": "Vi",       "role": "JUNGLE",  "player_id": "uuid" },
        { "order": 3, "champion": "Lux",      "role": "MID",     "player_id": "uuid" },
        { "order": 4, "champion": "Jhin",     "role": "ADC",     "player_id": "uuid" },
        { "order": 5, "champion": "Nautilus", "role": "SUPPORT", "player_id": "uuid" }
      ],
      "red": [
        { "order": 1, "champion": "Darius",   "role": "TOP",     "player_id": "uuid" },
        { "order": 2, "champion": "Jarvan IV","role": "JUNGLE",  "player_id": "uuid" },
        { "order": 3, "champion": "Zoe",      "role": "MID",     "player_id": "uuid" },
        { "order": 4, "champion": "Ezreal",   "role": "ADC",     "player_id": "uuid" },
        { "order": 5, "champion": "Thresh",   "role": "SUPPORT", "player_id": "uuid" }
      ]
    }
  }

---
