# API do projeto BRLOL

> Este diretório contém documentação técnica sobre as APIs internas (Next.js API Routes), integração com a Riot e Supabase.
> Para visão geral de arquitetura, banco de dados, fluxos e integrações, use sempre [`../BRLOL-DOCS-UNIFICADO.md`](../BRLOL-DOCS-UNIFICADO.md) como fonte de verdade.

## Como usar estes arquivos

- `riot-api.md` e `rate-limiting.md`: detalhes de chamadas à Riot API, rate limit e estratégias de caching.
- `rotas-api.md`: visão técnica das rotas HTTP internas (útil durante o desenvolvimento do frontend).
- `supabase.md`: notas sobre uso da API do Supabase (RPCs, RLS, etc.).
- `cron-monitoramento.md`, `tournament-stub.md`, `visao-geral.md`: documentos auxiliares/experimentais para agendadores, stubs e visão geral.

Sempre valide qualquer decisão de design com o documento unificado antes de alterar essas APIs.
