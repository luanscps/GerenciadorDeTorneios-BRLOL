# 🚀 Server Actions — GerenciadorDeTorneios-BRLOL

Este documento detalha as Server Actions implementadas no projeto, localizadas em [`lib/actions/`](lib/actions/). Cada ação é projetada para realizar operações de mutação de dados de forma segura e eficiente no lado do servidor, seguindo os padrões do Next.js App Router e Supabase.

---

## Padrões Comuns

-   Todas as Server Actions começam com `'use server'`.
-   A autenticação é verificada no início de cada ação usando `createClient()` do Supabase server.
-   A validação de entrada é feita com **Zod** (schemas em [`lib/validations/index.ts`](lib/validations/index.ts)).
-   Erros são retornados como `{ error: string }` e sucessos como `{ success: true }` (ou com dados adicionais).
-   `revalidatePath()` ou `revalidateTag()` são usados após mutações para garantir a atualização da UI.

---

## Ações Detalhadas

### [`fase.ts`](lib/actions/fase.ts)

#### `createFase(tournamentId: string, formData: FormData)`

*   **Descrição**: Cria uma nova fase para um torneio.
*   **Autenticação**: Requer que o usuário seja administrador ou organizador do torneio.
*   **Validação**: Usa `FaseSchema` (Zod).
*   **Parâmetros**:
    *   `tournamentId`: ID do torneio.
    *   `formData`: Dados do formulário contendo `nome`, `tipo`, `ordem`, `num_grupos`, `times_por_grupo`, `classificados_por_grupo`, `melhor_de`.
