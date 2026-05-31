# 📚 Documentação Unificada — GerenciadorDeTorneios-BRLOL

Este documento é a **fonte única de verdade** da documentação técnica do projeto.
Qualquer divergência entre este arquivo e o código-fonte deve ser resolvida **em favor do código**.

> ⚠️ **Regra de ouro:** `lib/database.types.ts` é a fonte de verdade do banco. Nunca editar manualmente.

---

## 1. Contexto do Projeto

Sistema web de gerenciamento de torneios de League of Legends voltado para o Brasil (BRLOL).
Full-stack com backend via **Supabase** (PostgreSQL + Auth + RLS), deploy na **Vercel** com **Next.js App Router**.
Toda interação com dados de jogadores é feita via **Riot Games API v5** (região `br1`, regional `americas`).

- **Produção:** https://arenagg.com.br
- **Repositório:** https://github.com/luanscps/GerenciadorDeTorneios-BRLOL
- **Supabase:** https://supabase.com/dashboard/project/awbieglbwhfavxlghuvy
- **Vercel:** https://vercel.com/ludevbr/gerenciador-de-torneios-brlol

---

## 2. Stack Técnica Exata

> Fonte de verdade: `package.json`

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | ^16.2.6 |
| UI | React / React DOM | ^19.0.1 |
| Linguagem | TypeScript | ^5 |
| Banco de dados | Supabase (PostgreSQL) | @supabase/supabase-js ^2.43.1 |
| Auth SSR | @supabase/ssr | ^0.6.1 |
| Estilo | Tailwind CSS | ^3.4.1 |
| Utilitários CSS | tailwind-merge / clsx / class-variance-authority | ^2.3.0 / ^2.1.1 / ^0.7.0 |
| Animações | framer-motion | ^11.3.0 |
| Formulários | React Hook Form | ^7.51.4 |
| Validação | Zod + @hookform/resolvers | ^3.23.8 / ^3.4.0 |
| Ícones | lucide-react | ^0.511.0 |
| Gráficos | Recharts | ^2.12.7 |
| Datas | date-fns | ^3.6.0 |
| Dev server | Turbopack (`next dev --turbo`) | — |
| Runtime (Vercel) | Node.js | 24.x |
| Deploy | Vercel (Serverless + Edge) | — |

---

## 3. Arquitetura e Estrutura de Pastas

```
GerenciadorDeTorneios-BRLOL/
├── app/                              # Next.js App Router
│   ├── (auth)/                       # Grupo de rotas: login, registro, callback OAuth
│   ├── admin/                        # Painel administrativo (requer is_admin = true)
│   ├── api/
│   │   ├── admin/                    # Endpoints admin (service_role + is_admin)
│   │   ├── auth/                     # Callback OAuth Supabase
│   │   ├── cron/                     # Jobs agendados (Vercel Cron + CRON_SECRET)
│   │   ├── internal/                 # Endpoints internos (server-to-server)
│   │   ├── jogadores/                # Busca de jogadores via Riot API
│   │   ├── player/                   # Perfil de jogador
│   │   ├── profile/                  # Perfil do usuário autenticado
│   │   └── riot/                     # Proxy Riot API
│   ├── dashboard/                    # Dashboard do usuário logado
│   ├── jogadores/                    # Listagem e perfil público de jogadores
│   ├── organizador/                  # Área do organizador (PT-BR — não "organizer")
│   │   └── torneios/
│   │       └── [id]/                 # Painel do torneio
│   │           ├── partidas/         # Gerenciamento de partidas
│   │           ├── inscricoes/       # Aprovação de inscrições
│   │           └── fases/            # Gestão de fases/bracket
│   ├── profile/                      # Perfil do usuário
│   ├── ranking/                      # Ranking geral
│   ├── times/                        # Gerenciamento de times
│   └── torneios/                     # Listagem, detalhes e inscrição em torneios
├── components/
│   ├── admin/                        # Componentes do painel admin
│   ├── layout/                       # Header, Sidebar, Footer
│   ├── match/                        # Componentes de partidas
│   ├── profile/                      # Componentes de perfil de jogador
│   ├── times/                        # Componentes de times
│   ├── tournament/                   # Componentes de torneios
│   └── ProfileIcon.tsx               # Ícone de perfil com borda animada por nível
├── lib/
│   ├── actions/                      # Server Actions do Next.js
│   │   ├── fase.ts                   # Ações de fases do torneio
│   │   ├── ingest-match.ts           # Ingestão de partidas da Riot API → Supabase
│   │   ├── inscricao.ts              # Inscrição de times em torneios
│   │   ├── partida.ts                # CRUD de partidas
│   │   ├── roster.ts                 # Gerenciamento de roster de times
│   │   ├── team_invite.ts            # Convites para times
│   │   ├── tournament.ts             # CRUD de torneios
│   │   └── usuario.ts                # Ações de usuário (perfil, etc.)
│   ├── supabase/
│   │   ├── client.ts                 # Cliente browser (createBrowserClient)
│   │   ├── server.ts                 # Cliente server (createServerClient + cookies)
│   │   └── admin.ts                  # Cliente admin (service_role — uso restrito)
│   ├── types/
│   │   └── tournament.ts             # Tipos TypeScript do domínio
│   ├── validations/
│   │   └── index.ts                  # Schemas Zod centralizados
│   ├── database.types.ts             # Tipos gerados pelo Supabase CLI (não editar)
│   ├── riot.ts                       # Todas as chamadas à Riot API + interfaces
│   ├── riot-cache.ts                 # Cache em memória para respostas da Riot API
│   ├── riot-rate-limiter.ts          # Rate limiter para a Riot API
│   ├── riot-tournament.ts            # Integração Riot Tournament API
│   ├── rate-limit.ts                 # Rate limit genérico de endpoints
│   └── utils.ts                      # Funções utilitárias (cn, formatação, etc.)
├── middleware.ts                     # Auth guard SSR via Supabase (edge runtime)
└── .env.example                       # Variáveis de ambiente necessárias
```

