# Visão Geral da Arquitetura da API

> Para visão de arquitetura completa (frontend + backend + banco Supabase + Riot + Edge Functions), consulte primeiro `docs/BRLOL-DOCS-UNIFICADO.md` e depois volte aqui para detalhes específicos da camada de API.

---

## Stack tecnológico

| Camada | Tecnologia | Versão (package.json) |
|---|---|---|
| Framework | Next.js — App Router, Turbopack no dev | `^16.2.6` |
| Runtime deploy | Vercel | Node.js 24.x |
| Banco de dados | Supabase (PostgreSQL) | — |
| Auth | Supabase Auth + `@supabase/ssr` | `^0.6.1` |
| Supabase JS | `@supabase/supabase-js` | `^2.43.1` |
| API externa | Riot Games API | v5 |
| Linguagem | TypeScript | `^5` |
| React | React + React DOM | `^19.0.1` |
| Estilo | Tailwind CSS + tailwind-merge + CVA | `^3.4.1` |
| Formulários | React Hook Form + Zod + @hookform/resolvers | `^7.51.4` / `^3.23.8` |
| Gráficos | Recharts | `^2.12.7` |
| Datas | date-fns | `^3.6.0` |
| Ícones | lucide-react | `^0.511.0` |
| Animações | framer-motion | `^11.3.0` |

---

## Estrutura de pastas relevante

```
GerenciadorDeTorneios-BRLOL/
│
├── app/
│   └── api/
│       ├── admin/              ← Ações administrativas globais (is_admin = true)
│       ├── auth/               ← Callbacks de autenticação Supabase
│       ├── cron/
│       │   └── check-riot-status/ ← Monitor da Riot API (cron semanal)
│       ├── internal/
│       │   └── process-match/     ← Server-to-server (Edge Fn → Next.js)
│       ├── jogadores/          ← CRUD de jogadores
│       ├── player/             ← Perfil detalhado de jogador
│       ├── players/            ← Listagem/busca de jogadores
│       ├── profile/            ← Dados do perfil do usuário logado
│       ├── teams/              ← CRUD de times e membros
│       └── riot/
│           ├── match/             ← Detalhes de partida (match-v5)
│           ├── matches/           ← Histórico de partidas (match-v5)
│           ├── summoner/          ← Dados agregados do invocador
│           └── tournament/
│               ├── route.ts           ← Setup de torneio (stub / produção)
│               ├── codes/             ← Tournament codes (GET/POST/PUT)
│               ├── events/            ← Lobby events — polling
│               └── callback/          ← Webhook Riot → tournament_match_results
│
├── supabase/
│   └── functions/
│       ├── riot-api-sync/      ← Sync rank/icon de jogadores em lote
│       ├── process-match-results/ ← Consome tournament_match_results (lock-and-process)
│       ├── bracket-generator/  ← Gera chaveamento Single Elimination
│       ├── discord-webhook/    ← Notificações Discord
│       └── send-email/         ← E-mails transacionais
│
├── lib/
│   ├── riot.ts                ← Cliente Riot API (helpers, assets DDragon/CDragon)
│   ├── riot-rate-limiter.ts   ← Rate limiting multi-camada
│   ├── riot-tournament.ts     ← Cliente tournament(-stub)-v5
│   ├── riot-cache.ts          ← Cache TTL em memória
│   ├── rate-limit.ts          ← Rate limit por IP (rotas públicas)
│   ├── database.types.ts      ← Tipos TypeScript gerados do schema Supabase
│   └── supabase/              ← Clientes Supabase (server / client / service)
│
├── vercel.json               ← Crons agendados
└── docs/api/                 ← Esta documentação
```

---

## Níveis de acesso

O projeto possui 3 contextos de acesso distintos, cada um com guard de servidor e RLS correspondente:

