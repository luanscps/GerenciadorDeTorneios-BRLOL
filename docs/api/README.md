# Documentação da API — BRLOL Gerenciador de Torneios

> **Versão:** 2.0.0 · **Atualizado em:** Abril 2026  
> **Repositório:** [luanscps/GerenciadorDeTorneios-BRLOL](https://github.com/luanscps/GerenciadorDeTorneios-BRLOL)  
> **Deploy:** [gerenciador-de-torneios-brlol.vercel.app](https://gerenciador-de-torneios-brlol.vercel.app)

---

## Índice

| Documento | Descrição |
|---|---|
| [visao-geral.md](./visao-geral.md) | Arquitetura geral, stack, variáveis de ambiente |
| [riot-api.md](./riot-api.md) | Como a Riot API funciona, endpoints disponíveis, limites |
| [rate-limiting.md](./rate-limiting.md) | Sistema de rate limiting — 3 camadas, implementação |
| [tournament-stub.md](./tournament-stub.md) | tournament-stub-v5: fluxo completo, codes, eventos |
| [rotas-api.md](./rotas-api.md) | Referência de todos os endpoints REST do projeto |
| [supabase.md](./supabase.md) | Tabelas do banco, webhook callback, autenticação |
| [cron-monitoramento.md](./cron-monitoramento.md) | Cron de status da Riot API, notificação Discord |

---

## Visão rápida do sistema

```
Browser / Admin
     │
     ▼
Next.js App Router (Vercel)
     │
     ├── /app/api/riot/summoner           → Busca dados de jogador
     ├── /app/api/riot/tournament         → Gerencia torneios (stub-v5)
     ├── /app/api/riot/tournament/codes   → Gera/consulta tournament codes
     ├── /app/api/riot/tournament/events  → Polling de lobby em tempo real
     ├── /app/api/riot/tournament/callback → Webhook resultado de partida
     └── /app/api/cron/check-riot-status  → Monitor semanal
     │
     ├── lib/riot-rate-limiter.ts     → Rate limiting 3 camadas (in-memory)
     ├── lib/riot-tournament.ts       → Cliente tournament-stub-v5
     ├── lib/riot.ts                  → Cliente geral (summoner, league, match)
     └── lib/riot-cache.ts            → Cache em memória (TTL por endpoint)
     │
     ▼
┌─────────────────┐     ┌──────────────────────────┐
│  Riot Games API │     │  Supabase (PostgreSQL)    │
│  br1.api...     │     │  profiles, torneios,      │
│  americas.api...│     │  tournament_match_results │
└─────────────────┘     └──────────────────────────┘
```

---

## Requisitos de configuração

Variáveis de ambiente obrigatórias no Vercel Dashboard (`Settings → Environment Variables`):

```bash
# Riot Games
RIOT_API_KEY=RGAPI-xxxx-xxxx-xxxx   # NÃO use NEXT_PUBLIC_ — servidor apenas
RIOT_REGION=br1                      # opcional, padrão: br1

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...     # para o webhook callback

# Opcionais
NEXT_PUBLIC_APP_URL=https://gerenciador-de-torneios-brlol.vercel.app
DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/...
CRON_SECRET=string-aleatoria-segura
```

> ⚠️ **NUNCA** prefixe `RIOT_API_KEY` com `NEXT_PUBLIC_`. Isso exporia a chave no bundle do cliente JavaScript.