---

## 4. Padrões de Código Obrigatórios

### 4.1 Supabase — Clientes

Existem **três clientes distintos** — nunca misturar:

- **`lib/supabase/client.ts`** → `createBrowserClient()` — usar **apenas em Client Components** (`'use client'`).
- **`lib/supabase/server.ts`** → `createServerClient()` com `cookies()` do `next/headers` — usar em **Server Components, Route Handlers e Server Actions**. O `setAll` **não tem try/catch** propositalmente.
- **`lib/supabase/admin.ts`** → `createClient()` com `service_role` key — usar **apenas em Route Handlers protegidos** (`app/api/admin/`). Nunca expor ao browser.

### 4.2 Autenticação e Middleware

- O `middleware.ts` roda no **Edge Runtime** e protege `/dashboard`, `/admin`, `/profile`, `/times` e `/organizador`.
- A checagem de `is_admin` é feita no `layout.tsx` do grupo `/admin` via Server Component (não no middleware).
- Guard dual do organizador: `tournament.organizer_id === user.id` OU `profile.is_admin === true`. Se nenhum: `redirect('/torneios?error=sem_permissao')`.

### 4.3 Server Actions

- Todas ficam em `lib/actions/`.
- Devem começar com `'use server'`.
- Validação sempre com **Zod** (schemas em `lib/validations/index.ts`).
- Autenticação verificada no início de cada action com `createClient()` do server.
- Erros retornam `{ error: string }` — nunca lançar exceções para o client.
- Usar `revalidatePath()` ou `revalidateTag()` após mutações.

### 4.4 Riot API

- **Nunca chamar a Riot API diretamente de Client Components**. Sempre via Route Handler (`app/api/riot/`) ou Server Action.
- Região padrão: `br1`. O mapa `REGION_TO_REGIONAL` em `lib/riot.ts` resolve para `americas`.
- Cache em memória via `lib/riot-cache.ts` com TTLs por endpoint:
  - `account`: 600s | `summoner`, `league`, `matchids`: 300s | `match` individual: 3600s | `dd:version`: 3600s
- Rate limiter em `lib/riot-rate-limiter.ts` — usar para chamadas em batch.
- Assets de campeões: preferir **CommunityDragon** (`championIconByCDragon(id)`) ao DataDragon por nome.
- Data Dragon com locale `pt_BR` (`getAllChampions()` usa `pt_BR`).

### 4.5 TypeScript

- Tipos do banco gerados pelo Supabase CLI em `lib/database.types.ts` — **não editar manualmente**.
- Tipos de domínio ficam em `lib/types/`.
- Interfaces da Riot API ficam em `lib/riot.ts`.
- Nunca usar `any` — usar `unknown` e narrowing.

### 4.6 Componentes e Bibliotecas

- Client Components: `'use client'` no topo, formulários com `react-hook-form` + `zod`.
- Server Components: busca de dados diretamente com o cliente Supabase server.
- Ícones: **somente `lucide-react`**.
- Gráficos: **somente `recharts`**.
- Datas: **somente `date-fns`** (v3.x — API de imports diretos).
- Animações: **somente `framer-motion`** (já na dependência).
- Estilo: **Tailwind CSS** — sem CSS-in-JS.
- Utilitários CSS: `cn()` via `tailwind-merge` + `clsx` (helper em `lib/utils.ts`).

---