| Nível | Rota / Contexto | Condição de acesso |
|---|---|---|
| **Público** | `/torneios/[slug]`, rotas GET da Riot API | Qualquer usuário, sem autenticação |
| **Organizador** | `/organizer/torneios/[id]/**` | `tournament.organizer_id === user.id` **OU** `profile.is_admin = true` |
| **Admin global** | `/admin/**`, rotas POST/PUT/DELETE de torneio | `profile.is_admin = true` exclusivamente |

Guard dual no servidor (organizador):

```typescript
// Falha em qualquer dos dois → redirect('/torneios?error=sem_permissao')
const isOrganizer = tournament.organizer_id === user.id
const isAdmin     = profile.is_admin === true
if (!isOrganizer && !isAdmin) redirect('/torneios?error=sem_permissao')
```

A RLS no Supabase reforça as mesmas regras via funções RPC:
- `is_admin(uid)` — usado em policies de tabelas administrativas
- `is_organizer_or_admin(tournament_id)` — usado em policies de `tournaments`, `matches`, `tournament_stages`

---

## Crons agendados (`vercel.json`)

| Path | Schedule (cron) | Descrição | Horário BRT |
|---|---|---|---|
| `/api/cron/check-riot-status` | `0 12 * * 1` | Verifica status/incidentes da Riot API BR1 | Toda segunda às 09:00 |

Autorização obrigatória no header da requisição (chamada manual ou via Vercel):
```
Authorization: Bearer {CRON_SECRET}
```

---

## Edge Functions Supabase ativas

| Slug | `verify_jwt` | Disparado por | Descrição |
|---|---|---|---|
| `riot-api-sync` | ✅ true | Cron / chamada server-side | Sync rank + icon de jogadores via `players` |
| `process-match-results` | ✅ true | Cron / trigger | Processa `tournament_match_results` pendentes |
| `bracket-generator` | ✅ true | Admin (organizer panel) | Gera chaveamento Single Elimination |
| `discord-webhook` | ✅ true | Eventos de torneio | Notificações no Discord |
| `send-email` | ✅ true | Convites, inscrições | E-mails transacionais |

Detalhes completos de cada função (contratos, tabelas afetadas, variáveis de ambiente): [`supabase.md`](./supabase.md)

---

## Fluxo macro — resultado de partida de torneio

```
[Jogo termina na Riot]
  └─▶ Riot Games POST /api/riot/tournament/callback
        └─▶ INSERT tournament_match_results { processed: false }
              └─▶ Edge Fn: process-match-results  (lock-and-process, batch 50)
                    └─▶ POST /api/internal/process-match  [x-internal-secret, timeout 25s]
                          ├─▶ UPDATE matches            (winner_id, status = FINISHED)
                          ├─▶ INSERT match_games        (detalhes do jogo)
                          ├─▶ INSERT player_stats       (KDA, CS, dano por jogador)
                          └─▶ UPDATE tournament_match_results { processed: true }
```

---

## Fluxo macro — sincronização de rank

```
[Cron ou chamada manual]
  └─▶ Edge Fn: riot-api-sync
        └─▶ SELECT players WHERE last_synced < now - 6h  LIMIT 20
              └─▶ account-v1  /by-riot-id/{name}/{tag}   →  puuid  (se ausente)
              └─▶ summoner-v4 /by-puuid/{puuid}           →  icon, level
              └─▶ league-v4   /entries/by-puuid/{puuid}   →  tier, rank, LP
                    └─▶ UPDATE players (todos os campos + last_synced)
```

---

## Ciclo de vida de um deploy

1. Push para `main` → Vercel detecta e dispara build.
2. Vercel executa `next build` com as variáveis de ambiente configuradas.
3. Deploy em edge CDN global com Node.js 24.x.
4. Rotas de API passam a rodar com o novo código (Serverless Functions da Vercel).
5. Crons são (re)agendados conforme `vercel.json`.
6. Edge Functions Supabase são deployadas independentemente via `supabase functions deploy` ou CI/CD.
