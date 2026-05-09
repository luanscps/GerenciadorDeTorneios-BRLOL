# Instruções Personalizadas — Kilo Code (Todos os Modos)
## Projeto: GerenciadorDeTorneios-BRLOL

---

## 1. Contexto do Projeto

Este é um sistema web de gerenciamento de torneios de League of Legends voltado para o Brasil (BRLOL). A aplicação é full-stack, com backend via **Supabase** (PostgreSQL + Auth + RLS) e deploy na **Vercel** com **Next.js App Router**. Toda interação com dados de jogadores é feita via **Riot Games API** (região `br1`, regional `americas`).

O projeto é **open-source**, em desenvolvimento ativo, e o desenvolvedor principal é o único mantenedor.

---

## 2. Stack Técnica Exata

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 15.2.6 |
| UI | React / React DOM | 19.0.1 |
| Linguagem | TypeScript | ^5 |
| Banco de dados | Supabase (PostgreSQL) | @supabase/supabase-js ^2.43.1 |
| Auth SSR | @supabase/ssr | ^0.6.1 |
| Estilo | Tailwind CSS | ^3.4.1 |
| Formulários | React Hook Form + Zod | ^7.51.4 / ^3.23.8 |
| Validação | @hookform/resolvers | ^3.4.0 |
| Ícones | lucide-react | ^0.511.0 |
| Gráficos | Recharts | ^2.12.7 |
| Datas | date-fns | ^3.6.0 |
| Deploy | Vercel (Serverless + Edge) | — |

---

## 3. Arquitetura e Estrutura de Pastas

```
GerenciadorDeTorneios-BRLOL/
├── app/                         # Next.js App Router
│   ├── (auth)/                  # Grupo de rotas: login, registro, callback
│   ├── admin/                   # Painel administrativo (requer is_admin = true)
│   ├── api/
│   │   ├── admin/               # Endpoints admin protegidos
│   │   ├── auth/                # Callback OAuth Supabase
│   │   ├── cron/                # Jobs agendados (Vercel Cron)
│   │   ├── internal/            # Endpoints internos (server-to-server)
│   │   ├── jogadores/           # Busca de jogadores via Riot API
│   │   ├── player/              # Perfil de jogador
│   │   ├── profile/             # Perfil do usuário autenticado
│   │   └── riot/                # Proxy Riot API
│   ├── dashboard/               # Dashboard do usuário logado
│   ├── jogadores/               # Listagem e perfil público de jogadores
│   ├── organizador/             # Área do organizador de torneios
│   ├── profile/                 # Perfil do usuário
│   ├── ranking/                 # Ranking geral
│   ├── times/                   # Gerenciamento de times
│   └── torneios/                # Listagem, detalhes e inscrição em torneios
├── components/
│   ├── admin/                   # Componentes do painel admin
│   ├── layout/                  # Header, Sidebar, Footer
│   ├── match/                   # Componentes de partidas
│   ├── profile/                 # Componentes de perfil de jogador
│   ├── times/                   # Componentes de times
│   ├── tournament/              # Componentes de torneios
│   └── ProfileIcon.tsx          # Ícone de perfil com borda animada por nível
├── lib/
│   ├── actions/                 # Server Actions do Next.js
│   │   ├── fase.ts              # Ações de fases do torneio
│   │   ├── ingest-match.ts      # Ingestão de partidas da Riot API → Supabase
│   │   ├── inscricao.ts         # Inscrição de times em torneios
│   │   ├── partida.ts           # CRUD de partidas
│   │   ├── roster.ts            # Gerenciamento de roster de times
│   │   ├── team_invite.ts       # Convites para times
│   │   ├── tournament.ts        # CRUD de torneios
│   │   └── usuario.ts           # Ações de usuário (perfil, etc.)
│   ├── supabase/
│   │   ├── client.ts            # Cliente browser (createBrowserClient)
│   │   ├── server.ts            # Cliente server (createServerClient + cookies)
│   │   └── admin.ts             # Cliente admin (service_role — uso restrito)
│   ├── types/
│   │   └── tournament.ts        # Tipos TypeScript do domínio
│   ├── validations/
│   │   └── index.ts             # Schemas Zod centralizados
│   ├── database.types.ts        # Tipos gerados automaticamente pelo Supabase CLI
│   ├── riot.ts                  # Todas as chamadas à Riot API + interfaces TypeScript
│   ├── riot-cache.ts            # Cache em memória para respostas da Riot API
│   ├── riot-rate-limiter.ts     # Rate limiter para a Riot API
│   ├── riot-tournament.ts       # Integração Riot Tournament API
│   ├── rate-limit.ts            # Rate limit genérico de endpoints
│   └── utils.ts                 # Funções utilitárias (cn, formatação, etc.)
├── middleware.ts                 # Auth guard SSR via Supabase (edge runtime)
└── .env.example                  # Variáveis de ambiente necessárias
```