*   **Retorno**: `{ success: true, data: Fase } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/organizador/torneios/${tournamentId}/fases`)`

#### `updateFase(faseId: string, tournamentId: string, formData: FormData)`

*   **Descrição**: Atualiza uma fase existente de um torneio.
*   **Autenticação**: Requer que o usuário seja administrador ou organizador do torneio.
*   **Validação**: Usa `FaseSchema` (Zod).
*   **Parâmetros**:
    *   `faseId`: ID da fase a ser atualizada.
    *   `tournamentId`: ID do torneio.
    *   `formData`: Dados do formulário contendo `nome`, `tipo`, `ordem`, `num_grupos`, `times_por_grupo`, `classificados_por_grupo`, `melhor_de`.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/organizador/torneios/${tournamentId}/fases`)`

#### `deleteFase(faseId: string, tournamentId: string)`

*   **Descrição**: Exclui uma fase de um torneio. Bloqueia a exclusão se a fase já estiver em andamento ou finalizada.
*   **Autenticação**: Requer que o usuário seja administrador ou organizador do torneio.
*   **Validação**: Nenhuma validação de schema Zod direta, mas verifica o status da fase.
*   **Parâmetros**:
    *   `faseId`: ID da fase a ser excluída.
    *   `tournamentId`: ID do torneio.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/organizador/torneios/${tournamentId}/fases`)`

#### `getFasesByTorneio(tournamentId: string)`

*   **Descrição**: Lista todas as fases de um torneio.
*   **Autenticação**: Nenhuma (leitura pública).
*   **Validação**: Nenhuma.
*   **Parâmetros**:
    *   `tournamentId`: ID do torneio.
*   **Retorno**: `{ data: Fase[] | null, error: string | null }`
*   **Revalidação de Cache**: Nenhuma.

#### `ativarFase(faseId: string, tournamentId: string)`

*   **Descrição**: Ativa uma fase de um torneio, finalizando a fase anterior se houver.
*   **Autenticação**: Requer que o usuário seja administrador ou organizador do torneio.
*   **Validação**: Nenhuma.
*   **Parâmetros**:
    *   `faseId`: ID da fase a ser ativada.
    *   `tournamentId`: ID do torneio.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/organizador/torneios/${tournamentId}/fases`)`, `revalidatePath(`/torneios`)`

### [`ingest-match.ts`](lib/actions/ingest-match.ts)

Este arquivo contém funções internas para o processo de ingestão de dados de partidas da Riot API, geralmente chamadas por Route Handlers ou cron jobs. Elas usam o cliente `createAdminClient()` para acesso com `service_role_key`.

#### `processMatchResult(tournamentCode: string, gameId: number)`

*   **Descrição**: Busca e normaliza os dados brutos de um resultado de partida da tabela `tournament_match_results`.
*   **Autenticação**: Usa `createAdminClient()` (acesso de serviço).
*   **Validação**: Verifica a existência e o status de processamento do registro.
*   **Parâmetros**:
    *   `tournamentCode`: Código do torneio da Riot.
    *   `gameId`: ID do jogo da Riot.
*   **Retorno**: `{ success: true, data: NormalizedMatchData } | { success: false, error: string }`
*   **Revalidação de Cache**: Nenhuma.

#### `fetchAndResolveMatch(tournamentCode: string, gameId: number)`

*   **Descrição**: Busca detalhes da partida na Riot API e resolve o ID da partida interna no Supabase.
*   **Autenticação**: Usa `createAdminClient()` (acesso de serviço).
*   **Validação**: Nenhuma.
*   **Parâmetros**:
    *   `tournamentCode`: Código do torneio da Riot.
    *   `gameId`: ID do jogo da Riot.
*   **Retorno**: `{ success: true, data: ResolvedMatchData } | { success: false, error: string }`
*   **Revalidação de Cache**: Nenhuma.

#### `persistMatchGame(tournamentCode: string, gameId: number)`

*   **Descrição**: Persiste os dados de um jogo individual na tabela `match_games`.
*   **Autenticação**: Usa `createAdminClient()` (acesso de serviço).
*   **Validação**: Verifica se o registro já existe para idempotência.
*   **Parâmetros**:
    *   `tournamentCode`: Código do torneio da Riot.
    *   `gameId`: ID do jogo da Riot.
*   **Retorno**: `{ success: true, data: { matchGameId: string } } | { success: false, error: string }`
*   **Revalidação de Cache**: Nenhuma.

#### `persistPlayerStats(tournamentCode: string, gameId: number)`

*   **Descrição**: Persiste as estatísticas de cada jogador na tabela `player_stats` para um jogo.
*   **Autenticação**: Usa `createAdminClient()` (acesso de serviço).
*   **Validação**: Verifica a existência do jogador interno e a idempotência dos stats.
*   **Parâmetros**:
    *   `tournamentCode`: Código do torneio da Riot.
    *   `gameId`: ID do jogo da Riot.
*   **Retorno**: `{ success: true, data: { inserted: number, skipped: number, unresolvedPlayers: string[] } } | { success: false, error: string }`
*   **Revalidação de Cache**: Nenhuma.

#### `finalizeMatchIngestion(tournamentCode: string, gameId: number)`

*   **Descrição**: Orquestra o processo completo de ingestão de uma partida, marcando-a como processada e atualizando o status da partida principal.
*   **Autenticação**: Usa `createAdminClient()` (acesso de serviço).
*   **Validação**: Nenhuma.
*   **Parâmetros**:
    *   `tournamentCode`: Código do torneio da Riot.
    *   `gameId`: ID do jogo da Riot.
*   **Retorno**: `{ success: true, data: { localMatchId: string, matchGameId: string } } | { success: false, error: string }`
*   **Revalidação de Cache**: Nenhuma.

### [`inscricao.ts`](lib/actions/inscricao.ts)

#### `aprovarInscricao(teamId: string, tournamentId: string)`

*   **Descrição**: Aprova a inscrição de um time em um torneio (ação de administrador).
*   **Autenticação**: Requer que o usuário seja administrador.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `teamId`: ID do time.
    *   `tournamentId`: ID do torneio.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/admin/tournaments/${tournamentId}/inscricoes`)`, `revalidatePath(`/admin/tournaments/${tournamentId}`)`

#### `rejeitarInscricao(teamId: string, tournamentId: string, notes: string)`

*   **Descrição**: Rejeita a inscrição de um time em um torneio (ação de administrador).
*   **Autenticação**: Requer que o usuário seja administrador.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `teamId`: ID do time.
    *   `tournamentId`: ID do torneio.
    *   `notes`: Notas da rejeição.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/admin/tournaments/${tournamentId}/inscricoes`)`, `revalidatePath(`/admin/tournaments/${tournamentId}`)`

#### `desfazerCheckin(inscricaoId: string)`

*   **Descrição**: Desfaz o check-in de uma inscrição (ação de administrador).
*   **Autenticação**: Requer que o usuário seja administrador.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `inscricaoId`: ID da inscrição.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/admin/tournaments/${insc.tournament_id}/checkin`)`, `revalidatePath(`/admin/tournaments/${insc.tournament_id}`)`

#### `criarInscricao(teamId: string, tournamentId: string)`

*   **Descrição**: Cria uma nova inscrição para um time em um torneio (ação de capitão).
*   **Autenticação**: Requer que o usuário esteja autenticado.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `teamId`: ID do time.
    *   `tournamentId`: ID do torneio.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath('/dashboard')`, `revalidatePath(`/torneios/${tournamentId}`)`

