# 📚 Documentação do GerenciadorDeTorneios-BRLOL

Este diretório concentra toda a documentação do projeto.

A ideia é:
- ter **um documento unificado** como fonte de verdade de arquitetura e domínio;
- ter documentos auxiliares focados em API, fluxos, roadmap e operação;
- evitar informações duplicadas que possam divergir do código e do banco real.

---

## 1. Documento unificado (fonte de verdade)

- [`BRLOL-DOCS-UNIFICADO.md`](./BRLOL-DOCS-UNIFICADO.md)
  - Visão geral da arquitetura (Next.js, Supabase, Riot API, Edge Functions).
  - Modelo de dados completo do Supabase (tabelas, enums, FKs, RLS, views, funções).
  - Riot Games API — visão unificada (quais endpoints são usados e como).
  - Edge Functions Supabase (bracket-generator, send-email, riot-api-sync, discord-webhook).
  - Fluxos principais de negócio (inscrição, seedings, chaveamento, resultados, leaderboards).

> Se você está chegando agora no projeto, **sempre comece por aqui**.

---

## 2. Documentos de API (Next.js routes, Supabase client, cron, rate limit)

- [`api/README.md`](./api/README.md)
  - Índice da documentação de API.
  - Links para as demais páginas desta pasta.

- [`api/visao-geral.md`](./api/visao-geral.md)
  - Arquitetura da camada de API do Next.js (rotas em `app/api/*`).
  - Estrutura de pastas relevantes e padrão de autenticação/autorização nas rotas.

- [`api/riot-api.md`](./api/riot-api.md)
  - Como a Riot API funciona (regions/hosts, keys, códigos HTTP).
  - Endpoints integrados, TTL de cache, uso de Data Dragon/CommunityDragon.

- [`api/rate-limiting.md`](./api/rate-limiting.md)
  - Rate limiting por IP (clientes) e para a Riot API.
  - Estrutura das três subcamadas (application/method/service) e algoritmo de sliding window.

- [`api/cron-monitoramento.md`](./api/cron-monitoramento.md)
  - Cron job de monitoramento da Riot API.
  - Configuração em `vercel.json`, uso de `CRON_SECRET` e webhook Discord.

- [`api/supabase.md`](./api/supabase.md)
  - Como os clients Supabase são usados na API (browser/server/service-role).
  - Variáveis de ambiente relacionadas e uso em webhooks/rotas de serviço.

---

## 3. Fluxos, fases e roadmap

- [`FLUXOS.md`](./FLUXOS.md)
  - Fluxos funcionais principais (criar torneio, inscrever time, aprovar/rejeitar, gerar chave, registrar resultado, notificações, cron de Riot).
  - Focado em **UX/comportamento**; detalhes de banco/Riot estão no documento unificado.

- [`FASE3-4-IMPLEMENTACAO.md`](./FASE3-4-IMPLEMENTACAO.md)
  - O que foi entregue nas Fases 3 e 4 do roadmap.
  - Foco em Frontend/UX (telas, componentes, rotas) de resultados, stats, notificações e CSV.

- [`PROXIMOS-PASSOS.md`](./PROXIMOS-PASSOS.md)
  - Backlog de alto nível (alta/média/baixa prioridade).
  - Sprint 3 (roster/convites) e histórico de itens concluídos.

---

## 4. Outros documentos úteis

- [`CODE-REVIEW-ANALYSIS.md`](./CODE-REVIEW-ANALYSIS.md)
  - Análises anteriores de code review e decisões técnicas.

- [`DEMO-DATA.md`](./DEMO-DATA.md)
  - Ideias e exemplos de dados de demonstração (úteis para staging/dev).

- [`PLANO-DE-TESTES.md`](./PLANO-DE-TESTES.md)
  - Estratégia e checklist de testes.

- [`ROTAS-E-PERMISSOES.md`](./ROTAS-E-PERMISSOES.md)
  - Visão geral de rotas e níveis de permissão.

- [`TROUBLESHOOTING.md`](./TROUBLESHOOTING.md)
  - Problemas comuns e como diagnosticar/corrigir.

- [`deploy.md`](./deploy.md)
  - Detalhes mais baixos de deploy além do README raiz (quando necessário).

- [`sprint-3-roster.md`](./sprint-3-roster.md)
  - Detalhamento específico da sprint focada em roster/convites.

---

## 5. Stubs (documentos apenas de redirecionamento)

Os arquivos abaixo existem somente para facilitar buscas por termos comuns e redirecionar para o documento unificado:

- [`BANCO-DE-DADOS.md`](./BANCO-DE-DADOS.md)
- [`ARQUITETURA-ATUAL.md`](./ARQUITETURA-ATUAL.md)
- [`arquitetura.md`](./arquitetura.md)

Sempre que precisar alterar algo de **arquitetura** ou **modelo de dados**, edite o `BRLOL-DOCS-UNIFICADO.md`.

---

## 6. Onde começar (onboarding de novos devs)

Sugestão de ordem de leitura para quem está entrando no projeto:

1. `docs/BRLOL-DOCS-UNIFICADO.md` — visão completa de arquitetura e domínio.
2. `docs/api/README.md` + `docs/api/visao-geral.md` — como a camada de API está organizada.
3. `docs/api/riot-api.md` — entender bem a integração com a Riot.
4. `docs/FLUXOS.md` — fluxos funcionais do ponto de vista do usuário.
5. `docs/FASE3-4-IMPLEMENTACAO.md` + `docs/PROXIMOS-PASSOS.md` — contexto de onde o projeto está e para onde vai.

Depois disso, use este `docs/README.md` como mapa para encontrar o arquivo certo sempre que tiver dúvida.