---

## 4. Padrões de Código Obrigatórios

### 4.1 Supabase — Clientes

Existem **três clientes distintos** — nunca misturar:

- **`lib/supabase/client.ts`** → `createBrowserClient()` — usar **apenas em Client Components** (`'use client'`). Nunca em Server Components, Actions ou Route Handlers.
- **`lib/supabase/server.ts`** → `createServerClient()` com `cookies()` do `next/headers` — usar em **Server Components, Route Handlers e Server Actions**. A função `setAll` **não tem try/catch** propositalmente (para não silenciar erros de token).
- **`lib/supabase/admin.ts`** → `createClient()` com `service_role` key — usar **apenas em Route Handlers server-side protegidos** (ex: `app/api/admin/`) e **nunca em Client Components ou expor para o browser**.

### 4.2 Autenticação e Middleware

- O `middleware.ts` roda no **Edge Runtime** e protege as rotas `/dashboard`, `/admin` e `/torneios/inscrever`.
- A checagem de `is_admin` **não é feita no middleware** (evita latência no edge); ela é feita no `layout.tsx` do grupo `/admin` via Server Component.
- O `redirectTo` é preservado via `searchParams` no redirect para `/login`.
- Ao modificar rotas protegidas, **atualizar o array `protectedRoutes`** no `middleware.ts`.

### 4.3 Server Actions

- Todas ficam em `lib/actions/`.
- Devem começar com `'use server'`.
- Validação sempre com **Zod** (schemas em `lib/validations/index.ts`).
- Autenticação verificada no início de cada action com `createClient()` do server.
- Erros retornam `{ error: string }` — nunca lançar exceções para o client.
- Usar `revalidatePath()` ou `revalidateTag()` após mutações.

### 4.4 Riot API

- **Nunca chamar a Riot API diretamente de Client Components**. Sempre via Route Handler (`app/api/riot/`) ou Server Action.
- Região padrão: `br1` (configurada em `RIOT_REGION`). O mapa `REGION_TO_REGIONAL` em `lib/riot.ts` resolve para `americas`.
- Cache em memória via `lib/riot-cache.ts` com TTLs definidos por endpoint:
  - `account`: 600s
  - `summoner`, `league`, `matchids`: 300s
  - `match` individual: 3600s
  - Versão DataDragon (`dd:version`): 3600s
- Rate limiter em `lib/riot-rate-limiter.ts` — usar para chamadas em batch.
- Assets de campeões: preferir **CommunityDragon** (`championIconByCDragon(id)`) ao DataDragon por nome, pois é mais confiável.
- Data Dragon com locale `pt_BR` (`getAllChampions()` usa `pt_BR`).

### 4.5 TypeScript

- Tipos do banco gerados pelo Supabase CLI em `lib/database.types.ts` — **não editar manualmente**.
- Tipos de domínio ficam em `lib/types/`.
- Interfaces da Riot API ficam em `lib/riot.ts` (junto das funções).
- Nunca usar `any` — usar `unknown` e narrowing quando necessário.

