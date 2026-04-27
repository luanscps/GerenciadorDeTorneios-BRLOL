# Fases 3 e 4 — Implementação (Frontend/UX)

> Este documento registra o que foi entregue nas **Fases 3 e 4** do roadmap do GerenciadorDeTorneios-BRLOL, com foco em **telas e experiência de uso**.  
> Quando houver referência a tabelas, views ou integrações com a Riot API, consulte o documento de arquitetura: `docs/BRLOL-DOCS-UNIFICADO.md`.

---

## Resumo

As Fases 3 e 4 consolidam:

- gestão visual de partidas e resultados (admin);
- melhoria da experiência de jogadores/capitães (filtros, páginas de stats);
- notificações in-app em tempo real;
- export de dados operacionais (inscrições) para CSV.

Toda a lógica de domínio (seedings, geração de chave, estatísticas persistidas, RLS) está descrita no documento unificado de arquitetura.[^arquitetura]

---

## Fase 3 — Resultados e Gestão de Partidas

### [x] UI para registrar resultado de partida (admin)
- Tela: `app/admin/torneios/[id]/partidas/page.tsx`.
- Componente principal: `components/admin/PartidaResultForm.tsx`.
- Permite ao admin:
  - visualizar a lista de partidas do torneio;
  - informar `score_a`, `score_b` e marcar o vencedor;
  - salvar o resultado e refletir imediatamente na tela.

> A forma exata como o resultado atualiza standings, estatísticas individuais e chaves está documentada na seção de **fluxos de resultado e atualização de standings** em `BRLOL-DOCS-UNIFICADO.md`.

### [x] UI para registrar picks & bans por partida
- Integrada ao `PartidaResultForm.tsx`.
- Interface de seleção de campeões para picks/bans por jogo.
- Consome a lista de campeões e constraints de negócio descritas na seção "Riot Games API — Visão unificada" do documento de arquitetura.

### [x] Validação: não permitir iniciar torneio com menos de 2 times aprovados
- Componente: `components/admin/GenerateBracketButton.tsx`.
- Regra de habilitação do botão:
  - `approvedTeams >= 2` para liberar a geração da chave;
  - quando não atende, o botão fica desabilitado com tooltip explicativa.
- A restrição de negócio (mínimo de times para torneio válido) é a mesma documentada em "Modelo de dados — tournaments" no doc unificado.

### [x] Geração de bracket via botão (integração com Edge Function)
- Ponto de entrada visual: `GenerateBracketButton` na página `app/admin/torneios/[id]/page.tsx`.
- Ação de clique:
  - envia um `POST` para a Edge Function de geração de bracket (vide seção "Edge Functions Supabase" no documento unificado);
  - exibe feedback de sucesso/erro;
  - recarrega a página após sucesso para mostrar a chave criada.

> A lógica de seedings, criação de `matches`/`match_games` e garantias de consistência de dados estão detalhadas apenas no documento de arquitetura — este arquivo registra o comportamento da UI.

---

## Fase 4 — Estatísticas, Filtros e UX

### [x] Filtros na lista de torneios
- Tela: `app/torneios/page.tsx`.
- Filtros disponíveis:
  - status do torneio (draft, open, checkin, ongoing, finished…);
  - tipo de bracket (single, double, round robin, swiss);
  - data.
- Implementados via `searchParams`, preservando links compartilháveis (URL representa o filtro atual).

### [x] Stats de jogadores (winrate, KDA médio, ranking)
- Nova tela de overview: `app/jogadores/page.tsx`.
- Lista jogadores com informações agregadas, como:
  - nome, tag, rota/role;
  - tier, rank, LP;
  - vitórias, derrotas, winrate.
- Funcionalidades de UX:
  - filtros por posição (Top/Jungle/Mid/ADC/Support) e tier;
  - busca por summoner via query `?q=`;
  - links para o perfil individual (`/jogadores/[puuid]`) e página do time (`/times/[id]`).

> As métricas exatas (colunas de views e cálculos de KDA/winrate por torneio ou global) estão na seção de views de leaderboard e estatísticas em `BRLOL-DOCS-UNIFICADO.md`.

### [x] Exportar inscrições para CSV
- Componente: `components/admin/ExportCsvButton.tsx`.
- API utilizada: `app/api/admin/export-inscricoes/route.ts`.
- Integrado à tela `app/admin/torneios/[id]/inscricoes/page.tsx`.
- Experiência para o admin:
  - botão "Exportar CSV" no cabeçalho;
  - separador visual das inscrições por estado (pendente, aprovada, outras);
  - download imediato de um CSV para análise externa.

