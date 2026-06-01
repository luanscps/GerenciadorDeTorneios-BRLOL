# Server Actions — ArenaGG (GerenciadorDeTorneios-BRLOL)

> **Fonte de verdade:** `lib/actions/*.ts`  
> Última revisão: 2026-06-01 (corrigido após revisão do código)

Todos os arquivos em `lib/actions/` são declarados com `'use server'` no topo e exportam funções assíncronas invocáveis diretamente de Client Components via `useTransition` ou de Server Components. **Não existe um tipo `ActionResult<T>` global compartilhado** — cada action usa seu próprio shape de retorno inline.

---

## Padrão de retorno por arquivo

| Arquivo | Retorno sucesso | Retorno erro |
|---|---|---|
| `tournament.ts` | `{ id, slug }` ou `{ success: true }` | `{ error: string }` |
| `partida.ts` | `{ success: true, data? }` | `{ error: string }` |
| `inscricao.ts` | `{ success: true }` | `{ error: string }` |
| `disputa.ts` | `{ success: true }` ou `{ data, error: null }` | `{ error: string }` |
| `roster.ts` | `{ success: true }` | `{ error: string }` |
| `team_invite.ts` | `{ success: true }` | `{ error: string }` |
| `riot-link.ts` | `{ success: true }` | `{ error: string }` |
| `fase.ts` | `{ success: true, data? }` | `{ error: string }` |
| `comunicado.ts` | `{ success: true }` | `{ error: string }` |
| `usuario.ts` | `{ success: true }` | `{ error: string }` |

**Padrões transversais obrigatórios:**
1. Validação Zod antes de qualquer operação no banco
2. `revalidatePath()` após mutations que afetam a UI
3. Guard de autenticação via helpers em `lib/supabase/permissions.ts`:
   - `requireAuth()` → retorna `{ supabase, profile }`
   - `requireTournamentOrganizerOrAdmin(tournamentId)` → retorna `{ supabase, profile }`
   - `requireAdmin()` → lança exceção se não for admin
   - `requireRiotLinked()` → lança se conta Riot não estiver vinculada
4. `useTransition` no cliente para desabilitar UI durante execução
5. Nunca lançar exceções para o cliente — sempre capturar no `try/catch` e retornar `{ error }`

---

## `lib/actions/tournament.ts`

Zod schema: `TournamentSchema` — valida `name`, `slug` (regex `/^[a-z0-9-]+$/`), `description`, `max_teams` (2–64), `start_date`, `status`.

### `createTournament(formData)`
```ts
await createTournament(formData: FormData)
// Guard: requireRiotLinked() — usuário precisa ter conta Riot vinculada
// → INSERT tournaments { ...parsed, organizer_id, created_by = profile.id, status padrão via schema }
// → revalidatePath('/organizador')
// → revalidatePath('/admin/tournaments')
// → revalidatePath('/torneios')
// Retorno sucesso: { id: string, slug: string }
// Retorno erro:    { error: string }
```

### `updateTournament(id, formData)`
```ts
await updateTournament(id: string, formData: FormData)
// Guard: requireTournamentOrganizerOrAdmin(id)
// → UPDATE tournaments SET { ...parsed } WHERE id
// → revalidatePath('/organizador')
// → revalidatePath('/admin/tournaments')
// → revalidatePath('/admin/tournaments/' + id)
// → revalidatePath('/torneios')
// Retorno: { success: true } | { error: string }
//
// ⚠️ É via updateTournament que o organizador transita manualmente:
//    DRAFT → OPEN, OPEN → IN_PROGRESS, IN_PROGRESS → FINISHED, qualquer → CANCELLED
```

### `deleteTournament(id)` ⚠️ ADMIN ONLY
```ts
await deleteTournament(id: string)
// Guard: requireAdmin()
// Usa createAdminClient() (service_role) → bypassa RLS
// → DELETE tournaments WHERE id (ON DELETE CASCADE nas entidades filhas)
// → revalidatePath('/admin/tournaments')
// → revalidatePath('/torneios')
// Retorno: { success: true } | { error: string }
```