### 4.6 Componentes

- Client Components: `'use client'` no topo, formulários com `react-hook-form` + `zod`.
- Server Components: busca de dados diretamente com o cliente Supabase server.
- Ícones: **somente `lucide-react`**.
- Gráficos: **somente `recharts`**.
- Datas: **somente `date-fns`** (versão 3.x — API de imports diretos, não default).
- Estilo: **Tailwind CSS** — sem CSS-in-JS, sem styled-components.

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
RIOT_REGIONAL_HOST=americas         # Regional host (derivado do RIOT_REGION)

# Vercel (automático no deploy)
VERCEL_URL=                         # URL automática do deploy
```

**Regra crítica:** variáveis sem prefixo `NEXT_PUBLIC_` são **server-only**. Nunca referenciar `SUPABASE_SERVICE_ROLE_KEY` ou `RIOT_API_KEY` em código client-side.

---

## 6. Convenções de Rotas e API

| Rota | Tipo | Proteção |
|---|---|---|
| `/` | Public Page | Nenhuma |
| `/torneios/[id]` | Public Page | Nenhuma |
| `/jogadores/[slug]` | Public Page | Nenhuma |
| `/ranking` | Public Page | Nenhuma |
| `/dashboard` | Protected Page | Middleware (user logado) |
| `/profile` | Protected Page | Middleware (user logado) |
| `/torneios/inscrever` | Protected Page | Middleware (user logado) |
| `/admin/**` | Protected Page | Middleware + layout `is_admin` |
| `/organizador/**` | Protected Page | Verificado no layout |
| `app/api/riot/**` | Route Handler | Server-only |
| `app/api/admin/**` | Route Handler | `service_role` + `is_admin` |
| `app/api/cron/**` | Route Handler | `CRON_SECRET` header |
| `app/api/internal/**` | Route Handler | Internal token |

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

### Dados de Riot API (Route Handler):
```typescript
// app/api/riot/player/route.ts
import { getAccountByRiotId } from '@/lib/riot'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const gameName = searchParams.get('gameName')
  const tagLine = searchParams.get('tagLine')
  const account = await getAccountByRiotId(gameName!, tagLine!)
  return Response.json(account)
}
```

---

## 8. Banco de Dados — Supabase / PostgreSQL

- O schema tipado completo está em `lib/database.types.ts` — consultar antes de criar queries.
- RLS (Row Level Security) está **ativo** — sempre usar o cliente correto (anon vs service_role).
- Tabelas principais identificadas pelo schema: `torneios`, `times`, `jogadores`, `partidas`, `fases`, `inscricoes`, `rosters`, `usuarios`, `team_invites`.
- Queries complexas com múltiplos joins: preferir **views do Supabase** ou RPC em vez de queries encadeadas no cliente.
- Ao adicionar novas tabelas ou colunas: **rodar `supabase gen types typescript`** e commitar o `database.types.ts` atualizado.

---

## 9. Integração Riot API — Regras Específicas

- **Endpoint principal de busca de conta:** `getAccountByRiotId(gameName, tagLine)` → retorna `puuid`.
- **Fluxo padrão de lookup de jogador:**
  1. `getAccountByRiotId(gameName, tagLine)` → `puuid`
  2. `getSummonerByPuuid(puuid)` → `summonerId`, `profileIconId`, `summonerLevel`
  3. `getLeagueEntriesByPuuid(puuid)` → rank, LP, W/L
  4. `getTopMasteriesByPuuid(puuid)` → campeões mais jogados
- **Assets:**
  - Ícone de perfil: `profileIconUrl(id)` (DataDragon)
  - Ícone de campeão: `championIconByCDragon(championId)` (preferido) ou `championIconUrl(name)` (fallback)
  - Emblema de rank: `rankEmblemUrl(tier)` (CommunityDragon)
  - Borda de nível do perfil: `profileIconBorderStyle(level)` retorna `{ color, glow, label }` — aplicar via CSS inline
- **Rate limit:** usar `lib/riot-rate-limiter.ts` em operações de ingestão em batch (`lib/actions/ingest-match.ts`).

---

## 10. Deploy — Vercel

- Framework: **Next.js** com App Router.
- Funções serverless: Route Handlers em `app/api/`.
- **Vercel Cron Jobs:** endpoints em `app/api/cron/` — configurados no `vercel.json`.
- Edge Runtime: apenas o `middleware.ts` roda no edge (sem Node.js APIs).
- Variáveis de ambiente: configuradas no painel Vercel (Production, Preview, Development separados).
- **Não usar `fs`, `path` ou APIs Node.js nativas** em código que possa rodar no edge.

---

## 11. O Que Nunca Fazer

- ❌ Usar `supabase.auth.getSession()` para verificar autenticação em server-side — usar sempre `supabase.auth.getUser()` (mais seguro).
- ❌ Importar `lib/supabase/admin.ts` em Client Components.
- ❌ Expor `RIOT_API_KEY` ou `SUPABASE_SERVICE_ROLE_KEY` ao browser.
- ❌ Adicionar `try/catch` no `setAll` de cookies no `lib/supabase/server.ts` (já foi removido intencionalmente).
- ❌ Usar `localStorage` ou `sessionStorage` (bloqueado no contexto de deploy Vercel com SSR).
- ❌ Editar `lib/database.types.ts` manualmente.
- ❌ Chamar Riot API direto de Client Component.
- ❌ Usar qualquer biblioteca de datas que não seja `date-fns` v3.
- ❌ Usar `any` no TypeScript.
- ❌ Criar CSS-in-JS, usar `styled-components` ou similares.
- ❌ Duplicar schemas Zod fora de `lib/validations/index.ts`.

---

## 12. Diretrizes para o Agente de IA (Kilo Code / Gemini)

### Ao ler o código:
- O arquivo mais importante para entender o domínio do banco é `lib/database.types.ts`.
- O arquivo mais importante para entender a integração Riot é `lib/riot.ts`.
- Para entender o fluxo de auth, ler `middleware.ts` + `lib/supabase/server.ts`.

### Ao gerar código:
- Sempre respeitar a separação `client.ts` / `server.ts` / `admin.ts`.
- Novos Server Actions: criar em `lib/actions/` seguindo o padrão existente.
- Novos componentes: colocar na subpasta correta de `components/` (ex: `components/tournament/` para UI de torneios).
- Novos tipos de domínio: criar em `lib/types/`.
- Novos schemas de validação: adicionar em `lib/validations/index.ts`.
- Preferir Server Components para dados; Client Components apenas para interatividade.

### Ao corrigir bugs:
- Verificar primeiro se o erro é de cliente Supabase errado (browser vs server vs admin).
- Erros de Riot API: verificar rate limit (`lib/riot-rate-limiter.ts`) e cache (`lib/riot-cache.ts`).
- Erros de tipo: checar `lib/database.types.ts` e `lib/types/tournament.ts`.

### Ao refatorar:
- Manter o padrão de `{ error: string } | { success: true }` nas Server Actions.
- Não quebrar os TTLs de cache da Riot API definidos em `lib/riot.ts`.
- Preservar comentários explicativos existentes (ex: o comentário sobre `setAll` sem `try/catch`).

---

## 13. Comandos Úteis

```bash
# Desenvolvimento local
npm run dev

# Gerar tipos do Supabase (rodar após mudanças no schema do banco)
npx supabase gen types typescript --project-id <PROJECT_ID> > lib/database.types.ts

# Build de produção
npm run build

# Lint
npm run lint
```

---

*Documento gerado com base na análise direta do repositório `luanscps/GerenciadorDeTorneios-BRLOL` — branch principal.*
