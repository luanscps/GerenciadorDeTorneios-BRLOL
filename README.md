# ⚔️ GerenciadorDeTorneios-BRLOL


> Plataforma completa para torneios casuais de **League of Legends 5v5**  
> com integração real à **Riot Games API v5**, backend em **Supabase** e frontend em **Next.js**.

[![Next.js](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green)](https://supabase.com)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue)](https://typescriptlang.org)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📚 Documentação principal

Toda a documentação técnica do projeto foi unificada em:

- [`docs/BRLOL-DOCS-UNIFICADO.md`](docs/BRLOL-DOCS-UNIFICADO.md)

Lá você encontra:

- visão geral da arquitetura (Next.js + Supabase + Riot API + Edge Functions);
- modelo de dados completo do Supabase (tabelas, enums, FKs, RLS);
- integrações com a Riot Games API (endpoints usados, Data Dragon, fluxos);
- Edge Functions (`bracket-generator`, `send-email`, `riot-api-sync`, `discord-webhook`);
- fluxos principais de negócio (inscrição, seedings, geração de chave, resultados, leaderboards).

A pasta [`docs/api`](docs/api) traz detalhes específicos da camada de API (rotas internas, cron, rate limiting, Supabase client).

---

## 🎯 Visão geral do produto

O BRLOL resolve o problema de organizar torneios casuais de LoL sem depender de plataformas externas pagas ou engessadas.

Principais capacidades:

- Vincular contas reais via **Riot ID** (`Nome#TAG`) e manter elo/LP atualizados automaticamente.
- Gerenciar **times, inscrições, check-in, seedings** e chaves (single elim, double elim, round robin, swiss).
- Registrar resultados por jogo (KDA, CS, dano, visão, MVP) e gerar **leaderboards** por torneio e globais.
- Notificar jogadores via e‑mail (Resend) e canais Discord via webhooks.
- Aplicar **RLS forte** no Supabase, com trilha de auditoria (`audit_log`) para ações administrativas.[cite:13]

---

## 🛠️ Stack tecnológica

| Camada | Tecnologia |
|---|---|
| Framework web | Next.js 14 (App Router) |
| Linguagem | TypeScript 5.x |
| Estilização | Tailwind CSS 3.x |
| Backend / DB | Supabase (PostgreSQL + Auth + RLS) |
| Auth | Supabase Auth (JWT + cookies) |
| API externa | Riot Games API v5 (Account, Summoner, League, Match, Mastery, Status) |
| E‑mail | Resend (Edge Function `send-email`) |
| Notificações externas | Discord Webhooks (Edge Function `discord-webhook`) |
| Deploy | Vercel (Edge Network + cron jobs) |

Detalhes de arquitetura, diagramas e relacionamentos de tabelas estão em `BRLOL-DOCS-UNIFICADO.md`.[cite:13]

---

## 🏗️ Arquitetura resumida

```text
USUÁRIO / BROWSER
        │
        ▼
Next.js (App Router, Vercel)
  ├── Páginas / dashboard / admin / torneios
  └── Rotas /api/* (server-side)
        │
        ├── Supabase (Postgres + Auth + RLS)
        │     profiles, tournaments, teams, players,
        │     inscricoes, matches, match_games, player_stats,
        │     riot_accounts, rank_snapshots, champion_masteries…
        │
        ├── Riot Games API (account-v1, summoner-v4, league-v4,
        │                 match-v5, champion-mastery-v4, status-v4)
        │
        └── Edge Functions Supabase
              bracket-generator, send-email,
              riot-api-sync, discord-webhook
```

A visão detalhada (incluindo RLS, views de leaderboard e triggers) está documentada em `BRLOL-DOCS-UNIFICADO.md`.[cite:13]

---

## 🗄️ Banco de dados (Supabase)

O banco roda em um projeto Supabase, usando apenas o schema `public` com RLS habilitado.[cite:13]

Entidades principais:

- **profiles** — espelha `auth.users`, guarda `is_admin`, dados básicos e Riot ID padrão.[cite:13]
- **tournaments** — torneios (slug, status, bracket_type, max_teams, datas, regras, webhook Discord).[cite:13]
- **teams / players / inscricoes** — times, jogadores e pedidos de inscrição em torneios.[cite:13]
- **matches / match_games / player_stats** — partidas (séries), jogos individuais e estatísticas detalhadas (KDA, CS, dano, visão, MVP).[cite:13]
- **riot_accounts / rank_snapshots / champion_masteries** — camada de persistência da Riot API.[cite:13]
- **prize_distribution / seedings / team_invites / disputes / tournament_rules** — premiação, seedings, convites de time, disputas e regras específicas do torneio.[cite:13]

Para o schema completo (coluna por coluna, FKs e views), consulte a seção **“Modelo de dados — schema público Supabase”** em `BRLOL-DOCS-UNIFICADO.md`.[cite:13]

---

## 🎮 Riot Games API

A integração com a Riot API é feita via Next.js Route Handlers e helpers em `lib/riot.ts` + `lib/riot-cache.ts` + `lib/rate-limit.ts`.[cite:14]

Endpoints usados (resumo):

- **Account-V1 (REGIONAL, americas)** — resolve `puuid` a partir de `Nome#TAG`.
- **Summoner-V4 (PLATFORM, br1)** — nível e ícone do invocador.
- **League-V4 (PLATFORM)** — elo Solo/Flex (tier, rank, LP, wins, losses).
- **Match-V5 (REGIONAL)** — histórico de partidas e detalhes completos de cada jogo.
- **Champion-Mastery-V4 (PLATFORM)** — campeões mais jogados (maestria).
- **Status-V4 (PLATFORM)** — usado pelo cron de monitoramento.[cite:14][cite:24]

Para detalhes finos (tabelas de endpoints, TTL de cache, exemplos de uso de Data Dragon/CommunityDragon), use:

- [`docs/api/riot-api.md`](docs/api/riot-api.md)[cite:21]

---

## 📂 Documentação por tópico

- **Arquitetura geral e banco Supabase**: `docs/BRLOL-DOCS-UNIFICADO.md`.[cite:13]
- **Camada de API (Next.js routes)**: `docs/api/README.md` e `docs/api/visao-geral.md`.[cite:18][cite:19]
- **Riot API (conceitos, endpoints, assets)**: `docs/api/riot-api.md`.[cite:21]
- **Rate limiting (clientes + Riot)**: `docs/api/rate-limiting.md`.[cite:25]
- **Cron de monitoramento da Riot**: `docs/api/cron-monitoramento.md`.[cite:24]
- **Supabase na API (clients, service role, webhooks)**: `docs/api/supabase.md`.[cite:20]

---

## 🔐 Variáveis de ambiente (resumo)

Veja `docs/api/README.md` e `docs/api/supabase.md` para a tabela completa.[cite:18][cite:20]

Principais variáveis:

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
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
CRON_SECRET=string-aleatoria-grande
```

Regras importantes:

- **Nunca** expor `SUPABASE_SERVICE_ROLE_KEY` ou `RIOT_API_KEY` no frontend (não usar `NEXT_PUBLIC_`).[cite:18][cite:20]
- Definir as mesmas variáveis na Vercel (`Project Settings → Environment Variables`).[cite:18]

---

## 🚀 Desenvolvimento local

Pré‑requisitos: Node.js 18+, conta Supabase, chave Riot API.

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
# (ver docs/BRLOL-DOCS-UNIFICADO.md e supabase/migrations)

# 5. Rodar em desenvolvimento
npm run dev
# http://localhost:3000
```

Scripts principais (padrão Next.js):

- `npm run dev` — servidor de desenvolvimento.
- `npm run build` — build de produção.
- `npm run start` — serve o build.
- `npm run lint` — análise estática.

---

## ☁️ Deploy na Vercel

1. Importar o repositório em [`https://vercel.com/new`](https://vercel.com/new).  
2. Configurar as variáveis de ambiente (Supabase, Riot, app) no painel da Vercel.[cite:18]  
3. Cada push na `main` gera um **Production Deploy**. Pull Requests geram **Preview Deployments**.

Crons (`/api/cron/check-riot-status`) são configurados em `vercel.json` e rodados pela própria Vercel.[cite:24]

---

## 🗺️ Roadmap

Veja os planos de features e fases (3/4) nos documentos de negócio dentro de `docs/`.

Ideias em aberto (alto nível):

- Painel completo de capitão (gerenciar roster, check‑in, convites, disputas).
- UI completa de geração/edição de bracket por fase.
- Notificações em tempo real (WebSocket / Pusher) para atualização de partidas.
- Sistema de ELO interno do BRLOL por torneio e por temporada.
- App mobile (Expo/React Native) consumindo a mesma API.

---

## 📄 Licença

MIT © [Luan](https://github.com/luanscps)