#### `inscreverTime(tournamentId: string, teamId: string)`

*   **Descrição**: Alias para `criarInscricao`.
*   **Autenticação**: Requer que o usuário esteja autenticado.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `tournamentId`: ID do torneio.
    *   `teamId`: ID do time.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath('/dashboard')`, `revalidatePath(`/torneios/${tournamentId}`)`

#### `fazerCheckin(inscricaoId: string)`

*   **Descrição**: Realiza o check-in de uma inscrição (ação de capitão).
*   **Autenticação**: Requer que o usuário esteja autenticado e seja o capitão do time.
*   **Validação**: Verifica se a inscrição está aprovada.
*   **Parâmetros**:
    *   `inscricaoId`: ID da inscrição.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath('/dashboard')`, `revalidatePath(`/dashboard/times/${insc.team_id}`)`, `revalidatePath(`/dashboard/times/${insc.team_id}/checkin`)`

#### `listarInscricoesPorTorneio(tournamentId: string)`

*   **Descrição**: Lista as inscrições de um torneio, incluindo detalhes do time e jogadores.
*   **Autenticação**: Requer que o usuário esteja autenticado.
*   **Validação**: Nenhuma.
*   **Parâmetros**:
    *   `tournamentId`: ID do torneio.
*   **Retorno**: `{ data: Inscricao[] | null, error: string | null }`
*   **Revalidação de Cache**: Nenhuma.

### [`partida.ts`](lib/actions/partida.ts)

#### `editarResultadoPartida(matchDbId: string, tournamentId: string, formData: FormData)`

*   **Descrição**: Atualiza o resultado de uma partida, incluindo o vencedor, placar e, opcionalmente, picks/bans. Avança o vencedor no chaveamento.
*   **Autenticação**: Requer que o usuário seja administrador ou organizador do torneio.
*   **Validação**: Usa `ResultSchema` (Zod).
*   **Parâmetros**:
    *   `matchDbId`: ID da partida no banco de dados.
    *   `tournamentId`: ID do torneio.
    *   `formData`: Dados do formulário contendo `winner_team_id`, `score_a`, `score_b`, `match_id_riot`, `picks_bans`.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/admin/torneios/${slug}/partidas`)`, `revalidatePath(`/torneios/${slug}/bracket`)`, `revalidatePath(`/torneios/${slug}`)`, `revalidatePath(`/torneios`)`

#### `createPartida(tournamentId: string, formData: FormData)`

*   **Descrição**: Cria uma nova partida para um torneio.
*   **Autenticação**: Requer que o usuário seja administrador ou organizador do torneio.
*   **Validação**: Usa `CreatePartidaSchema` (Zod).
*   **Parâmetros**:
    *   `tournamentId`: ID do torneio.
    *   `formData`: Dados do formulário contendo `team_a_id`, `team_b_id`, `round`, `match_number`, `scheduled_at`, `fase_id`, `best_of`.
