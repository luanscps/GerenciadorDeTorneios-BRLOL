# Fluxos do Sistema — ArenaGG (GerenciadorDeTorneios-BRLOL)

> **Fonte de verdade:** código-fonte. Este documento foi gerado lendo os arquivos reais do repositório.
> Última revisão: 2026-06-01

---

## Fluxo 1 — Autenticação (Discord OAuth)

```
Browser → /auth/login
  → Supabase Auth (Discord OAuth)
  → callback: /auth/callback/route.ts
    → exchangeCodeForSession()
    → upsert profiles (id, discord_id, username, avatar_url)
    → redirect /dashboard
```

**Arquivos participantes:**
- `app/auth/login/page.tsx`
- `app/auth/callback/route.ts`
- `middleware.ts` — guard de sessão em todas as rotas protegidas
- `lib/supabase/server.ts` — `createServerClient()`

**Tabelas:** `profiles`

**Guard de rota (middleware.ts):**
- Rotas `/organizer/**` → requer sessão + `organizer_id === user.id` OU `is_admin = true`
- Rotas `/admin/**` → requer `is_admin = true`
- Redirect em falha: `/torneios?error=sem_permissao`

---

## Fluxo 2 — Resultado de Partida via Callback Riot

```
Riot API → POST /api/riot/tournament/callback
  → valida X-Riot-Token (HMAC)
  → insere tournament_match_results (tournament_code, game_data JSONB)
  → chama internamente: /api/internal/process-match
    → lê match_games pelo tournament_code
    → atualiza match_games (winner, kills, deaths, assists, picks_bans JSONB)
    → chama avancarVencedor(supabase, match, winner_team_id) de lib/bracket-utils
    → atualiza matches.status → FINISHED
    → se todas as partidas da fase concluídas → atualiza tournament_stages.status
```

**Arquivos participantes:**
- `app/api/riot/tournament/callback/route.ts`
- `app/api/internal/process-match/route.ts`
- `lib/bracket-utils.ts` — `avancarVencedor()`
- `supabase/functions/process-match-results/` (Edge Function auxiliar)

**Tabelas:** `tournament_match_results`, `match_games`, `matches`, `tournament_stages`

**Enums usados:**
- `match_status`: `IN_PROGRESS → FINISHED`
- `picks_bans`: JSONB dentro de `match_games.picks_bans` (não tabela separada)

---

## Fluxo 3 — Sincronização de Rank (Edge Function Cron)

```
Cron (Supabase Edge Functions) → riot-api-sync
  → busca profiles com riot_accounts vinculadas
  → GET americas.api.riotgames.com/riot/account/v1/accounts/by-puuid/{puuid}
  → GET br1.api.riotgames.com/lol/summoner/v4/summoners/by-puuid/{puuid}
  → GET br1.api.riotgames.com/lol/league/v4/entries/by-summoner/{summonerId}
  → upsert players (rank, lp, tier, division)
  → insere rank_snapshots (snapshot diário)
```

**Arquivos participantes:**
- `supabase/functions/riot-api-sync/index.ts`
- `lib/riot.ts` — wrappers de fetch + `getPlatformUrl()` + `getRegionalUrl()`
- `lib/riot-rate-limiter.ts` — controle de rate limit por método

**Tabelas:** `riot_accounts`, `players`, `rank_snapshots`

**Nota:** O cron de monitor de status Riot (`lol-status-v4`) é separado — apenas monitora incidentes da BR1, não atualiza rank.

---

## Fluxo 4 — Inscrição de Time em Torneio

```
Capitão → POST /api/teams/inscricao (ou Server Action criarInscricao)
  → valida: torneio OPEN, time com roster mínimo, não inscrito ainda
  → insere inscricoes (team_id, tournament_id, status: PENDING)
  → insere notifications para o organizador

Organizador → aprovarInscricao(inscricaoId)
  → valida is_organizer_or_admin (RPC)
  → atualiza inscricoes.status → APPROVED
  → insere notification para o capitão
```

**Arquivos participantes:**
- `lib/actions/inscricao.ts` — `criarInscricao(teamId, tournamentId)` + alias `inscreverTime(tournamentId, teamId)` ⚠️ ordem de parâmetros invertida entre as duas funções
- `app/organizer/torneios/[id]/inscricoes/` — UI de aprovação

**Tabelas:** `inscricoes`, `notifications`, `teams`, `team_members`

**Enums:** `inscricao_status`: `PENDING → APPROVED | REJECTED`

**Validações em `criarInscricao`:**
- Torneio deve estar `OPEN`
- Time não pode estar já inscrito (unique `team_id + tournament_id`)
- Roster mínimo (definido em `tournament_rules.min_team_size`)

---

## Fluxo 5 — Geração de Chaveamento (Bracket)

```
Organizador → gerarChaveamento(tournamentId, faseId?)
  ← Server Action em lib/actions/partida.ts (não Edge Function)
  → valida is_organizer_or_admin
  → lê inscricoes APPROVED para o torneio
  → aplica seedings (tabela seedings) ou aleatoriza
  → nextPow2(n) → completa bracket com byes automáticos
  → lê tournament_stages.best_of se faseId passado
  → insere tournament_stages (bracket_type, best_of, status: PENDING)
  → insere matches (home_team_id, away_team_id, stage_id, status: SCHEDULED)
  → gera tournament_codes via Riot Tournament API
  → salva codes em matches.tournament_codes (JSONB)
  → atualiza tournament.status → IN_PROGRESS
```

