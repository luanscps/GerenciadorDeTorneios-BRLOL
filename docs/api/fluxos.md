# Fluxos do Sistema

> **Regra:** Esta documentação reflete o código-fonte em `main`. Em caso de divergência com qualquer arquivo `.md`, o código prevalece.

---

## 1. Fluxo de Autenticação

```
[Usuário acessa página protegida]
  └▶ middleware.ts
        ├▶ createServerClient() — verifica sessão via cookie
        ├─ Sessão válida → deixa passar
        └─ Sessão inválida → redirect('/login')

[Login com Discord OAuth]
  └▶ GET /api/auth/login
        └▶ supabase.auth.signInWithOAuth({ provider: 'discord' })
              └▶ Riot OAuth opcional (vinculação de conta)
                    └▶ GET /api/auth/callback
                          ├▶ supabase.auth.exchangeCodeForSession(code)
                          ├▶ Upsert em profiles (id, email, username)
                          └▶ redirect('/dashboard')
```

**Arquivos envolvidos:**
- `middleware.ts` — guard global de rotas
- `app/api/auth/` — handlers OAuth
- `lib/supabase/server.ts` — `createServerClient()`
- `lib/supabase/client.ts` — `createBrowserClient()`
- Tabela: `profiles` (id, email, username, is_admin, created_at)

---

## 2. Fluxo de Resultado de Partida (Tournament Callback)

```
[Jogo termina na Riot]
  └▶ POST /api/riot/tournament/callback
        ├▶ Valida HMAC (header X-Riot-Token vs RIOT_CALLBACK_SECRET)
        ├▶ Parse do body: { tournamentCode, gameId, winningTeam, ... }
        ├▶ INSERT tournament_match_results
        │     { tournament_code, game_data, processed: false, created_at }
        └▶ HTTP 200 (resposta imediata à Riot)

[Edge Function: process-match-results — agendada / cron]
  └▶ SELECT tournament_match_results WHERE processed = false LIMIT 50
        └▶ Para cada resultado (com lock pessimista):
              └▶ POST /api/internal/process-match
                    Headers: { x-internal-secret: INTERNAL_SECRET,
                               x-tournament-code: <code> }
                    Timeout: 25s
                    └▶ UPDATE matches SET winner_id, status = 'FINISHED'
                    └▶ INSERT match_games (um por jogo)
                    └▶ INSERT player_stats (KDA, CS, dano por jogador)
                    └▶ UPDATE tournament_match_results SET processed = true
```

**Arquivos envolvidos:**
- `app/api/riot/tournament/callback/route.ts`
- `app/api/internal/process-match/route.ts`
- `supabase/functions/process-match-results/`
- Tabelas: `tournament_match_results`, `matches`, `match_games`, `player_stats`
- Enums: `match_status` → `FINISHED | IN_PROGRESS | SCHEDULED | CANCELLED | WALKOVER`

---

## 3. Fluxo de Sincronização de Rank (riot-api-sync)

```
[Edge Function: riot-api-sync — cron ou chamada manual]
  └▶ SELECT players
        WHERE (last_synced IS NULL OR last_synced < now() - interval '6 hours')
        ORDER BY last_synced ASC NULLS FIRST
        LIMIT 20

  └▶ Para cada jogador:
        ├▶ account-v1  GET /riot/account/v1/accounts/by-riot-id/{name}/{tag}
        │     → puuid (armazena em riot_accounts se ainda não existe)
        ├▶ summoner-v4 GET /lol/summoner/v4/summoners/by-puuid/{puuid}
        │     → summonerId, profileIconId, summonerLevel
        ├▶ league-v4   GET /lol/league/v4/entries/by-puuid/{puuid}
        │     → tier, rank, leaguePoints, wins, losses
        └▶ UPDATE players
              SET tier, rank, lp, icon_id, level, last_synced = now()
        └▶ INSERT rank_snapshots (puuid, tier, rank, lp, snapshot_at)
```

