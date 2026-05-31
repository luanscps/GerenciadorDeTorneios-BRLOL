# ⚔️ GerenciadorDeTorneios-BRLOL

> Plataforma completa para torneios casuais de **League of Legends 5v5**
> com integração real à **Riot Games API v5**, backend em **Supabase** e frontend em **Next.js**.

[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![React](https://img.shields.io/badge/React-19-blue)](https://react.dev/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📚 Documentação principal

Toda a documentação técnica do projeto foi unificada em:

- [`docs/BRLOL-DOCS-UNIFICADO.md`](docs/BRLOL-DOCS-UNIFICADO.md)

Lá você encontra:

- Visão geral da arquitetura (Next.js + Supabase + Riot API);
- Modelo de dados completo do Supabase (tabelas, enums, FKs, RLS, views, RPCs);
- Integrações com a Riot Games API (endpoints usados, Data Dragon, CommunityDragon, fluxos);
- Fluxos principais de negócio (inscrição, seedings, geração de chave, resultados, leaderboards).

Para detalhes sobre as Server Actions, consulte:

- [`docs/SERVER-ACTIONS.md`](docs/SERVER-ACTIONS.md)

---

## 🎯 Visão geral do produto

O BRLOL resolve o problema de organizar torneios casuais de LoL sem depender de plataformas externas pagas ou engessadas.

Principais capacidades:

- Vincular contas reais via **Riot ID** (`Nome#TAG`) e manter elo/LP atualizados automaticamente.
- Gerenciar **times, inscrições, check-in, seedings** e chaves (single elim, double elim, round robin, swiss).
- Registrar resultados por jogo (KDA, CS, dano, visão, MVP) e gerar **leaderboards** por torneio e globais.
- Aplicar **RLS forte** no Supabase, com trilha de auditoria (`audit_log`) para ações administrativas.

---

## 🛠️ Stack tecnológica

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework web | Next.js (App Router) | ^16.2.6 |
| UI | React / React DOM | ^19.0.1 |
| Linguagem | TypeScript | ^5 |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) | @supabase/supabase-js ^2.43.1 |
| Auth SSR | @supabase/ssr | ^0.6.1 |
| Estilização | Tailwind CSS | ^3.4.1 |
| Utilitários CSS | tailwind-merge + clsx + class-variance-authority | ^2.3.0 / ^2.1.1 / ^0.7.0 |
| Animações | framer-motion | ^11.3.0 |
| Formulários | React Hook Form + Zod | ^7.51.4 / ^3.23.8 |
| Validação | @hookform/resolvers | ^3.4.0 |
| Ícones | lucide-react | ^0.511.0 |
| Gráficos | Recharts | ^2.12.7 |
| Datas | date-fns | ^3.6.0 |
| API externa | Riot Games API v5 (Account, Summoner, League, Match, Mastery, Status, Tournament) | — |
| Deploy | Vercel (Edge Network + Cron Jobs) | — |
| Runtime | Node.js | 24.x |
| Dev server | Turbopack (`next dev --turbo`) | — |

Detalhes de arquitetura, diagramas e relacionamentos de tabelas estão em [`docs/BRLOL-DOCS-UNIFICADO.md`](docs/BRLOL-DOCS-UNIFICADO.md).

---

## 🏗️ Arquitetura resumida

```text
USUÁRIO / BROWSER
        │
        ▼
Next.js (App Router, Vercel)
  ├── Páginas públicas: /, /torneios/[id], /jogadores, /ranking
  ├── Área do organizador: /organizador/torneios/[id]/**
  ├── Painel admin: /admin/**
  └── Rotas /api/* (server-side)
        │
        ├── Supabase (Postgres + Auth + RLS)
        │     profiles, tournaments, teams, players,
        │     inscricoes, matches, match_games, player_stats,
        │     riot_accounts, rank_snapshots, champion_masteries,
        │     riot_tournament_registrations, tournament_match_results…
        │
        └── Riot Games API (account-v1, summoner-v4, league-v4,
                          match-v5, champion-mastery-v4,
                          status-v4, tournament-v5, tournament-stub-v4)
```

---

## 🗄️ Banco de dados (Supabase)

O banco roda em um projeto Supabase, usando apenas o schema `public` com RLS habilitado em todas as tabelas.

Entidades principais:

- **profiles** — espelha `auth.users`, guarda `is_admin`, dados básicos e Riot ID padrão.
- **tournaments** — torneios (slug, status, bracket_type, max_teams, datas, regras, webhook Discord).
- **teams / players / inscricoes** — times, jogadores e pedidos de inscrição em torneios.
- **matches / match_games / player_stats** — partidas (séries), jogos individuais e estatísticas detalhadas (KDA, CS, dano, visão, MVP).
- **riot_accounts / rank_snapshots / champion_masteries** — camada de persistência da Riot API.
- **riot_tournament_registrations / tournament_match_results** — integração com a Riot Tournament API.
- **prize_distribution / seedings / team_invites / disputes / tournament_rules** — premiação, seedings, convites, disputas e regras.

Para o schema completo (coluna por coluna, FKs, views e funções RPC), consulte [`docs/SCHEMA.md`](docs/SCHEMA.md) e a seção **"Banco de dados"** em [`docs/BRLOL-DOCS-UNIFICADO.md`](docs/BRLOL-DOCS-UNIFICADO.md).

---

## 🗺️ Rotas da aplicação

| Rota | Acesso |
|---|---|
| `/` | Público |
| `/torneios/[id]` | Público |
| `/jogadores/[gameName]/[tagLine]` | Público |
| `/ranking` | Público |
| `/dashboard` | Usuário autenticado |
| `/profile` | Usuário autenticado |
| `/times` | Usuário autenticado |
| `/organizador/torneios/[id]` | `organizer_id === user.id` OU `is_admin` |
| `/organizador/torneios/[id]/partidas` | `organizer_id === user.id` OU `is_admin` |
| `/organizador/torneios/[id]/inscricoes` | `organizer_id === user.id` OU `is_admin` |
| `/organizador/torneios/[id]/fases` | `organizer_id === user.id` OU `is_admin` |
| `/admin/**` | `is_admin === true` |

---

## 🎮 Riot Games API

A integração com a Riot API é feita via Next.js Route Handlers e helpers em `lib/riot.ts` + `lib/riot-cache.ts` + `lib/riot-rate-limiter.ts`.

Endpoints usados (resumo):

- **Account-V1 (REGIONAL, americas)** — resolve `puuid` a partir de `Nome#TAG`.
- **Summoner-V4 (PLATFORM, br1)** — nível e ícone do invocador.
- **League-V4 (PLATFORM)** — elo Solo/Flex (tier, rank, LP, wins, losses).
- **Match-V5 (REGIONAL)** — histórico de partidas e detalhes completos de cada jogo.
- **Champion-Mastery-V4 (PLATFORM)** — campeões mais jogados (maestria).
- **Status-V4 (PLATFORM)** — monitoramento de status da plataforma.
- **Tournament-V5 / Tournament-Stub-V4** — geração de tournament codes e callbacks.

---

## 🔐 Variáveis de ambiente (resumo)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# Riot Games
RIOT_API_KEY=RGAPI-xxxx-xxxx-xxxx-xxxx
RIOT_REGION=br1
RIOT_REGIONAL_HOST=americas

# App / Infra
NEXT_PUBLIC_APP_URL=http://localhost:3000
CRON_SECRET=string-aleatoria-grande
```

Regras importantes:

- **Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` ou `RIOT_API_KEY` no frontend (não usar `NEXT_PUBLIC_`).
- Definir as mesmas variáveis na Vercel (`Project Settings → Environment Variables`).

---

## 🚀 Desenvolvimento local

Pré-requisitos: Node.js **24.x**, conta Supabase, chave Riot API.

```bash
# 1. Clonar o repositório
git clone https://github.com/luanscps/GerenciadorDeTorneios-BRLOL.git
cd GerenciadorDeTorneios-BRLOL

# 2. Instalar dependências
npm install

# 3. Configurar ambiente
cp .env.example .env.local
# Preencher .env.local com as chaves do Supabase e da Riot

# 4. Aplicar schema/migrations no Supabase
# (ver docs/SCHEMA.md e supabase/migrations/)

# 5. Rodar em desenvolvimento (Turbopack ativo)
npm run dev
# http://localhost:3000
```

Scripts principais:

- `npm run dev` — servidor de desenvolvimento com Turbopack (`next dev --turbo`).
- `npm run build` — build de produção.
- `npm run start` — serve o build.
- `npm run lint` — análise estática.

---

## ☁️ Deploy na Vercel

1. Importar o repositório em [`https://vercel.com/new`](https://vercel.com/new).
2. Configurar as variáveis de ambiente no painel da Vercel.
3. Cada push na `main` gera um **Production Deploy**. Pull Requests geram **Preview Deployments**.

Crons (`/api/cron/check-riot-status`) são configurados em `vercel.json`.

---

## 🗺️ Roadmap

Veja [`docs/PROXIMOS-PASSOS.md`](docs/PROXIMOS-PASSOS.md) para o backlog priorizado atual.

---

## 📄 Licença

MIT © [Luan](https://github.com/luanscps)