### `deleteOwnTournament(id)` — Organizador
```ts
await deleteOwnTournament(id: string)
// Guard: supabase.auth.getUser() + verifica organizer_id = user.id
// Valida: status IN ('DRAFT', 'CANCELLED') — não permite deletar torneio publicado
// → DELETE tournaments WHERE id (RLS padrão, não service_role)
// → revalidatePath('/torneios')
// → revalidatePath('/organizador')
// → redirect('/torneios')  ← lança NEXT_REDIRECT (re-throw obrigatório)
// Retorno erro: { error: string }
```

---

## `lib/actions/partida.ts`

Importa `avancarVencedor` de `lib/bracket-utils` para progressão automática de chaveamento.

### `updateResultadoPartida(matchDbId, tournamentId, formData)`
```ts
await updateResultadoPartida(matchDbId: string, tournamentId: string, formData: FormData)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// Zod: { winner_team_id (uuid), score_a (number), score_b (number), match_id_riot? }
// → SELECT match (id, round, match_number, tournament_id, best_of, team_a_id, team_b_id)
// → UPDATE matches SET { winner_id, score_a, score_b, riot_match_id, status='FINISHED', finished_at }
// → avancarVencedor(supabase, match, winner_team_id)  ← progride chaveamento
// → Se picks_bans (JSONB) informado:
//     UPSERT match_games { match_id, game_number=1, picks_bans: enriched[] }
//     enrich: adiciona team_id resolvendo 'A'|'B' para team_a_id|team_b_id
// → revalidatePath (slug)/partidas, /bracket, /torneios
// Retorno: { success: true } | { error: string }
```

> `editarResultadoPartida` é um alias público de `updateResultadoPartida`.

### `createPartida(tournamentId, formData)`
```ts
await createPartida(tournamentId: string, formData: FormData)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// Zod: { team_a_id, team_b_id, round, match_number, scheduled_at?, fase_id?, best_of (1-7, default 1) }
// Valida: team_a_id ≠ team_b_id
// → INSERT matches { status='SCHEDULED', stage_id=fase_id }
// Retorno: { success: true, data: Match } | { error: string }
```

### `deletePartida(matchId, tournamentId)`
```ts
await deletePartida(matchId: string, tournamentId: string)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// Valida: match.status ≠ 'FINISHED' (não deleta partida finalizada)
// → DELETE matches WHERE id
// Retorno: { success: true } | { error: string }
```

### `gerarChaveamento(tournamentId, faseId?)`
```ts
await gerarChaveamento(tournamentId: string, faseId?: string)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// Se faseId: lê best_of da fase em tournament_stages
// → SELECT inscricoes WHERE tournament_id AND status='APPROVED'
// Valida: count >= 2
// → Embaralha times (Math.random), calcula nextPow2
// → INSERT matches (round=1, status='SCHEDULED', best_of dinâmico da fase)
// Nota: geração é feita INLINE — NÃO invoca Edge Function
// → revalidatePath: /partidas, /bracket, /torneios
// Retorno: { success: true, data: Match[] } | { error: string }
//
// ⚠️ NÃO transita tournaments.status para IN_PROGRESS automaticamente.
//    O organizador deve chamar updateTournament({ status: 'IN_PROGRESS' }) manualmente.
```

### `getPartidasByTorneio(tournamentId)`
```ts
await getPartidasByTorneio(tournamentId: string)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// → SELECT matches com joins: team_a, team_b, winner (via teams!fk)
// → ORDER BY round, match_number
// Retorno: { data: Match[] | null, error: string | null }
```

---

## `lib/actions/inscricao.ts`

### `criarInscricao(teamId, tournamentId)` / alias `inscreverTime(tournamentId, teamId)`
```ts
await criarInscricao(teamId: string, tournamentId: string)
// alias: inscreverTime(tournamentId, teamId)  ← atenção: ordem dos parâmetros invertida no alias
// Guard: requireAuth()
// → INSERT inscricoes { team_id, tournament_id, status='PENDING', requested_by=profile.id }
// → revalidatePath('/dashboard')
// → revalidatePath('/torneios/${tournamentId}')
// Retorno: { success: true } | { error: string }
```

