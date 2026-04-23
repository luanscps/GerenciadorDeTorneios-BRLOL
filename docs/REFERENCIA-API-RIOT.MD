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

## CHECKLIST DE IMPLEMENTACAO

Backend (Edge Functions):
  [ ] riot-api-sync  : ACCOUNT-V1 + SUMMONER-V4 + LEAGUE-V4
  [ ] riot-match-import : MATCH-V5 matches/{id}
  [ ] riot-live-check   : SPECTATOR-V5 (verificar jogador em partida)

Frontend (componentes):
  [ ] ChampionPicker     : Data Dragon champion.json + icones
  [ ] PlayerAvatar       : Data Dragon profileicon/{id}.png
  [ ] PicksBansDisplay   : JSONB -> grid visual de picks e bans
  [ ] MatchTimeline      : MATCH-V5 timeline (opcional, avancado)
  [ ] TierBadge          : mapear tier string para icone/cor

Banco (ja pronto):
  [x] players.puuid          : identificador global Riot
  [x] players.profile_icon   : profileIconId para avatar
  [x] players.tier/rank/lp   : dados ranked
  [x] players.last_synced    : controle de sync
  [x] match_games.riot_game_id: ID da partida na Riot
  [x] match_games.picks_bans : JSONB para draft completo
  [x] player_stats.*         : todos os campos mapeados

"""