## 5. Variáveis de Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=           # URL pública do projeto Supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=      # Chave anon (segura para o browser)
SUPABASE_SERVICE_ROLE_KEY=          # Chave service_role (NUNCA expor ao browser)

# Riot Games API
RIOT_API_KEY=                       # Chave da Riot (servidor apenas)
RIOT_REGION=br1                     # Plataforma padrão
RIOT_REGIONAL_HOST=americas         # Regional host

# App / Infra
NEXT_PUBLIC_APP_URL=                # URL pública da aplicação
CRON_SECRET=                        # Secret para autenticação dos cron jobs
```

**Regra crítica:** variáveis sem prefixo `NEXT_PUBLIC_` são **server-only**.

---

## 6. Mapa Completo de Rotas

| Rota | Tipo | Proteção |
|---|---|---|
| `/` | Página pública | Nenhuma |
| `/torneios/[id]` | Página pública | Nenhuma |
| `/jogadores` | Página pública | Nenhuma |
| `/jogadores/[gameName]/[tagLine]` | Página pública | Nenhuma |
| `/ranking` | Página pública | Nenhuma |
| `/dashboard` | Página protegida | Middleware (user logado) |
| `/profile` | Página protegida | Middleware (user logado) |
| `/times` | Página protegida | Middleware (user logado) |
| `/organizador/torneios/[id]` | Página protegida | `organizer_id === user.id` OU `is_admin` |
| `/organizador/torneios/[id]/partidas` | Página protegida | `organizer_id === user.id` OU `is_admin` |
| `/organizador/torneios/[id]/inscricoes` | Página protegida | `organizer_id === user.id` OU `is_admin` |
| `/organizador/torneios/[id]/fases` | Página protegida | `organizer_id === user.id` OU `is_admin` |
| `/admin/**` | Página protegida | Middleware + layout `is_admin` |
| `app/api/riot/**` | Route Handler | Server-only |
| `app/api/admin/**` | Route Handler | `service_role` + `is_admin` |
| `app/api/cron/**` | Route Handler | Header `CRON_SECRET` |
| `app/api/internal/**` | Route Handler | Token interno |

---

## 7. Fluxo de Dados e Padrões de Busca

### Leitura de dados (Server Component):
```typescript
// ✅ Correto — Server Component
import { createClient } from '@/lib/supabase/server'

export default async function Page() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('torneios').select('*')
  // ...
}
```

### Mutação (Server Action):
```typescript
'use server'
import { createClient } from '@/lib/supabase/server'
import { TorneioSchema } from '@/lib/validations'

export async function criarTorneio(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' }

  const parsed = TorneioSchema.safeParse(Object.fromEntries(formData))
  if (!parsed.success) return { error: parsed.error.flatten() }

  const { error } = await supabase.from('torneios').insert(parsed.data)
  if (error) return { error: error.message }

  revalidatePath('/torneios')
  return { success: true }
}
```

---

## 8. Banco de Dados — Supabase / PostgreSQL

> Fonte de verdade: `lib/database.types.ts` (gerado via `supabase gen types typescript`)

### Tabelas

`profiles`, `riot_accounts`, `players`, `teams`, `team_members`, `team_invites`,
`tournaments`, `tournament_stages`, `inscricoes`, `matches`, `match_games`, `player_stats`,
`champion_masteries`, `rank_snapshots`, `disputes`, `notifications`, `prize_distribution`,
`tournament_rules`, `seedings`, `audit_log`, `riot_tournament_registrations`,
`tournament_match_results`, `active_team`, `site_terms_acceptance`

### Views

- `profiles_with_riot` — profiles enriquecidos com dados da conta Riot
- `v_tournament_standings` — classificação geral por torneio
- `v_stage_standings` — classificação por fase
- `v_player_leaderboard` — ranking global de jogadores
- `v_player_tournament_kda` — KDA por jogador por torneio

### Funções RPC

- `is_admin` — verifica se o usuário atual é admin
- `is_current_user_admin` — alias seguro para uso em policies RLS
- `is_organizer_or_admin` — verifica organizador OU admin
- `is_tournament_organizer` — verifica se é organizador de um torneio específico
- `accept_team_invite` — aceita convite de time (atualiza status atomicamente)
- `log_admin_action` — grava entrada no `audit_log`

### Enums Confirmados

| Enum | Valores |
|---|---|
| `tournament_status` | `DRAFT`, `OPEN`, `IN_PROGRESS`, `FINISHED`, `CANCELLED` |
| `bracket_type` | `SINGLE_ELIMINATION`, `DOUBLE_ELIMINATION`, `ROUND_ROBIN`, `SWISS` |
| `match_status` | `SCHEDULED`, `IN_PROGRESS`, `FINISHED`, `CANCELLED`, `WALKOVER` |
| `inscricao_status` | `PENDING`, `APPROVED`, `REJECTED` |
| `player_role` | `TOP`, `JUNGLE`, `MID`, `ADC`, `SUPPORT` |
| `team_member_role` | `captain`, `member`, `substitute` |
| `team_member_status` | `pending`, `accepted`, `rejected`, `left` |
| `invite_status` | `PENDING`, `ACCEPTED`, `DECLINED`, `EXPIRED` |
| `user_role` | `player`, `organizer`, `admin` |
| `dispute_status` | `OPEN`, `UNDER_REVIEW`, `RESOLVED`, `DISMISSED` |

---

## 9. Integração Riot API

### Endpoints usados

| Endpoint | Tipo | Uso |
|---|---|---|
| Account-V1 | REGIONAL (americas) | Resolve `puuid` a partir de `Nome#TAG` |
| Summoner-V4 | PLATFORM (br1) | Nível e ícone do invocador |
| League-V4 | PLATFORM (br1) | Elo Solo/Flex (tier, rank, LP, W/L) |
| Match-V5 | REGIONAL (americas) | Histórico e detalhes completos de partidas |
| Champion-Mastery-V4 | PLATFORM (br1) | Top campeões mais jogados |
| Status-V4 | PLATFORM (br1) | Monitoramento de status da plataforma |
| Tournament-V5 | REGIONAL (americas) | Registro de torneio + geração de tournament codes |
| Tournament-Stub-V4 | REGIONAL (americas) | Ambiente de testes (API key sem produção) |

### Fluxo padrão de lookup de jogador

1. `getAccountByRiotId(gameName, tagLine)` → `puuid`
2. `getSummonerByPuuid(puuid)` → `summonerId`, `profileIconId`, `summonerLevel`
3. `getLeagueEntriesByPuuid(puuid)` → rank, LP, W/L
4. `getTopMasteriesByPuuid(puuid)` → campeões mais jogados

### Assets

- Ícone de perfil: `profileIconUrl(id)` (DataDragon)
- Ícone de campeão: `championIconByCDragon(championId)` (**preferido**) ou `championIconUrl(name)` (fallback)
- Emblema de rank: `rankEmblemUrl(tier)` (CommunityDragon)
- Borda de nível: `profileIconBorderStyle(level)` → `{ color, glow, label }`

### Integração Tournament API (`lib/riot-tournament.ts`)

- Registra torneios via `riot_tournament_registrations` (`riot_provider_id`, `riot_tournament_id`)
- Gera `tournament_codes` por partida (armazenado em `matches.tournament_codes` como JSON)
- Recebe callbacks da Riot via `tournament_match_results` (`tournament_code`, `game_data`)

---

## 10. Deploy — Vercel

- Framework: **Next.js** com App Router.
- Runtime: **Node.js 24.x**.
- Dev server: `npm run dev` usa **Turbopack** (`next dev --turbo`).
- Funções serverless: Route Handlers em `app/api/`.
- **Vercel Cron Jobs:** endpoints em `app/api/cron/` configurados no `vercel.json`.
- Edge Runtime: **apenas o `middleware.ts`** roda no edge (sem Node.js APIs).
- Variáveis de ambiente: configurar no painel Vercel separado por ambiente (Production / Preview / Development).
- **Não usar `fs`, `path` ou APIs Node.js nativas** em código que rode no edge.

---

## 11. O Que Nunca Fazer

- ❌ Usar `supabase.auth.getSession()` no server-side — sempre `supabase.auth.getUser()`.
- ❌ Importar `lib/supabase/admin.ts` em Client Components.
- ❌ Expor `RIOT_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` ao browser.
- ❌ Adicionar `try/catch` no `setAll` de cookies em `lib/supabase/server.ts`.
- ❌ Usar `localStorage` ou `sessionStorage`.
- ❌ Editar `lib/database.types.ts` manualmente.
- ❌ Chamar Riot API diretamente de Client Component.
- ❌ Usar qualquer biblioteca de datas que não seja `date-fns` v3.
- ❌ Usar `any` no TypeScript.
- ❌ Criar CSS-in-JS ou `styled-components`.
- ❌ Duplicar schemas Zod fora de `lib/validations/index.ts`.
- ❌ Usar biblioteca de animação diferente de `framer-motion`.
- ❌ Referenciar a rota do organizador como `/organizer/` (o nome correto é `/organizador/`).

---

## 12. Comandos Úteis

```bash
# Desenvolvimento local (Turbopack)
npm run dev

# Gerar tipos do Supabase (rodar após mudanças no schema)
npx supabase gen types typescript --project-id awbieglbwhfavxlghuvy > lib/database.types.ts

# Build de produção
npm run build

# Lint
npm run lint
```