**Arquivos envolvidos:**
- `supabase/functions/riot-api-sync/`
- `lib/riot.ts` — helpers de request à Riot API
- `lib/riot-rate-limiter.ts` — controle de rate limit multi-camada
- Tabelas: `players`, `riot_accounts`, `rank_snapshots`
- Region usada: `br1` (summoner-v4 / league-v4), `americas` (account-v1)

---

## 4. Fluxo de Inscrição de Time em Torneio

```
[Capitão do time]
  └▶ POST /api/teams/{id}/inscricao (ou Server Action)
        ├▶ Verifica: torneio status === 'OPEN'
        ├▶ Verifica: time tem 5 membros com role definida
        ├▶ Verifica: nenhum membro já está inscrito em outro time no torneio
        ├▶ INSERT inscricoes { team_id, tournament_id, status: 'PENDING' }
        └▶ Notificação ao organizador

[Organizador aprova/rejeita]
  └▶ PATCH /api/organizer/inscricoes/{id}
        ├▶ Guard: organizer_id === user.id OR is_admin
        ├▶ UPDATE inscricoes SET status = 'APPROVED' | 'REJECTED'
        └▶ INSERT notifications (para o capitão do time)
```

**Arquivos envolvidos:**
- `app/api/teams/` — rotas de time
- `app/organizer/` — painel de organizador
- Tabelas: `inscricoes`, `teams`, `tournaments`, `notifications`
- Enums: `inscricao_status` → `PENDING | APPROVED | REJECTED`
- `tournament_status` → `OPEN` (único estado que aceita inscrições)

---

## 5. Fluxo de Geração de Chaveamento

```
[Organizador clica em "Gerar Chaveamento"]
  └▶ Server Action / POST /api/organizer/torneios/{id}/bracket
        ├▶ Guard: organizer_id === user.id OR is_admin
        ├▶ Valida: torneio status === 'OPEN' com inscrições APPROVED
        └▶ Invoca Edge Fn: bracket-generator
              ├▶ SELECT inscricoes WHERE tournament_id = {id} AND status = 'APPROVED'
              ├▶ Aplica seeds (tabela seedings) ou embaralha aleatoriamente
              ├▶ INSERT tournament_stages (round, bracket_type)
              ├▶ INSERT matches (team_a_id, team_b_id, round, status: 'SCHEDULED')
              └▶ UPDATE tournaments SET status = 'IN_PROGRESS'
```

**Arquivos envolvidos:**
- `supabase/functions/bracket-generator/`
- Tabelas: `inscricoes`, `tournament_stages`, `matches`, `seedings`, `tournaments`
- Enums: `bracket_type` → `SINGLE_ELIMINATION | DOUBLE_ELIMINATION | ROUND_ROBIN | SWISS`
- `tournament_status` → transição `OPEN → IN_PROGRESS`

---

## 6. Fluxo de Convite de Membro de Time

```
[Capitão envia convite]
  └▶ POST /api/teams/{id}/invite
        ├▶ Verifica: solicitante é captain (team_members.role = 'captain')
        ├▶ INSERT team_invites
        │     { team_id, invited_user_id, status: 'PENDING', expires_at: +7d }
        └▶ Edge Fn: send-email (ou notificação in-app)

[Convidado aceita/recusa]
  └▶ RPC: accept_team_invite(invite_id)
        ├▶ Verifica: invite_status = 'PENDING' e não expirado
        ├▶ UPDATE team_invites SET status = 'ACCEPTED'
        ├▶ INSERT team_members { team_id, user_id, role: 'member', status: 'accepted' }
        └▶ INSERT notifications (para o capitão)
```

**Arquivos envolvidos:**
- `app/api/teams/` — rota de invite
- `supabase/functions/send-email/`
- RPC: `accept_team_invite(invite_id)` — função PostgreSQL
- Tabelas: `team_invites`, `team_members`, `notifications`
- Enums: `invite_status` → `PENDING | ACCEPTED | DECLINED | EXPIRED`
- `team_member_role` → `captain | member | substitute`