*   **Retorno**: `{ success: true, data: Match } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/admin/torneios/${slug}/partidas`)`

#### `deletePartida(matchId: string, tournamentId: string)`

*   **Descrição**: Exclui uma partida de um torneio. Bloqueia a exclusão se a partida já estiver finalizada.
*   **Autenticação**: Requer que o usuário seja administrador ou organizador do torneio.
*   **Validação**: Nenhuma validação de schema Zod direta, mas verifica o status da partida.
*   **Parâmetros**:
    *   `matchId`: ID da partida a ser excluída.
    *   `tournamentId`: ID do torneio.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/admin/torneios/${slug}/partidas`)`

#### `getPartidasByTorneio(tournamentId: string)`

*   **Descrição**: Lista todas as partidas de um torneio, incluindo detalhes dos times e vencedor.
*   **Autenticação**: Nenhuma (leitura pública).
*   **Validação**: Nenhuma.
*   **Parâmetros**:
    *   `tournamentId`: ID do torneio.
*   **Retorno**: `{ data: Match[] | null, error: string | null }`
*   **Revalidação de Cache**: Nenhuma.

#### `gerarChaveamento(tournamentId: string, faseId?: string)`

*   **Descrição**: Gera o chaveamento inicial para um torneio com base nos times aprovados, usando um algoritmo de randomização simples.
*   **Autenticação**: Requer que o usuário seja administrador ou organizador do torneio.
*   **Validação**: Verifica se há pelo menos 2 times aprovados.
*   **Parâmetros**:
    *   `tournamentId`: ID do torneio.
    *   `faseId`: (Opcional) ID da fase para a qual o chaveamento será gerado.
*   **Retorno**: `{ success: true, data: Match[] } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/admin/torneios/${slug}/partidas`)`, `revalidatePath(`/torneios/${slug}/bracket`)`, `revalidatePath(`/torneios`)`

### [`roster.ts`](lib/actions/roster.ts)

#### `enviarConvite(params: { teamId: string; summonerName: string; tagline: string; role: string; })`

*   **Descrição**: Envia um convite para um jogador se juntar a um time.
*   **Autenticação**: Requer que o usuário seja o capitão (owner) do time.
*   **Validação**: Verifica vagas no time (máx. 5 jogadores) e se já existe um convite pendente.
*   **Parâmetros**:
    *   `teamId`: ID do time.
    *   `summonerName`: Nome de invocador do jogador (sem tag).
    *   `tagline`: Tag do jogador (ex: "BR1").
    *   `role`: Função do jogador no time (ex: "TOP", "JUNGLE").
*   **Retorno**: `{ success: true, inviteId: string } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/dashboard/times/${params.teamId}/roster`)`

#### `cancelarConvite(inviteId: string, teamId: string)`

*   **Descrição**: Cancela um convite pendente para um jogador.
*   **Autenticação**: Requer que o usuário seja o capitão (owner) do time.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `inviteId`: ID do convite a ser cancelado.
    *   `teamId`: ID do time.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/dashboard/times/${teamId}/roster`)`

#### `removerJogador(playerId: string, teamId: string)`

*   **Descrição**: Remove um jogador de um time (desvincula o jogador do time, não o deleta).
*   **Autenticação**: Requer que o usuário seja o capitão (owner) do time.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `playerId`: ID do jogador a ser removido.
    *   `teamId`: ID do time.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath(`/dashboard/times/${teamId}/roster`)`, `revalidatePath(`/dashboard/times/${teamId}`)`

#### `listarConvitesEnviados(teamId: string)`

*   **Descrição**: Lista os convites enviados por um time.
*   **Autenticação**: Requer que o usuário esteja autenticado.
*   **Validação**: Nenhuma.
*   **Parâmetros**:
    *   `teamId`: ID do time.