### `aprovarInscricao(teamId, tournamentId)`
```ts
await aprovarInscricao(teamId: string, tournamentId: string)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// → UPDATE inscricoes SET { status='APPROVED', reviewed_by, reviewed_at }
//   WHERE team_id AND tournament_id  ← chave composta, NÃO inscricaoId isolado
// → revalidatePath: /inscricoes (organizador + admin)
// Retorno: { success: true } | { error: string }
```

### `rejeitarInscricao(teamId, tournamentId, notes)`
```ts
await rejeitarInscricao(teamId: string, tournamentId: string, notes: string)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// → UPDATE inscricoes SET { status='REJECTED', reviewed_by, reviewed_at, notes }
//   WHERE team_id AND tournament_id  ← chave composta, NÃO inscricaoId isolado
// Retorno: { success: true } | { error: string }
```

### `fazerCheckin(inscricaoId)` — Capitão
```ts
await fazerCheckin(inscricaoId: string)
// Guard: requireAuth() + verifica teams.owner_id = profile.id
// Valida: inscricao.status = 'APPROVED'
// → UPDATE inscricoes SET { checked_in=true, checked_in_at, checked_in_by }
// → revalidatePath('/dashboard/times/${team_id}/checkin')
// Retorno: { success: true } | { error: string }
```

### `fazerCheckinOrganizador(inscricaoId)` — Dupla validação Riot
```ts
await fazerCheckinOrganizador(inscricaoId: string)
// Guard: requireAuth() + requireTournamentOrganizerOrAdmin(tournament_id)
// Valida: inscricao.status = 'APPROVED'
// DUPLA BARREIRA:
//   Camada 1 (client): checkin-client.tsx verifica spectator-v5 antes de chamar (UX)
//   Camada 2 (server): re-verifica spectator-v5 com PUUIDs reais (fonte de verdade)
//     → Promise.allSettled: GET /lol/spectator/v5/active-games/by-summoner/{puuid}
//     → Se qualquer membro inGame: retorna erro (não penaliza se Riot API offline — fail-open)
// → UPDATE inscricoes SET { checked_in=true, checked_in_at, checked_in_by }
// Retorno: { success: true } | { error: string }
```

### `desfazerCheckin(inscricaoId)`
```ts
await desfazerCheckin(inscricaoId: string)
// Guard: requireAuth() + requireTournamentOrganizerOrAdmin(tournament_id)
// → UPDATE inscricoes SET { checked_in=false, checked_in_at=null, checked_in_by=null }
// Retorno: { success: true } | { error: string }
```

### `listarInscricoesPorTorneio(tournamentId)`
```ts
await listarInscricoesPorTorneio(tournamentId: string)
// Guard: requireAuth()
// → SELECT inscricoes com joins profundos:
//   team → team_members → riot_accounts → players (tier, lp, wins, losses)
// Retorno: { data: Inscricao[] | null, error: string | null }
```

---

## `lib/actions/disputa.ts`

Campos reais da tabela `disputes`: `match_id`, `reported_by`, `resolved_by`, `resolved_at`, `status`, `reason`, `evidence_url`, `resolution_notes`. **Não existe campo `description` ou `opened_by`.**

### `abrirDisputa(matchId, formData)`
```ts
await abrirDisputa(matchId: string, formData: FormData)
// Guard: requireAuth()
// Zod: { match_id (uuid), reason (10-1000 chars), evidence_url? (url) }
// Valida:
//   → match.status = 'FINISHED'
//   → teams.owner_id = profile.id AND team.id IN (team_a_id, team_b_id)
//   → Não existe disputa OPEN ou UNDER_REVIEW para a mesma partida
// → INSERT disputes { match_id, reported_by=profile.id, reason, evidence_url, status='OPEN' }
// → revalidatePath: /partidas, /torneios/${slug}, /dashboard/times
// Retorno: { success: true } | { error: string }
```

