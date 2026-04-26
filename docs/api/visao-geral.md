# Visão Geral da Arquitetura

## Stack tecnológico

| Camada | Tecnologia | Versão |
|---|---|---|
| Framework | Next.js (App Router) | 14+ |
| Deploy | Vercel | — |
| Banco de dados | Supabase (PostgreSQL) | — |
| Autenticação | Supabase Auth | — |
| API externa | Riot Games API | v5 |
| Linguagem | TypeScript | 5+ |
| Estilo | Tailwind CSS | 3+ |

---

## Estrutura de pastas relevante

```
GerenciadorDeTorneios-BRLOL/
│
├── app/
│   └── api/
│       ├── admin/              ← Rotas administrativas
│       ├── auth/               ← Autenticação Supabase
│       ├── jogadores/          ← CRUD de jogadores
│       ├── player/             ← Perfil de jogador
│       ├── profile/            ← Dados de perfil
│       └── riot/
│           ├── match/          ← Detalhes de partida
│           ├── matches/        ← Histórico de partidas
│           ├── summoner/       ← Dados do invocador
│           └── tournament/
│               ├── route.ts        ← Setup de torneio
│               ├── codes/          ← Tournament codes
│               ├── events/         ← Lobby events (polling)
│               └── callback/       ← Webhook Riot → Supabase
│
├── lib/
│   ├── riot.ts                 ← Cliente geral da Riot API
│   ├── riot-rate-limiter.ts    ← Rate limiting 3 camadas
│   ├── riot-tournament.ts      ← Cliente tournament-stub-v5
│   ├── riot-cache.ts           ← Cache TTL em memória
│   ├── rate-limit.ts           ← Rate limit por IP (clientes)
│   └── supabase/               ← Clientes Supabase (server/client)
│
├── app/api/cron/
│   └── check-riot-status/      ← Monitor semanal
│
├── vercel.json                 ← Configuração de crons
└── docs/api/                   ← Esta documentação
```

---

## Fluxo de autenticação e autorização

Todas as rotas que alteram dados (POST, PUT) verificam se o usuário tem `role = "admin"` na tabela `profiles` do Supabase. O padrão de verificação usado é:

```typescript
async function isAdmin(): Promise<boolean> {
  const supabase = createServerClient(...);
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;
  const { data } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  return data?.role === "admin";
}
```

Rotas públicas (GET sem autenticação): consulta de summoner, matches, status de torneio.  
Rotas protegidas (requer `admin`): criar torneio, gerar codes, configurar provider.

---

## Ciclo de vida de um deploy

1. Push para `main` → Vercel detecta automaticamente
2. Vercel executa `next build`
3. Deploy em edge CDN global
4. Variáveis de ambiente injetadas no servidor (nunca no cliente)
5. Cron jobs ativados conforme `vercel.json`
