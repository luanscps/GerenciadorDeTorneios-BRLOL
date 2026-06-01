# Fluxos do Sistema — ArenaGG (GerenciadorDeTorneios-BRLOL)

> **Fonte de verdade:** código-fonte. Este documento reflete os arquivos em `lib/actions/`, `app/api/`, `supabase/functions/` e `lib/database.types.ts`.
> Última revisão: 2026-06-01 (corrigido após revisão do código)

---

## Índice

1. [Autenticação (Discord OAuth)](#1-autenticação-discord-oauth)
2. [Resultado de Partida (Riot Callback)](#2-resultado-de-partida-riot-callback)
3. [Sincronização de Rank (Edge Function)](#3-sincronização-de-rank-edge-function)
4. [Inscrição de Time em Torneio](#4-inscrição-de-time-em-torneio)
5. [Geração de Chaveamento (Bracket)](#5-geração-de-chaveamento-bracket)
6. [Convite de Membro de Time](#6-convite-de-membro-de-time)
7. [Check-in de Partida (Spectator)](#7-check-in-de-partida-spectator)

---

## 1. Autenticação (Discord OAuth)

### O que faz
Autentica o usuário via Discord OAuth2 usando Supabase Auth, criando o registro em `profiles` caso ainda não exista.

### Arquivos participantes
| Arquivo | Responsabilidade |
|---|---|
| `middleware.ts` | Refresh de sessão SSR em toda requisição |
| `app/api/auth/callback/route.ts` | Troca code → session, upsert em `profiles` |
| `lib/supabase/server.ts` | `createServerClient` com cookies |
| `lib/supabase/middleware.ts` | `createServerClient` para middleware |

### Fluxo

```
Browser
  │
  ├─ GET /auth/discord
  │      └─ Supabase redireciona → Discord OAuth
  │
  ├─ Discord callback → GET /api/auth/callback?code=xxx
  │      ├─ supabase.auth.exchangeCodeForSession(code)
  │      ├─ upsert profiles { id, email, display_name, avatar_url }
  │      └─ redirect → /dashboard (ou returnTo)
  │
  └─ Toda requisição SSR passa pelo middleware
         └─ supabase.auth.getUser() → renova session se necessário
```

### Tabelas / Enums usados
- `profiles` — `id` (uuid = auth.users.id), `display_name`, `avatar_url`, `is_admin`

---

## 2. Resultado de Partida (Riot Callback)

### O que faz
Recebe o webhook da Riot Tournament API, persiste o resultado bruto, e aciona a ingestão completa (match_games, player_stats, bracket advance).

### Arquivos participantes
| Arquivo | Responsabilidade |
|---|---|
| `app/api/tournament/callback/route.ts` | Recebe POST da Riot, valida HMAC, insere `tournament_match_results` |
| `app/api/internal/process-match/route.ts` | Endpoint interno chamado assincronamente |
| `lib/actions/ingest-match.ts` | Pipeline de 5 etapas de ingestão completa |
| `lib/bracket-utils.ts` | `calcularPlacar()`, `avancarVencedor()` |
| `lib/riot.ts` | `getMatchById(matchId)` → match-v5 |

### Fluxo

```
Riot API
  │
  └─ POST /api/tournament/callback
         ├─ Valida X-Riot-Token (HMAC-SHA256)
         ├─ INSERT tournament_match_results { tournament_code, game_id, game_data }
         └─ Fire-and-forget → POST /api/internal/process-match
                │
                └─ Pipeline ingest-match (lib/actions/ingest-match.ts)
                       │
                       ├─ [1] processMatchResult(tournamentCode)
                       │       └─ SELECT tournament_match_results WHERE tournament_code
                       │          Normaliza game_data (JSON do callback Riot)
                       │
                       ├─ [2] fetchAndResolveMatch(gameId, tournamentId)
                       │       ├─ GET match-v5: americas/match/v5/matches/BR1_{gameId}
                       │       ├─ Resolve localMatchId via matches.tournament_codes @> [tournamentCode]
                       │       └─ Determina game_number (count de match_games existentes + 1)
                       │
                       ├─ [3] persistMatchGame(localMatchId, gameData, gameNumber)
                       │       └─ INSERT match_games { match_id, game_number, game_data JSONB,
                       │                              duration, winner_team_id }
                       │
                       ├─ [4] persistPlayerStats(matchGameId, participants[])
                       │       ├─ INSERT player_stats (10 registros — 5v5)
                       │       └─ Resolve profile_id via riot_accounts.puuid
                       │
                       └─ [5] finalizeMatchIngestion(localMatchId, tournamentId)
                               ├─ Conta match_games FINISHED → determina vencedor do best_of
                               ├─ UPDATE matches { score_a, score_b, winner_id,
                               │                  status='FINISHED', finished_at }
                               └─ avancarVencedor(supabase, match, winner_team_id)
```

### Tabelas / Enums usados
- `tournament_match_results` — `tournament_code`, `game_id`, `game_data` (JSONB), `processed`
- `matches` — `status` (SCHEDULED→IN_PROGRESS→FINISHED), `winner_id`, `score_a`, `score_b`, `tournament_codes` (JSONB)
- `match_games` — `game_number`, `riot_game_id`, `duration_sec`, `winner_id`
- `player_stats` — `kills`, `deaths`, `assists`, `gold_earned`, `cs`, `vision_score`, `damage_dealt`, `win`, `champion`
- `team_members` — `status` = `accepted`

---

## 3. Sincronização de Rank (Edge Function)

### O que faz
Busca dados atualizados de rank/LP na Riot API para todos os players com `riot_account_id` e atualiza `players` e `rank_snapshots`.

### Arquivos participantes
| Arquivo | Responsabilidade |
|---|---|
| `supabase/functions/riot-api-sync/index.ts` | Edge Function orquestradora |
| `lib/riot.ts` | Wrappers tipados para account-v1, summoner-v4, league-v4 |
| `lib/riot-rate-limiter.ts` | Fila com delay entre chamadas (respeita 20req/1s, 100req/2min) |

### Fluxo

```
Cron (ou chamada manual)
  │
  └─ supabase/functions/riot-api-sync
         ├─ SELECT players JOIN riot_accounts WHERE riot_account_id IS NOT NULL
         │
         └─ Para cada player:
               ├─ GET account-v1: /riot/account/v1/accounts/by-puuid/{puuid}
               ├─ GET summoner-v4: /lol/summoner/v4/summoners/by-puuid/{puuid}
               ├─ GET league-v4:   /lol/league/v4/entries/by-summoner/{summonerId}
               │
               ├─ UPDATE players {
               │     current_rank, current_lp, current_tier,
               │     wins, losses, hot_streak, veteran, inactive
               │   }
               │
               └─ INSERT rank_snapshots por queue:
                     RANKED_SOLO_5x5 e RANKED_FLEX_SR (ambas as filas salvas)
                     { player_id, tier, rank, lp, wins, losses, snapshotted_at = now() }
```

### Tabelas / Enums usados
- `riot_accounts` — `puuid`, `game_name`, `tag_line`, `summoner_id`
- `players` — `current_rank`, `current_tier`, `current_lp`
- `rank_snapshots` — snapshot temporal de rank/LP (inclui RANKED_SOLO_5x5 e RANKED_FLEX_SR)
- Enum `player_role`: TOP | JUNGLE | MID | ADC | SUPPORT

---

## 4. Inscrição de Time em Torneio

### O que faz
Permite que um capitão inscreva seu time em um torneio aberto (status=OPEN), passando por validações de elegibilidade, e aguarda aprovação do organizador.

### Arquivos participantes
| Arquivo | Responsabilidade |
|---|---|
| `lib/actions/inscricao.ts` | `criarInscricao()` / alias `inscreverTime()` — Server Action principal |
| `lib/actions/inscricao.ts` | `aprovarInscricao()`, `rejeitarInscricao()` |
| `app/organizer/torneios/[id]/inscricoes/page.tsx` | UI de aprovação |

### Fluxo

```
Capitão do time
  │
  └─ criarInscricao(teamId, tournamentId)   [lib/actions/inscricao.ts]
     alias: inscreverTime(tournamentId, teamId)  ← atenção: ordem invertida no alias
         ├─ Guard: requireAuth()
         ├─ INSERT inscricoes { team_id, tournament_id, status='PENDING', requested_by=profile.id }
         ├─ revalidatePath('/dashboard')
         └─ revalidatePath('/torneios/${tournamentId}')

Organizador
  │
  ├─ aprovarInscricao(teamId, tournamentId)   [lib/actions/inscricao.ts]
  │     ├─ Guard: requireTournamentOrganizerOrAdmin(tournamentId)
  │     ├─ UPDATE inscricoes SET { status='APPROVED', reviewed_by, reviewed_at }
  │     │   WHERE team_id AND tournament_id  ← chave composta, NÃO inscricaoId
  │     └─ revalidatePath: /inscricoes (organizador + admin)
  │
  └─ rejeitarInscricao(teamId, tournamentId, notes)
        ├─ Guard: requireTournamentOrganizerOrAdmin(tournamentId)
        ├─ UPDATE inscricoes SET { status='REJECTED', reviewed_by, reviewed_at, notes }
        └─ WHERE team_id AND tournament_id  ← chave composta, NÃO inscricaoId
```

> ⚠️ `aprovarInscricao` e `rejeitarInscricao` usam **chave composta `(teamId, tournamentId)`**, não um `inscricaoId` isolado.

### Tabelas / Enums usados
- `inscricoes` — `status`: PENDING | APPROVED | REJECTED
- `team_members` — `role`: captain | member | substitute; `status`: pending | accepted | rejected | left
- `tournaments` — `status`: OPEN (enum `tournament_status`)
- `notifications`

---

## 5. Geração de Chaveamento (Bracket)

### O que faz
O organizador aciona a geração do bracket. O sistema busca as inscrições aprovadas, gera as partidas **inline** (sem Edge Function) e insere os matches com status SCHEDULED. A transição de status do torneio para `IN_PROGRESS` é feita **manualmente** pelo organizador via `updateTournament`.

### Arquivos participantes
| Arquivo | Responsabilidade |
|---|---|
| `lib/actions/partida.ts` | `gerarChaveamento()` — Server Action, lógica inline |
| `lib/bracket-utils.ts` | `calcularPlacar()`, `avancarVencedor()` |

> ⚠️ **Não existe Edge Function `bracket-generator`** — a geração é feita diretamente dentro de `lib/actions/partida.ts`.

### Fluxo

```
Organizador
  │
  └─ gerarChaveamento(tournamentId, faseId?)   [lib/actions/partida.ts]
         ├─ Guard: requireTournamentOrganizerOrAdmin(tournamentId)
         ├─ Se faseId: lê best_of da fase em tournament_stages
         ├─ SELECT inscricoes WHERE tournament_id AND status='APPROVED'
         ├─ Valida: count >= 2
         ├─ Embaralha times (Math.random), calcula nextPow2
         ├─ INSERT matches[] {
         │     tournament_id, stage_id,
         │     team_a_id, team_b_id,
         │     round=1, match_number,
         │     status='SCHEDULED',
         │     best_of (dinâmico da fase ou padrão)
         │   }
         ├─ revalidatePath: /partidas, /bracket, /torneios
         └─ Retorno: { success: true, data: Match[] } | { error: string }

         ⚠️ NÃO transita tournaments.status para IN_PROGRESS automaticamente.
         O organizador deve manualmente executar updateTournament com status='IN_PROGRESS'.
```

### Tabelas / Enums usados
- `tournament_stages` — `bracket_type`: SINGLE_ELIMINATION | DOUBLE_ELIMINATION | ROUND_ROBIN | SWISS
- `matches` — `status` (SCHEDULED), `best_of`
- `inscricoes` — filtra `status = APPROVED`
- `seedings` — ordem preferencial (opcional)
- Enum `tournament_status`: OPEN (sem transição automática aqui)

---

## 6. Convite de Membro de Time

### O que faz
O capitão convida um usuário para o time. O convidado aceita ou recusa. O time é limitado a 8 membros (5 titulares + subs).

### Arquivos participantes
| Arquivo | Responsabilidade |
|---|---|
| `lib/actions/team_invite.ts` | `convidarMembro()`, `responderConvite()`, `cancelarConvite()` |
| Supabase RPC | `accept_team_invite(invite_id)` — atômica |
| `supabase/functions/send-email/index.ts` | Notificação por e-mail (opcional) |

### Fluxo

```
Capitão
  │
  └─ convidarMembro(teamId, profileId)   [lib/actions/team_invite.ts]
         ├─ Guard: teams.owner_id = profile.id
         ├─ Valida: time tem < 8 membros com status=accepted
         ├─ Valida: profileId não é membro ativo
         ├─ INSERT team_invites {
         │     team_id,
         │     invited_profile_id,
         │     invited_by,
         │     status = 'PENDING',
         │     expires_at = now() + 7 days
         │   }
         └─ INSERT notifications (para o convidado)

Convidado
  │
  ├─ responderConvite(inviteId, aceitar: boolean)   [lib/actions/team_invite.ts]
  │     ├─ Converte boolean → 'ACCEPTED' | 'DECLINED' internamente
  │     ├─ Se aceitar:
  │     │     ├─ Valida: invite.status = 'PENDING' e not expired
  │     │     ├─ UPDATE team_invites.status = 'ACCEPTED'
  │     │     ├─ INSERT team_members { role='member', status='accepted' }
  │     │     └─ INSERT notifications (para o capitão)
  │     └─ Se recusar:
  │           ├─ UPDATE team_invites.status = 'DECLINED'
  │           └─ INSERT notifications (para o capitão)
  │
  └─ (capitão pode cancelarConvite(inviteId) se ainda PENDING)
```

### Tabelas / Enums usados
- `team_invites` — `invited_profile_id`, `status`: PENDING | ACCEPTED | DECLINED | EXPIRED
- `team_members` — `role`: captain | member | substitute; `status`: pending | accepted | rejected | left
- RPC `accept_team_invite`

---

## 7. Check-in de Partida (Spectator)

### O que faz
O organizador faz o check-in de uma inscrição aprovada, verificando via spectator-v5 se algum membro do time já está em partida ativa na plataforma Riot. Possui **dupla barreira de validação** (client + server).

### Arquivos participantes
| Arquivo | Responsabilidade |
|---|---|
| `lib/actions/inscricao.ts` | `fazerCheckinOrganizador(inscricaoId)` — Server Action com validação server-side |
| `components/checkin-client.tsx` | Verifica spectator-v5 no client **antes** de invocar a action (UX) |
| `lib/riot.ts` | `getActiveGame(puuid)` → spectator-v5 |

### Fluxo

```
Organizador
  │
  └─ [Camada 1 — Client] checkin-client.tsx
         ├─ Verifica spectator-v5 para members antes de chamar a action
         └─ Se algum membro inGame → exibe alerta e bloqueia (UX, não vinculante)

  └─ [Camada 2 — Server] fazerCheckinOrganizador(inscricaoId)   [lib/actions/inscricao.ts]
         ├─ Guard: requireAuth() + requireTournamentOrganizerOrAdmin(tournament_id)
         ├─ Valida: inscricao.status = 'APPROVED'
         ├─ Re-verifica spectator-v5 com PUUIDs reais (fonte de verdade):
         │     Promise.allSettled: GET /lol/spectator/v5/active-games/by-summoner/{puuid}
         │     → Se qualquer membro inGame: retorna { error } (não falha se Riot API offline)
         ├─ UPDATE inscricoes SET { checked_in=true, checked_in_at, checked_in_by }
         └─ revalidatePath('/dashboard/times/${team_id}/checkin')

         ⚠️ Parâmetro é inscricaoId (não matchId).
         ⚠️ Arquivo: lib/actions/inscricao.ts (não lib/actions/matches.ts).
```

### Tabelas / Enums usados
- `inscricoes` — `checked_in`, `checked_in_at`, `checked_in_by`
- `team_members` — resolve participants para busca do puuid
- `riot_accounts` — `puuid` para chamada spectator-v5
- `matches` — `status`: SCHEDULED (verificação de contexto)
