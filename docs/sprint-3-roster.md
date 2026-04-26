# Sprint 3 — Sistema de Roster & Convites

> Entregue em: 26/04/2026

## Arquivos criados nesta sprint

### Backend / Actions

| Arquivo | Conteúdo |
|---|---|
| `lib/actions/roster.ts` | `enviarConvite`, `cancelarConvite`, `removerJogador`, `listarConvitesEnviados` |
| `lib/actions/team_invite.ts` | `aceitarConvite`, `recusarConvite`, `listarConvitesPendentes` (pré-existente, mantido) |

### API Routes

| Rota | Método | Descrição |
|---|---|---|
| `/api/jogadores/buscar` | GET | Busca jogadores por `?q=Nome#TAG`, retorna até 10 resultados. Requer auth. |

### UI Components

| Arquivo | Tipo | Descrição |
|---|---|---|
| `components/times/InvitePlayerForm.tsx` | Client Component | Busca nick → seleciona → escolhe role → envia convite |
| `app/dashboard/times/[id]/roster/page.tsx` | Client Page | Roster do time: slots 5x, convites pendentes, histórico |
| `app/dashboard/convites/page.tsx` | Client Page | Inbox do jogador: aceitar/recusar convites com UX loading |

## Fluxo completo

```
Capitão (roster/page.tsx)
  └─ InvitePlayerForm → /api/jogadores/buscar → enviarConvite()
        └─ team_invites (status: PENDING, expires_at: +48h)

Jogador (convites/page.tsx)
  └─ listarConvitesPendentes() → cards aceitar/recusar
        ├─ aceitarConvite() → status: ACCEPTED + upsert team_members
        └─ recusarConvite() → status: REJECTED
```

## Commits não catalogados (Luan, 26/04/2026)

### `8271a97` — Riot Rate Limiter + Tournament Stub v5

- `lib/riot-rate-limiter.ts`: rate limiting em memória (application + method + service layers), sliding window, retry automático
- `lib/riot-tournament.ts`: cliente completo `tournament-stub-v5` — providers, tournaments, codes, lobbies, events
- `app/api/riot/tournament/route.ts`: endpoint REST para torneios
- `app/api/riot/tournament/codes/route.ts`: geração e consulta de tournament codes
- `app/api/riot/tournament/events/route.ts`: polling de eventos de lobby
- `app/api/cron/check-riot-status/route.ts`: cron semanal de monitoramento da Riot API BR1

### `7b49f21` — Documentação técnica `docs/api/`

| Arquivo | Cobertura |
|---|---|
| `docs/api/README.md` | Índice geral + diagrama de arquitetura |
| `docs/api/visao-geral.md` | Stack, estrutura de pastas, auth |
| `docs/api/riot-api.md` | Endpoints, roteamento, Data Dragon, fluxo de jogador |
| `docs/api/rate-limiting.md` | 3 camadas, sliding window, classes de erro |
| `docs/api/tournament-stub.md` | Fluxo completo, codes, webhook callback |
| `docs/api/rotas-api.md` | Referência REST completa de todas as rotas |
| `docs/api/supabase.md` | Tabelas, clientes, variáveis de ambiente |
| `docs/api/cron-monitoramento.md` | Cron Vercel, Discord, deprecação |

## Próximos passos sugeridos

- [ ] Badge de contador de convites pendentes no header/navbar
- [ ] Notificação Realtime via Supabase (channel `team_invites`) no inbox
- [ ] Validação de nick via Riot API antes de enviar convite
- [ ] Página `app/dashboard/times/[id]/page.tsx` exibir link para `/roster`
