# Cron — Monitoramento da Riot API

## Configuração no Vercel

O arquivo `vercel.json` na raiz do projeto configura o cron job:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-riot-status",
      "schedule": "0 12 * * 1"
    }
  ]
}
```

| Campo | Valor | Significado |
|---|---|---|
| `path` | `/api/cron/check-riot-status` | Rota chamada automaticamente |
| `schedule` | `0 12 * * 1` | Toda **segunda-feira às 12:00 UTC** (09:00 BRT) |

---

## O que o cron verifica

O cron chama `GET /lol/status/v4/platform-data` na Riot API BR1 e verifica:

1. **Incidentes ativos** — problemas não planejados que afetam o serviço
2. **Manutenções ativas** — janelas planejadas de downtime

Se qualquer um dos dois tiver registros, uma notificação é enviada para o Discord.

---

## Notificação Discord

Configure a variável `DISCORD_WEBHOOK_URL` com a URL do webhook do canal desejado. Exemplo de mensagem enviada:

```
⚠️ Riot API BR1 — Problemas Detectados
🔴 [Incidente] Problemas de login (severidade: warning)
🔧 [Manutenção] Manutenção de emergência (status: in_progress)
Verificado em: 26/04/2026 09:00:00
```

---

## Segurança do cron

A Vercel injeta automaticamente o header `Authorization: Bearer {CRON_SECRET}` nas chamadas de cron em produção. Configure a variável `CRON_SECRET` com qualquer string aleatória (mínimo 32 caracteres recomendado).

Para chamadas manuais (testes):

```bash
curl -H "Authorization: Bearer {CRON_SECRET}" \
  https://gerenciador-de-torneios-brlol.vercel.app/api/cron/check-riot-status
```

---

## Deprecação de APIs

A Riot anuncia deprecações com **60 dias de antecedência**. Ao receber aviso:

1. Identifique qual `lib/riot.ts` ou `lib/riot-tournament.ts` usa o endpoint
2. Atualize para o endpoint substituto indicado pela Riot
3. Atualize o `methodKey` correspondente em `lib/riot-rate-limiter.ts`
4. Teste localmente antes do prazo de 60 dias