**Arquivos participantes:**
- `lib/actions/partida.ts` — `gerarChaveamento()`
- `lib/bracket-utils.ts` — lógica de bracket, `nextPow2()`
- `lib/riot.ts` — `createTournamentCodes()`

**Tabelas:** `tournament_stages`, `matches`, `seedings`, `inscricoes`, `riot_tournament_registrations`

**Enums:**
- `bracket_type`: `SINGLE_ELIMINATION | DOUBLE_ELIMINATION | ROUND_ROBIN | SWISS`
- `match_status`: inicia em `SCHEDULED`
- `tournament_status`: `OPEN → IN_PROGRESS`

---

## Fluxo 6 — Convite de Membro para Time

```
Capitão → enviarConvite(teamId, invitedProfileId)
  ← lib/actions/roster.ts
  → valida: time existe, capitão é captain, membros ativos < 5
  → insere team_invites (team_id, invited_profile_id, status: PENDING, expires_at: +48h)
  → insere notification para o convidado

Convidado → aceitarConvite(inviteId)
  → valida: invite PENDING, não expirado (expires_at > now())
  → RPC accept_team_invite(invite_id)
    → upsert team_members (team_id, profile_id, status: active, role: member)
      onConflict: "team_id,profile_id"
    → atualiza team_invites.status → ACCEPTED

Convidado → recusarConvite(inviteId)
  → atualiza team_invites.status → REJECTED
```

**Arquivos participantes:**
- `lib/actions/roster.ts` — `enviarConvite()`, `aceitarConvite()`, `recusarConvite()`
- `supabase/functions/send-email/` — notificação por e-mail (opcional)

**Tabelas:** `team_invites`, `team_members`, `notifications`

**Enums:**
- `invite_status`: `PENDING → ACCEPTED | REJECTED | EXPIRED`
- `team_member_status`: `pending | active | rejected | left`
- `team_member_role`: `captain | member | substitute`

**Limites:**
- Máximo **5 membros ativos** por time (`.eq("status", "active")`)
- Convite expira em **48h** (`Date.now() + 48 * 60 * 60 * 1000`)
- `invited_profile_id` é a FK real (não `summoner_name`/`tag_line`)

---

## Fluxo 7 — Abertura de Disputa

```
Participante → abrirDisputa(matchId, reason, evidenceUrl?)
  ← lib/actions/disputa.ts (ou similar)
  → valida: usuário é membro de um dos times na partida
  → insere disputes:
      match_id, reported_by (profile_id), status: OPEN,
      reason, evidence_url, resolution_notes: null, resolved_by: null
  → insere notification para organizador/admin

Admin/Organizador → resolverDisputa(disputeId, notes, status)
  → valida is_admin ou is_organizer_or_admin
  → atualiza disputes.status → RESOLVED | DISMISSED
  → preenche resolved_by, resolution_notes
  → RPC log_admin_action (audit_log)
```

**Tabelas:** `disputes`

**Campos reais da tabela `disputes`:**
- `match_id`, `reported_by`, `resolved_by`, `status`, `reason`, `evidence_url`, `resolution_notes`
- ⚠️ **Não existe campo `opened_by` ou `tournament_id` direto** na tabela

**Enums:** `dispute_status`: `OPEN | UNDER_REVIEW | RESOLVED | DISMISSED`

---

## Fluxo 8 — Check-in de Organizador (Verificação de Partida ao Vivo)

```
Organizador → fazerCheckinOrganizador(matchId)
  ← lib/actions/inscricao.ts
  → valida is_organizer_or_admin
  → busca puuid dos jogadores escalados na partida
  → GET {getPlatformUrl()}/lol/spectator/v5/active-games/by-summoner/{puuid}
      Headers: { 'X-Riot-Token': RIOT_API_KEY }
      (best-effort: se Riot offline → libera check-in mesmo sem confirmação)
  → atualiza matches.status → IN_PROGRESS
  → registra checkin timestamp
```

**Arquivos participantes:**
- `lib/actions/inscricao.ts` — `fazerCheckinOrganizador()`, `desfazerCheckin()`
- `lib/riot.ts` — `getPlatformUrl()` → `https://br1.api.riotgames.com`

**Tabelas:** `matches`

**Endpoint Riot:** `spectator-v5` na plataforma BR1

---

## Notas Gerais

| Aspecto | Detalhe |
|---|---|
| **Localização real das Server Actions** | `lib/actions/*.ts` (8 arquivos: `usuario.ts`, `roster.ts`, `inscricao.ts`, `partida.ts`, `fase.ts`, `ingest-match.ts`, `comunicado.ts`, `disputa.ts`) |
| **Rota do painel do organizador** | `/organizer/torneios/[id]/` (inglês, não `/organizador/`) |
| **`tournament_announcements`** | Tabela ainda **não migrada** — código tem fallback `42P01` em `comunicado.ts` |
| **`picks_bans`** | JSONB dentro de `match_games.picks_bans`, não tabela separada |
| **`deleteOwnTournament`** | Só funciona em `DRAFT` ou `CANCELLED` + lança `NEXT_REDIRECT` |
| **`createAdminClient()`** | Usado em `finalizeMatchIngestion` para bypass de RLS |