*   **Retorno**: `{ data: TeamInvite[] | null, error: string | null }`
*   **Revalidação de Cache**: Nenhuma.

### [`team_invite.ts`](lib/actions/team_invite.ts)

#### `aceitarConvite(inviteId: string)`

*   **Descrição**: Aceita um convite de time, adicionando o jogador à tabela `team_members`.
*   **Autenticação**: Requer que o usuário esteja autenticado.
*   **Validação**: Verifica se o convite existe, está pendente e não expirou.
*   **Parâmetros**:
    *   `inviteId`: ID do convite a ser aceito.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath("/dashboard")`, `revalidatePath(`/dashboard/times/${invite.team_id}`)`

#### `recusarConvite(inviteId: string)`

*   **Descrição**: Recusa um convite de time.
*   **Autenticação**: Requer que o usuário esteja autenticado.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `inviteId`: ID do convite a ser recusado.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath("/dashboard")`

#### `listarConvitesPendentes()`

*   **Descrição**: Lista os convites pendentes para o usuário autenticado, cruzando com o `riot_game_name` e `riot_tagline` do perfil.
*   **Autenticação**: Requer que o usuário esteja autenticado e tenha um `riot_game_name` no perfil.
*   **Validação**: Nenhuma.
*   **Parâmetros**: Nenhum.
*   **Retorno**: `{ data: TeamInvite[] | null, error: string | null }`
*   **Revalidação de Cache**: Nenhuma.

### [`tournament.ts`](lib/actions/tournament.ts)

#### `createTournament(formData: FormData)`

*   **Descrição**: Cria um novo torneio.
*   **Autenticação**: Requer que o usuário seja administrador.
*   **Validação**: Usa `TournamentSchema` (Zod).
*   **Parâmetros**:
    *   `formData`: Dados do formulário contendo `name`, `slug`, `description`, `max_teams`, `start_date`, `status`.
*   **Retorno**: `{ id: string, slug: string } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath("/admin/torneios")`

#### `updateTournament(id: string, formData: FormData)`

*   **Descrição**: Atualiza um torneio existente.
*   **Autenticação**: Requer que o usuário seja administrador.
*   **Validação**: Usa `TournamentSchema` (Zod).
*   **Parâmetros**:
    *   `id`: ID do torneio a ser atualizado.
    *   `formData`: Dados do formulário contendo `name`, `slug`, `description`, `max_teams`, `start_date`, `status`.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath("/admin/torneios")`, `revalidatePath("/admin/torneios/" + id)`

#### `deleteTournament(id: string)`

*   **Descrição**: Exclui um torneio.
*   **Autenticação**: Requer que o usuário seja administrador.
*   **Validação**: Nenhuma validação de schema Zod direta.
*   **Parâmetros**:
    *   `id`: ID do torneio a ser excluído.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath("/admin/torneios")`

### [`usuario.ts`](lib/actions/usuario.ts)

#### `toggleAdmin(targetUserId: string, value: boolean)`

*   **Descrição**: Alterna o status de administrador de um usuário.
*   **Autenticação**: Requer que o usuário seja administrador.
*   **Validação**: Impede que um administrador altere seu próprio status.
*   **Parâmetros**:
    *   `targetUserId`: ID do usuário alvo.
    *   `value`: `true` para tornar admin, `false` para remover.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath("/admin/usuarios")`

#### `toggleBan(targetUserId: string, value: boolean)`

*   **Descrição**: Alterna o status de banimento de um usuário.
*   **Autenticação**: Requer que o usuário seja administrador.
*   **Validação**: Impede que um administrador se banir.
*   **Parâmetros**:
    *   `targetUserId`: ID do usuário alvo.
    *   `value`: `true` para banir, `false` para desbanir.
*   **Retorno**: `{ success: true } | { error: string }`
*   **Revalidação de Cache**: `revalidatePath("/admin/usuarios")`