### `resolverDisputa(disputaId, tournamentId, formData)`
```ts
await resolverDisputa(disputaId: string, tournamentId: string, formData: FormData)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// Zod: { status: 'RESOLVED' | 'DISMISSED', resolution_notes (5-1000 chars) }
// Valida:
//   → disputa não está já RESOLVED ou DISMISSED
//   → match.tournament_id = tournamentId (anti-IDOR)
// → UPDATE disputes SET { status, resolution_notes, resolved_by=profile.id, resolved_at }
// Retorno: { success: true } | { error: string }
// Transição: OPEN | UNDER_REVIEW → RESOLVED | DISMISSED
```

### `listarDisputasPorTorneio(tournamentId)`
```ts
await listarDisputasPorTorneio(tournamentId: string)
// Guard: requireTournamentOrganizerOrAdmin(tournamentId)
// → SELECT disputes IN (match_ids do torneio)
//   joins: match(team_a, team_b), reported_by_profile, resolved_by_profile
// Retorno: { data: Disputa[] | null, error: string | null }
```

### `listarDisputasPorTime(teamId)`
```ts
await listarDisputasPorTime(teamId: string)
// Guard: requireAuth() + teams.owner_id = profile.id
// → SELECT disputes IN (matches do time)
//   joins: match(tournament, team_a, team_b), reported_by_profile
// Retorno: { data: Disputa[] | null, error: string | null }
```

---

## `lib/actions/riot-link.ts`

> ⚠️ A action recebe o objeto **já resolvido** (puuid, entries, masteries). A chamada à Riot API (`account-v1`, `summoner-v4`, `league-v4`, `champion-mastery-v4`) acontece no Client Component **antes** de invocar esta action.

### `vincularRiotAccount(params)`
```ts
await vincularRiotAccount({
  puuid:         string;
  gameName:      string;
  tagLine:       string;
  summonerLevel: number;
  profileIconId: number;
  entries: Array<{ queueType, tier, rank, lp, wins, losses }>;
  masteries: Array<{ championId, championName, championLevel, championPoints }>;
})
// Guard: supabase.auth.getUser()
// Fluxo:
//   1. Tenta INSERT riot_accounts { profile_id, puuid, game_name, tag_line, ... }
//   2. Se 23505 (puuid duplicado):
//        → Busca registro existente
//        → Se profile_id ≠ user.id: rejeita ('Conta Riot já vinculada a outro perfil')
//        → Se profile_id = user.id:  UPDATE pelo id direto
//   3. INSERT rank_snapshots por queue (RANKED_SOLO_5x5 e RANKED_FLEX_SR se presentes)
//   4. UPSERT champion_masteries (bulk)
//   5. UPSERT players { puuid, riot_account_id } (UNIQUE constraint)
// Retorno: { success: true } | { error: string }
```

---

## `lib/actions/roster.ts`

> Gerencia composição do elenco de um time. Guards via `requireAuth()` + verificação de `owner_id`.

Actions exportadas:
- `adicionarMembro(teamId, profileId, role?)` — capitão adiciona membro diretamente
- `removerMembro(teamId, memberId)` — capitão remove membro
- `atualizarRoleMembro(memberId, role)` — capitão atualiza role/lane
- `deixarTime(teamId)` — membro sai voluntariamente (não pode ser owner/capitão)

---

## `lib/actions/team_invite.ts`

Actions exportadas:
- `convidarMembro(teamId, profileId)` — cria `team_invites { status='PENDING', expires_at }`, Guard: owner_id
- `responderConvite(inviteId, aceitar: boolean)` — converte `aceitar` para `'ACCEPTED' | 'DECLINED'` internamente antes de UPDATE `team_invites.status`; INSERT `team_members` se aceito
- `cancelarConvite(inviteId)` — cancela convite pendente (apenas quem convidou)