### [x] Notificações in-app (Realtime)
- Tabela de notificações e Realtime configurados em migration específica (ver seção de notificações no documento unificado).
- Componente visual: `components/layout/NotificationBell.tsx`.
- Integração na `Navbar.tsx`:
  - campainha visível para usuários logados;
  - contagem de notificações não lidas;
  - dropdown com lista recente de eventos (ex.: time aprovado, partida agendada).

### [x] Página `/times/[id]` com roster e histórico
- Tela: `app/times/[id]/page.tsx`.
- Mostra:
  - avatar/logo do time, tag, descrição;
  - winrate agregado;
  - roster completo (jogadores e roles);
  - histórico de partidas do time.

---

## Arquivos criados/modificados (referência rápida)

> Esta tabela é apenas um índice para navegação rápida no código. Regras de domínio e schema não são detalhadas aqui; consulte `BRLOL-DOCS-UNIFICADO.md` quando precisar entender dados e relacionamentos.

| Arquivo | Ação | Função principal |
|---------|------|------------------|
| `components/admin/GenerateBracketButton.tsx` | CRIADO | Botão de geração de bracket com validação visual |
| `app/admin/torneios/[id]/page.tsx` | MODIFICADO | Card de times aprovados + botão de gerar chave |
| `app/admin/torneios/[id]/inscricoes/page.tsx` | MODIFICADO | `ExportCsvButton` + layout melhorado |
| `app/jogadores/page.tsx` | CRIADO | Listagem de jogadores com stats, filtros e busca |
| `components/layout/Navbar.tsx` | MODIFICADO | `NotificationBell` + link `/jogadores` + estados ativos |

---

## Rotas habilitadas (visão de UX)

> Lista de páginas e seu público‑alvo. Para regras exatas de autorização (RLS, `is_admin`, etc.), ver `BRLOL-DOCS-UNIFICADO.md` e `docs/ROTAS-E-PERMISSOES.md`.

| Rota | Descrição | Público |
|------|-----------|---------|
| `/` | Homepage | Público |
| `/torneios` | Lista de torneios com filtros | Público |
| `/torneios/[slug]` | Detalhe do torneio (chave, standings) | Público |
| `/jogadores` | Lista de jogadores com stats agregados | Público |
| `/jogadores/[puuid]` | Perfil detalhado do jogador | Público |
| `/times/[id]` | Detalhe do time + roster + histórico | Público |
| `/ranking` | Ranking geral de jogadores | Público |
| `/dashboard` | Dashboard do usuário logado | Login obrigatório |
| `/profile` | Perfil do usuário | Login obrigatório |
| `/admin` | Painel administrativo | Admin apenas |
| `/admin/torneios/[id]` | Gerenciar torneio | Admin apenas |
| `/admin/torneios/[id]/inscricoes` | Gerenciar inscrições + export CSV | Admin apenas |
| `/admin/torneios/[id]/partidas` | Gerenciar partidas + resultados | Admin apenas |
| `/admin/usuarios` | Gerenciar usuários | Admin apenas |
| `/admin/audit` | Logs de auditoria | Admin apenas |
| `/admin/jogadores` | Gerenciar jogadores | Admin apenas |

---

## Próximos passos sugeridos (Fase 5+)

Os itens abaixo são sugestões de evolução de UX/Frontend, assumindo que o domínio e o banco permanecem alinhados ao documento unificado.

- [ ] Tornar a geração de bracket mais visual (pré‑visualização da chave antes de confirmar).
- [ ] Exibir KDA médio e estatísticas avançadas direto na página de jogadores (reaproveitando as views já descritas em `BRLOL-DOCS-UNIFICADO.md`).
- [ ] Sistema de notificações contextuais por evento (inscrição aprovada, partida marcada, resultado alterado).
- [ ] Paginação e ordenação avançada na listagem de jogadores e torneios.
- [ ] Melhorar responsividade para telas menores (mobile‑first nas páginas mais acessadas).
- [ ] Adicionar testes de UI (Playwright) para fluxos críticos de admin (gerar chave, registrar resultados, exportar CSV).

---

[^arquitetura]: `docs/BRLOL-DOCS-UNIFICADO.md` é a fonte de verdade para modelo de dados, RLS, Edge Functions e integrações com a Riot API. Este arquivo evita duplicar essas informações e registra apenas o que é relevante para UX/frontend.
