# ⚔️ Tournament-LOL

> Plataforma completa para torneios casuais de League of Legends 5v5
> com integração real à Riot Games API v5, bracket automático,
> ranking de invocadores e painel administrativo.

Deploy: https://vercel.com/new/clone?repository-url=https://github.com/luanscps/Tournament-LOL
Repo  : https://github.com/luanscps/Tournament-LOL

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  ÍNDICE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  1. Visão Geral
  2. Stack Tecnológica
  3. Arquitetura do Sistema
  4. Fluxos Principais
  5. Estrutura de Pastas
  6. Banco de Dados
  7. Riot Games API
  8. API Routes
  9. Componentes
 10. Funções Utilitárias
 11. Sistema de Cache
 12. Rate Limiting
 13. Variáveis de Ambiente
 14. Instalação e Execução
 15. Autenticação e Segurança
 16. Deploy na Vercel
 17. Roadmap

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. VISÃO GERAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Tournament-LOL resolve o problema de organizar torneios casuais
de LoL sem depender de plataformas externas pagas.

  ✔  Vincula contas reais via Riot ID (Nome#TAG)
  ✔  Bracket single/double elimination, Round Robin, Swiss
  ✔  Rank, maestrias, KDA e histórico via Riot API oficial
  ✔  Row Level Security (RLS) no Supabase
  ✔  Deploy automático na Vercel a cada push na main

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  2. STACK TECNOLÓGICA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─────────────────────┬──────────────────────────┬─────────┐
  │ Camada              │ Tecnologia               │ Versão  │
  ├─────────────────────┼──────────────────────────┼─────────┤
  │ Framework           │ Next.js (App Router)     │ 14.2.x  │
  │ Linguagem           │ TypeScript               │ 5.x     │
  │ Estilização         │ Tailwind CSS             │ 3.4.x   │
  │ Banco de Dados      │ Supabase (PostgreSQL 15) │ latest  │
  │ Autenticação        │ Supabase Auth (JWT)      │ 2.x     │
  │ API Externa         │ Riot Games API           │ v5      │
  │ Validação           │ Zod + React Hook Form    │ 3.x     │
  │ Deploy              │ Vercel Edge Network      │ latest  │
  │ Cache               │ In-Memory Map TTL custom │  —      │
  └─────────────────────┴──────────────────────────┴─────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  3. ARQUITETURA DO SISTEMA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌──────────────────────────────────────────────────────────┐
  │                   👤 USUÁRIO / BROWSER                   │
  └───────────────────────────┬──────────────────────────────┘
                              │ HTTPS
  ┌───────────────────────────▼──────────────────────────────┐
  │               ⚡ VERCEL EDGE NETWORK                      │
  │                                                          │
  │  ┌──────────────────┐  ┌──────────────┐  ┌───────────┐  │
  │  │ Server Components│  │   Client     │  │ API Routes│  │
  │  │  (RSC / SSR)     │  │  Components  │  │ /api/riot │  │
  │  └────────┬─────────┘  └──────┬───────┘  └─────┬─────┘  │
  └───────────┼────────────────────┼────────────────┼────────┘
              │                    │                │
              ▼                    ▼                ▼
  ┌────────────────────────┐     ┌──────────────────────────┐
  │     🟢 SUPABASE         │     │   🎮 RIOT GAMES API v5   │
  │                        │     │                          │
  │  ┌──────────────────┐  │     │  account-v1  (REGIONAL)  │
  │  │  PostgreSQL 15   │  │     │  summoner-v4 (PLATFORM)  │
  │  │  Auth (JWT)      │  │     │  league-v4   (PLATFORM)  │
  │  │  RLS Policies    │  │     │  match-v5    (REGIONAL)  │
  │  │  14 Tabelas      │  │     │  mastery-v4  (PLATFORM)  │
  │  │  2 Views SQL     │  │     │                          │
  │  └──────────────────┘  │     │  X-Riot-Token header     │
  └────────────────────────┘     └──────────────────────────┘
              ▲
              │
  ┌───────────┴────────────┐
  │  🗃️ IN-MEMORY CACHE     │
  │  Map<string, {data,    │
  │  expiresAt}> por TTL   │
  └────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  4. FLUXOS PRINCIPAIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─ FLUXO 1: Vincular Conta Riot ─────────────────────────┐
  │                                                         │
  │  [Usuário digita Faker#KR1]                             │
  │         │                                               │
  │         ▼                                               │
  │  GET /api/riot/summoner?riotId=Faker%23KR1              │
  │         │                                               │
  │         ▼                                               │
  │  ┌─────────────┐     HIT     ┌──────────────────────┐  │
  │  │ Cache Lookup├────────────►│ Retorna dados        │  │
  │  └──────┬──────┘             │ cacheados (sem API)  │  │
  │      MISS│                   └──────────────────────┘  │
  │         ▼                                               │
  │  account-v1 → PUUID lookup                              │
  │         │                                               │
  │         ▼  Promise.all (paralelo)                       │
  │  ┌──────┬──────────┬──────────────┐                     │
  │  ▼      ▼          ▼              ▼                     │
  │ summ  league    mastery     [resposta JSON]              │
  │  v4    v4        v4               │                     │
  │  nível rank   top 5 camps         │                     │
  │  ícone LP              ◄──────────┘                     │
  │         │                                               │
  │         ▼                                               │
  │  Usuário confirma vincular conta                        │
  │         │                                               │
  │         ▼                                               │
  │  riot_accounts.upsert()                                 │
  │    ├── rank_snapshots INSERT                            │
  │    └── champion_masteries UPSERT                        │
  │         │                                               │
  │         ▼                                               │
  │  ✅ Conta vinculada → Redirect /dashboard               │
  └─────────────────────────────────────────────────────────┘

  ┌─ FLUXO 2: Autenticação e Proteção de Rotas ────────────┐
  │                                                         │
  │  [Request chega no servidor]                            │
  │         │                                               │
  │         ▼                                               │
  │  middleware.ts executa primeiro                         │
  │         │                                               │
  │         ▼                                               │
  │  Rota protegida? (/dashboard ou /admin)                 │
  │    ├── NÃO ──► [Passa direto, sem verificação]          │
  │    └── SIM ──► Lê Cookie JWT via createServerClient()   │
  │                     │                                   │
  │                     ▼                                   │
  │              JWT válido?                                │
  │               ├── NÃO ──► 🔴 Redirect /login           │
  │               └── SIM ──► Rota /admin?                 │
  │                               ├── NÃO ──► ✅ /dashboard │
  │                               └── SIM ──►              │
  │                                   profiles.is_admin?    │
  │                                    ├── NÃO ──► 🔴 /    │
  │                                    └── SIM ──► ✅ /admin│
  └─────────────────────────────────────────────────────────┘

  ┌─ FLUXO 3: Ciclo de Vida do Torneio ────────────────────┐
  │                                                         │
  │  [draft] ──► [open] ──► [checkin] ──► [ongoing]        │
  │   📝 Criado    📋 Inscrições  ✅ Check-in  ⚔️ Ativo    │
  │                   │              │           │          │
  │                   │              │           ▼          │
  │                   │              │       [finished]     │
  │                   │              │        🏆 Encerrado  │
  │                   ▼              ▼                      │
  │              [cancelled] ◄──────────────               │
  │               ❌ Admin cancela a qualquer momento       │
  └─────────────────────────────────────────────────────────┘

  ┌─ FLUXO 4: Cache + Rate Limit ──────────────────────────┐
  │                                                         │
  │  [Request GET /api/riot/*]                              │
  │         │                                               │
  │         ▼                                               │
  │  Rate Limiter (sliding window por IP)                   │
  │    ├── EXCEDEU ──► 🔴 HTTP 429 Too Many Requests        │
  │    └── OK ──────►                                       │
  │                  Cache Lookup (chave + params)          │
  │                    ├── HIT + TTL válido                 │
  │                    │      └──► ✅ Retorna cache          │
  │                    └── MISS ou expirado                 │
  │                           │                            │
  │                           ▼                            │
  │                    Riot API fetch real                  │
  │                    (header X-Riot-Token)                │
  │                           │                            │
  │                    ┌──────┴──────┐                      │
  │                    ▼             ▼                      │
  │                 Sucesso         Erro                    │
  │                    │         (404/429)                  │
  │                    ▼             │                      │
  │              setCached(TTL)      └──► 🔴 Repassa erro   │
  │                    │                                    │
  │                    ▼                                    │
  │              ✅ Retorna dados                           │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  5. ESTRUTURA DE PASTAS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  tournament-lol/
  │
  ├── app/
  │   ├── (auth)/
  │   │   ├── login/page.tsx              Login email/senha
  │   │   └── register/page.tsx           Cadastro + metadados
  │   │
  │   ├── admin/
  │   │   ├── layout.tsx                  Guard is_admin + sidebar
  │   │   ├── page.tsx                    Dashboard KPIs
  │   │   └── torneios/criar/page.tsx     Formulário torneio
  │   │
  │   ├── api/
  │   │   ├── riot/summoner/route.ts      GET invocador completo
  │   │   ├── riot/matches/route.ts       GET histórico partidas
  │   │   ├── riot/match/[matchId]/       GET partida única
  │   │   └── player/refresh-rank/        POST atualiza rank DB
  │   │
  │   ├── dashboard/
  │   │   ├── page.tsx                    Perfil + times + torneios
  │   │   └── jogador/registrar/          Vincular Riot ID
  │   │
  │   ├── ranking/page.tsx                Top 50 invocadores
  │   │
  │   ├── torneios/
  │   │   ├── page.tsx                    Listagem + filtros status
  │   │   └── [slug]/page.tsx             Bracket + standings + times
  │   │
  │   ├── globals.css                     Tema dark LoL + Tailwind layers
  │   ├── layout.tsx                      Root: metadata + Navbar
  │   └── page.tsx                        Home pública
  │
  ├── components/
  │   ├── layout/
  │   │   └── Navbar.tsx                  Navbar responsiva + auth state
  │   └── tournament/
  │       ├── BracketView.tsx             Bracket visual por rounds
  │       ├── StandingsTable.tsx          Tabela classificação via SQL view
  │       ├── TeamsList.tsx               Lista de times inscritos
  │       └── TournamentCard.tsx          Card para grids de torneios
  │
  ├── lib/
  │   ├── riot.ts                         Todos endpoints Riot API v5
  │   ├── riot-cache.ts                   Cache in-memory com TTL
  │   ├── rate-limit.ts                   Rate limiter sliding window
  │   ├── utils.ts                        formatRank, getTierColor, calcKDA
  │   ├── validations/index.ts            Schemas Zod
  │   └── supabase/
  │       ├── client.ts                   createBrowserClient()
  │       ├── server.ts                   createServerClient() + cookies
  │       └── admin.ts                    Service Role (bypass RLS)
  │
  ├── supabase/
  │   └── schema.sql                      DDL: 14 tabelas + views + RLS
  │
  ├── middleware.ts                        Auth guard rotas privadas
  ├── next.config.ts                       Remote images: ddragon + CDN
  ├── tailwind.config.ts                   Tema: gold #C8A84B + dark #050D1A
  ├── vercel.json                          Deploy config
  └── .env.example                         Template variáveis de ambiente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  6. BANCO DE DADOS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Execute supabase/schema.sql no SQL Editor do Supabase.

  ┌─ DIAGRAMA DE TABELAS ───────────────────────────────────┐
  │                                                         │
  │  [auth.users]                                           │
  │       │  trigger on signup                              │
  │       ▼                                                 │
  │  [profiles]──────────────────────────────────────┐      │
  │   id · username · display_name · is_admin        │      │
  │       │                          │ created_by    │      │
  │       │ 1:N                      ▼               │      │
  │       │                   [tournaments]          │      │
  │       ▼                    slug · name · status  │      │
  │  [riot_accounts]           queue_type · max_teams│      │
  │   puuid · game_name            │ 1:N             │      │
  │   tag_line · summoner_level    ▼                 │      │
  │   profile_icon_id         [teams]◄───────────────┘      │
  │       │                    name · tag · seed     captain│
  │       ├──► [rank_snapshots]    wins · losses            │
  │       │     queue_type              │ 1:N               │
  │       │     tier · rank · lp        ▼                   │
  │       │     wins · losses      [team_members]           │
  │       │                         role · position         │
  │       └──► [champion_masteries]     │                   │
  │             champion_id             │                   │
  │             mastery_level      [matches]                │
  │             mastery_points      round · match_number    │
  │                                 score_a · score_b       │
  │                                 team_a · team_b · winner│
  │  ─────────── VIEWS SQL ─────────────    │ 1:N           │
  │                                         ▼               │
  │  v_tournament_standings            [match_reports]      │
  │   position · wins · points          winner_id · status  │
  │                                     screenshot_url      │
  │  v_player_kda                                           │
  │   avg_kills · avg_deaths                                │
  │   avg_assists                                           │
  └─────────────────────────────────────────────────────────┘

  ┌─ TABELA: profiles ──────────────────────────────────────┐
  │  Coluna         Tipo       Descrição                    │
  │  ─────────────  ─────────  ──────────────────────────   │
  │  id             uuid       FK → auth.users.id           │
  │  username       text       Único, min 3 chars           │
  │  display_name   text       Nome público de exibição     │
  │  avatar_url     text       URL do avatar                │
  │  is_admin       boolean    Acesso ao painel admin       │
  │  created_at     timestamptz Auto                        │
  └─────────────────────────────────────────────────────────┘

  ┌─ TABELA: riot_accounts ─────────────────────────────────┐
  │  Coluna            Tipo    Descrição                    │
  │  ─────────────────  ──────  ──────────────────────────  │
  │  puuid              text   ID único global Riot         │
  │  game_name          text   Nome no Riot ID (ex: Faker)  │
  │  tag_line           text   Tag (ex: KR1 / BR1)          │
  │  summoner_id        text   ID criptografado na região   │
  │  summoner_level     int    Nível da conta               │
  │  profile_icon_id    int    ID ícone (para Data Dragon)  │
  │  is_primary         boolean Conta principal do perfil   │
  └─────────────────────────────────────────────────────────┘

  ┌─ TABELA: rank_snapshots ────────────────────────────────┐
  │  Coluna           Tipo         Descrição                │
  │  ────────────────  ───────────  ─────────────────────── │
  │  queue_type        text        RANKED_SOLO_5x5          │
  │                                ou RANKED_FLEX_SR        │
  │  tier              text        IRON → CHALLENGER        │
  │  rank              text        I → IV                   │
  │  lp                int         League Points (0–100+)   │
  │  wins              int         Vitórias na fila         │
  │  losses            int         Derrotas na fila         │
  │  snapshotted_at    timestamptz Timestamp da captura     │
  └─────────────────────────────────────────────────────────┘

  ┌─ TABELA: tournaments ───────────────────────────────────┐
  │  Coluna         Tipo         Descrição                  │
  │  ─────────────  ───────────  ──────────────────────     │
  │  slug           text         URL amigável único         │
  │  status         text         draft → open → checkin     │
  │                              → ongoing → finished       │
  │  queue_type     text         Modo de jogo               │
  │  bracket_type   text         single_elimination         │
  │                              double_elimination         │
  │                              round_robin / swiss        │
  │  max_teams      int          4–64 times                 │
  │  prize_pool     text         Premiação textual          │
  │  starts_at      timestamptz  Data/hora de início        │
  └─────────────────────────────────────────────────────────┘

  ┌─ TABELA: matches ───────────────────────────────────────┐
  │  Coluna         Tipo         Descrição                  │
  │  ─────────────  ───────────  ──────────────────────     │
  │  tournament_id  uuid         FK → tournaments.id        │
  │  team_a_id      uuid         FK → teams.id              │
  │  team_b_id      uuid         FK → teams.id              │
  │  winner_id      uuid         FK → teams.id (nullable)   │
  │  round          int          Número da rodada           │
  │  match_number   int          Posição dentro da rodada   │
  │  score_a        int          Placar time A              │
  │  score_b        int          Placar time B              │
  │  status         text         pending/ongoing/finished   │
  │  scheduled_at   timestamptz  Horário agendado           │
  └─────────────────────────────────────────────────────────┘

  ┌─ RLS POLICIES ──────────────────────────────────────────┐
  │  Tabela             Leitura        Escrita               │
  │  ─────────────────  ─────────────  ─────────────────    │
  │  tournaments        Pública        is_admin = true       │
  │  teams / matches    Pública        Owner do time         │
  │  riot_accounts      Apenas owner   Apenas owner          │
  │  rank_snapshots     Apenas owner   Sistema (API Route)   │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  7. RIOT GAMES API
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Obtenha sua chave em: https://developer.riotgames.com

  ┌─ TIPOS DE CHAVE ────────────────────────────────────────┐
  │  Tipo              Rate Limit           Validade         │
  │  ─────────────────  ───────────────────  ─────────────  │
  │  Development Key   20 req/s · 100/2min  24h renovável   │
  │  Production Key    500 req/s (aprovação) Permanente     │
  └─────────────────────────────────────────────────────────┘

  ┌─ HOSTS POR REGIÃO ──────────────────────────────────────┐
  │                                                         │
  │  PLATFORM → https://{region}.api.riotgames.com          │
  │    br1 | na1 | euw1 | kr | eun1 | la1 | la2             │
  │                                                         │
  │  REGIONAL → https://{regional_host}.api.riotgames.com   │
  │    americas → br1, na1, la1, la2                        │
  │    europe   → euw1, eun1, tr1, ru                       │
  │    asia     → kr, jp1                                   │
  └─────────────────────────────────────────────────────────┘

  ┌─ ENDPOINT 1: account-v1 (REGIONAL) ────────────────────┐
  │  GET /riot/account/v1/accounts/by-riot-id/{name}/{tag}  │
  │  Uso    : Faker#KR1 → { puuid, gameName, tagLine }      │
  │  TTL    : 600s                                          │
  │  Quando : Ao vincular nova conta Riot                   │
  └─────────────────────────────────────────────────────────┘

  ┌─ ENDPOINT 2: summoner-v4 (PLATFORM) ───────────────────┐
  │  GET /lol/summoner/v4/summoners/by-puuid/{puuid}        │
  │  Retorna: { id, profileIconId, summonerLevel }          │
  │  TTL    : 300s                                          │
  │  Depende: PUUID do account-v1                           │
  └─────────────────────────────────────────────────────────┘

  ┌─ ENDPOINT 3: league-v4 (PLATFORM) ─────────────────────┐
  │  GET /lol/league/v4/entries/by-summoner/{summonerId}    │
  │  Retorna: [ { queueType, tier, rank, lp,                │
  │               wins, losses, hotStreak } ]               │
  │  TTL    : 300s                                          │
  └─────────────────────────────────────────────────────────┘

  ┌─ ENDPOINT 4: champion-mastery-v4 (PLATFORM) ───────────┐
  │  GET /lol/champion-mastery/v4/.../top?count=5           │
  │  Retorna: [ { championId, championLevel,                │
  │               championPoints, lastPlayTime } ]          │
  │  TTL    : 600s                                          │
  └─────────────────────────────────────────────────────────┘

  ┌─ ENDPOINT 5: match-v5 IDs (REGIONAL) ──────────────────┐
  │  GET /lol/match/v5/matches/by-puuid/{puuid}/ids         │
  │      ?count=20&queue=420                                │
  │  Queue IDs:                                             │
  │    420 = Ranked Solo/Duo                                │
  │    440 = Ranked Flex                                    │
  │    400 = Normal Draft                                   │
  │    450 = ARAM                                           │
  │  TTL: 120s                                              │
  └─────────────────────────────────────────────────────────┘

  ┌─ ENDPOINT 6: match-v5 Detail (REGIONAL) ───────────────┐
  │  GET /lol/match/v5/matches/{matchId}                    │
  │  Retorna: dados completos de 10 participantes           │
  │    puuid · championName · kills · deaths · assists      │
  │    win · teamId · individualPosition · visionScore      │
  │  TTL: 3600s (dados históricos imutáveis)                │
  └─────────────────────────────────────────────────────────┘

  ┌─ DATA DRAGON (Assets Estáticos) ───────────────────────┐
  │  Base: https://ddragon.leagueoflegends.com/cdn/14.10.1  │
  │                                                         │
  │  Ícone perfil  : /img/profileicon/{id}.png              │
  │  Ícone campeão : /img/champion/{name}.png               │
  │  Splash art    : /img/champion/splash/{name}_0.jpg      │
  └─────────────────────────────────────────────────────────┘

  ┌─ INTERFACES TYPESCRIPT ────────────────────────────────┐
  │                                                         │
  │  interface RiotAccount {                                │
  │    puuid    : string                                    │
  │    gameName : string                                    │
  │    tagLine  : string                                    │
  │  }                                                      │
  │                                                         │
  │  interface Summoner {                                   │
  │    id             : string                              │
  │    profileIconId  : number                              │
  │    summonerLevel  : number                              │
  │  }                                                      │
  │                                                         │
  │  interface LeagueEntry {                                │
  │    queueType    : string   // RANKED_SOLO_5x5           │
  │    tier         : string   // IRON...CHALLENGER         │
  │    rank         : string   // I, II, III, IV            │
  │    leaguePoints : number                                │
  │    wins         : number                                │
  │    losses       : number                                │
  │    hotStreak    : boolean                               │
  │  }                                                      │
  │                                                         │
  │  interface ChampionMastery {                            │
  │    championId     : number                              │
  │    championLevel  : number   // 1–7                     │
  │    championPoints : number                              │
  │  }                                                      │
  │                                                         │
  │  interface MatchParticipant {                           │
  │    puuid              : string                          │
  │    championName       : string                          │
  │    kills              : number                          │
  │    deaths             : number                          │
  │    assists            : number                          │
  │    win                : boolean                         │
  │    teamId             : number  // 100=blue 200=red     │
  │    individualPosition : string  // TOP|JUNGLE|MID...    │
  │  }                                                      │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  8. API ROUTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─ GET /api/riot/summoner?riotId=Nome%23TAG ─────────────┐
  │  Busca em paralelo: account + summoner + rank + masters │
  │                                                         │
  │  Resposta 200:                                          │
  │  {                                                      │
  │    "account"  : { puuid, gameName, tagLine },           │
  │    "summoner" : { profileIconId, summonerLevel },       │
  │    "entries"  : [{ queueType, tier, lp, wins, losses }],│
  │    "masteries": [{ championId, championLevel, points }] │
  │  }                                                      │
  │                                                         │
  │  Erros:                                                 │
  │    400 → Formato inválido (falta o #)                   │
  │    404 → Invocador não encontrado                       │
  │    429 → Rate limit atingido                            │
  └─────────────────────────────────────────────────────────┘

  ┌─ GET /api/riot/matches ─────────────────────────────────┐
  │  Params: puuid, count (max 20), queue (opcional)        │
  │  Retorna: IDs + dados das últimas partidas              │
  └─────────────────────────────────────────────────────────┘

  ┌─ GET /api/riot/match/[matchId] ─────────────────────────┐
  │  Retorna dados completos de 1 partida                   │
  │  10 participantes, duração, objetivos                   │
  └─────────────────────────────────────────────────────────┘

  ┌─ POST /api/player/refresh-rank ────────────────────────┐
  │  Atualiza rank do jogador logado no banco               │
  │  Requer cookie de sessão válido                         │
  │  Body: { "puuid": "..." }                               │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  9. COMPONENTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  <Navbar />
    Detecta auth via onAuthStateChange em tempo real
    Verifica is_admin para exibir link Admin
    supabase.auth.signOut() no botão Sair

  <TournamentCard tournament={} />
    Badge status colorido:
      🟢 open (inscrições abertas)
      🔵 checkin (verificação)
      🟡 ongoing (em andamento)
      ⚫ finished (encerrado)
    Link automático para /torneios/{slug}

  <BracketView matches={} />
    Rounds: Rodada N → Quartas → Semifinal → Final
    Gap exponencial: 2^round × 12px entre partidas
    Vencedor destacado em gold #C8A84B

  <StandingsTable standings={} />
    Colunas: # · Time · V · D · GW · GL · Pts
    Fonte: view SQL v_tournament_standings
    Times eliminados com opacity-40

  <TeamsList teams={} />
    Tag, nome, capitão, número de membros
    Badges: checkmark Check-in · X Eliminado

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  10. FUNÇÕES UTILITÁRIAS  (lib/utils.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  formatRank("GOLD", "II", 75)         → "GOLD II — 75 LP"
  formatRank("CHALLENGER", "I", 1432)  → "CHALLENGER 1432 LP"

  getTierColor("CHALLENGER") → "#00D4FF"
  getTierColor("DIAMOND")    → "#99CCFF"
  getTierColor("GOLD")       → "#FFD700"
  getTierColor("SILVER")     → "#C0C0C0"
  getTierColor("IRON")       → "#8B7A6B"

  getWinRate(30, 20)                   → 60 (%)
  getQueueLabel("RANKED_SOLO_5x5")     → "Ranqueada Solo/Duo"
  getQueueLabel("ARAM")                → "ARAM"
  formatDuration(1842)                 → "30m 42s"
  calcKDA(8, 2, 12)                    → "10.00"
  calcKDA(5, 0, 3)                     → "Perfect"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  11. SISTEMA DE CACHE  (lib/riot-cache.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─ FUNCIONAMENTO ─────────────────────────────────────────┐
  │                                                         │
  │  lib/riot.ts chama getCached(chave)                     │
  │         │                                               │
  │    HIT + TTL válido ──────────────► ✅ Dados cacheados  │
  │         │                                               │
  │    MISS ou expirado                                     │
  │         │                                               │
  │         ▼                                               │
  │    Riot API fetch real                                  │
  │         │                                               │
  │         ▼                                               │
  │    setCached(chave, dados, TTL)                         │
  │         │                                               │
  │         ▼                                               │
  │    ✅ Retorna dados                                     │
  └─────────────────────────────────────────────────────────┘

  ┌─ TTL POR TIPO ──────────────────────────────────────────┐
  │  Função                    TTL    Motivo                │
  │  ─────────────────────────  ─────  ─────────────────── │
  │  getAccountByRiotId         600s  Riot ID muda raramente│
  │  getSummonerByPuuid         300s  Nível/ícone mudam pouco│
  │  getLeagueEntriesByPuuid    300s  Rank muda após games  │
  │  getTopMasteriesByPuuid     600s  Maestrias acumulativas│
  │  getMatchIdsByPuuid         120s  Novas partidas freq.  │
  │  getMatchById              3600s  Histórico é imutável  │
  └─────────────────────────────────────────────────────────┘

  Formato das chaves de cache:
    "account:faker#kr1"
    "summoner:puuid-abc123"
    "matchids:puuid-abc123:20:420"
    "match:BR1_12345678"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  12. RATE LIMITING  (lib/rate-limit.ts)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Proteção por IP com janela deslizante (sliding window):

    rateLimit(ip, limit=30, windowMs=60000)
      → true  (permitido)
      → false (HTTP 429)

  ┌─ LIMITES POR ROTA ──────────────────────────────────────┐
  │  Rota                    Limite   Janela               │
  │  ───────────────────────  ───────  ───────             │
  │  /api/riot/summoner       30 req   60s                 │
  │  /api/riot/matches        20 req   60s                 │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  13. VARIÁVEIS DE AMBIENTE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Renomeie .env.example → .env.local e preencha:

  # ── SUPABASE ────────────────────────────────────────────
  # Supabase Dashboard → Settings → API
  NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxx.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
  SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIs...

  # ── RIOT GAMES API ──────────────────────────────────────
  # developer.riotgames.com
  RIOT_API_KEY=RGAPI-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
  RIOT_REGION=br1
  RIOT_REGIONAL_HOST=americas

  # ── APP ─────────────────────────────────────────────────
  NEXT_PUBLIC_SITE_URL=http://localhost:3000

  ⚠️  NUNCA exponha SUPABASE_SERVICE_ROLE_KEY ou RIOT_API_KEY
      no frontend (sem NEXT_PUBLIC_ prefix).

  ┌─ MAPEAMENTO DE USO ─────────────────────────────────────┐
  │  Variável                      Arquivo           Uso    │
  │  ─────────────────────────────  ───────────────  ─────  │
  │  NEXT_PUBLIC_SUPABASE_URL       lib/supabase/*   URL    │
  │  NEXT_PUBLIC_SUPABASE_ANON_KEY  lib/supabase/    Auth   │
  │                                 client.ts        browser│
  │  SUPABASE_SERVICE_ROLE_KEY      lib/supabase/    Bypass │
  │                                 admin.ts         RLS    │
  │  RIOT_API_KEY                   lib/riot.ts      Token  │
  │  RIOT_REGION                    lib/riot.ts      Host   │
  │  RIOT_REGIONAL_HOST             lib/riot.ts      Host   │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  14. INSTALAÇÃO E EXECUÇÃO
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Pré-requisitos:
    Node.js 18+   → https://nodejs.org
    Supabase      → https://supabase.com
    Riot API Key  → https://developer.riotgames.com

  # 1. Clone o repositório
  git clone https://github.com/luanscps/Tournament-LOL.git
  cd Tournament-LOL

  # 2. Instale dependências
  npm install

  # 3. Configure variáveis de ambiente
  cp .env.example .env.local
  # Edite .env.local com suas chaves

  # 4. Execute o schema SQL no Supabase
  # Dashboard → SQL Editor → cole supabase/schema.sql

  # 5. Inicie o servidor de desenvolvimento
  npm run dev
  # Acesse: http://localhost:3000

  Scripts disponíveis:
    npm run dev    Desenvolvimento com hot-reload (porta 3000)
    npm run build  Build de produção
    npm run start  Serve o build gerado
    npm run lint   ESLint em todo o projeto

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  15. AUTENTICAÇÃO E SEGURANÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ┌─ FLUXO DE AUTH ─────────────────────────────────────────┐
  │                                                         │
  │  [signUp email + password]                              │
  │         │                                               │
  │         ▼                                               │
  │  Supabase Auth envia email de confirmação               │
  │         │                                               │
  │         ▼                                               │
  │  Trigger automático cria row em profiles                │
  │         │                                               │
  │         ▼                                               │
  │  [Usuário confirma email no link]                       │
  │         │                                               │
  │         ▼                                               │
  │  signInWithPassword()                                   │
  │         │                                               │
  │         ▼                                               │
  │  Cookie JWT httpOnly setado via @supabase/ssr           │
  │         │                                               │
  │         ▼                                               │
  │  middleware.ts verifica em cada request                 │
  │    ├── /dashboard → valida JWT                          │
  │    └── /admin     → valida JWT + is_admin = true        │
  └─────────────────────────────────────────────────────────┘

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  16. DEPLOY NA VERCEL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Via CLI:
    npm i -g vercel
    vercel login
    vercel --prod

  Via GitHub:
    1. Acesse https://vercel.com/new
    2. Importe o repositório
    3. Configure as variáveis de ambiente:
         NEXT_PUBLIC_SUPABASE_URL
         NEXT_PUBLIC_SUPABASE_ANON_KEY
         SUPABASE_SERVICE_ROLE_KEY
         RIOT_API_KEY
         RIOT_REGION
         RIOT_REGIONAL_HOST
         NEXT_PUBLIC_SITE_URL  ← URL da Vercel em produção
    4. Deploy automático a cada push na main
    5. PRs geram Preview Deployments automaticamente

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  17. ROADMAP
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [ ] Página de inscrição de time  /dashboard/time/criar
  [ ] Painel do capitão — gerenciar membros e check-in
  [ ] Report de resultado com upload de screenshot
  [ ] Geração automática de bracket ao fechar inscrições
  [ ] Notificações por email (Resend) para início de partidas
  [ ] Perfil público do jogador com histórico de torneios
  [ ] Webhook Discord com resultados em tempo real
  [ ] Sistema de ELO interno por torneio
  [ ] App mobile (Expo + React Native)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  LICENÇA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  MIT © Luan — https://github.com/luanscps