---

## `lib/actions/fase.ts`

Actions exportadas:
- `criarFase(tournamentId, formData)` — INSERT tournament_stages, Guard: requireTournamentOrganizerOrAdmin
- `atualizarFase(faseId, tournamentId, formData)` — UPDATE tournament_stages
- `deletarFase(faseId, tournamentId)` — DELETE, valida que não tem partidas vinculadas
- `listarFases(tournamentId)` — SELECT tournament_stages WHERE tournament_id

---

## `lib/actions/comunicado.ts`

Actions exportadas (gerenciamento de notificações/comunicados para times inscritos):
- `criarComunicado(tournamentId, formData)` — INSERT notifications (broadcast para todos os inscritos), Guard: requireTournamentOrganizerOrAdmin
- `listarComunicados(tournamentId)` — SELECT notifications WHERE tournament_id

---

## `lib/actions/usuario.ts`

Actions exportadas:
- `atualizarPerfil(formData)` — UPDATE profiles { display_name, avatar_url, bio }, Guard: requireAuth
- `atualizarUsername(username)` — UPDATE profiles { username } com validação de unicidade

---

## `lib/actions/ingest-match.ts`

> **Não é chamada por Client Component.** É invocada por `app/api/internal/process-match/route.ts` após callback da Riot Tournament API.

Pipeline de ingestão — 5 etapas sequenciais:

```
1. processMatchResult(tournamentCode)
   → SELECT tournament_match_results WHERE tournament_code
   → Normaliza game_data (JSON do callback Riot)

2. fetchAndResolveMatch(gameId, tournamentId)
   → GET match-v5 /lol/match/v5/matches/BR1_{gameId}
   → Resolve localMatchId via matches.tournament_codes @> [tournamentCode]
   → Determina game_number (count de match_games existentes + 1)

3. persistMatchGame(localMatchId, gameData, gameNumber)
   → INSERT match_games { match_id, game_number, game_data JSONB, duration, winner_team_id }

4. persistPlayerStats(matchGameId, participants[])
   → INSERT player_stats (10 registros — 5v5)
   → Resolve profile_id via riot_accounts.puuid

5. finalizeMatchIngestion(localMatchId, tournamentId)
   → Conta match_games FINISHED para determinar vencedor do best_of
   → UPDATE matches { score_a, score_b, winner_id, status='FINISHED', finished_at }
   → avancarVencedor(supabase, match, winner_team_id)
```

Ver `docs/api/fluxos.md` — Fluxo #2 para diagrama completo.

---

## Transições de status (`tournament_status`)

```
DRAFT ──[updateTournament/status=OPEN]────────────► OPEN
OPEN  ──[updateTournament/status=IN_PROGRESS]────► IN_PROGRESS  ← manual, após gerarChaveamento
IN_PROGRESS ──[updateTournament/status=FINISHED]──► FINISHED
DRAFT | OPEN ──[updateTournament/status=CANCELLED]──► CANCELLED
DRAFT | CANCELLED ──[deleteOwnTournament]──────────► DELETE
qualquer ──[deleteTournament(admin)]───────────────► DELETE
```

> ⚠️ `gerarChaveamento` NÃO transita o status automaticamente. O fluxo correto é:
> 1. `gerarChaveamento(tournamentId)` → insere as partidas
> 2. `updateTournament(id, formData com status='IN_PROGRESS')` → transita o status manualmente

## Transições de status (`match_status`)

```
SCHEDULED ──[createPartida]────────────────► SCHEDULED
SCHEDULED ──[updateResultadoPartida]───────► FINISHED
FINISHED  ──[ingest-match pipeline]────────► (já FINISHED, persiste match_games)
qualquer  ──[deletePartida, se ≠ FINISHED]──► DELETE
```

## Transições de status (`dispute_status`)

```
OPEN ──[resolverDisputa]──► RESOLVED | DISMISSED
UNDER_REVIEW ──[resolverDisputa]──► RESOLVED | DISMISSED
```
