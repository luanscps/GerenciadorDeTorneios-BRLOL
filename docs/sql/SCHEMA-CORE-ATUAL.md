# Schema core atual — Supabase (schema `public`)

> Fonte: Dados reais do projeto Supabase `awbieglbwhfavxlghuvy`.
> Para visão funcional e de negócio do modelo, consulte [`../BRLOL-DOCS-UNIFICADO.md`](../BRLOL-DOCS-UNIFICADO.md).

---

## Legenda de RLS

| Símbolo | Significado |
|---|---|
| 🟢 | RLS ativado — policies de domínio aplicadas |
| 🟡 | RLS ativado — acesso restrito a admins (`is_admin`) |
| ⚪ | Tabela de infra/suporte sem RLS de domínio (acesso via função ou service role) |

---

## Enums

```sql
CREATE TYPE tournament_status AS ENUM ('DRAFT', 'OPEN', 'IN_PROGRESS', 'FINISHED', 'CANCELLED');
CREATE TYPE bracket_type AS ENUM ('SINGLE_ELIMINATION', 'DOUBLE_ELIMINATION', 'ROUND_ROBIN', 'SWISS');
CREATE TYPE match_status AS ENUM ('SCHEDULED', 'IN_PROGRESS', 'FINISHED');
CREATE TYPE inscricao_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE player_role AS ENUM ('TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT');
CREATE TYPE user_role AS ENUM ('player', 'organizer', 'admin');
CREATE TYPE invite_status AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');
CREATE TYPE dispute_status AS ENUM ('OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED');
CREATE TYPE team_member_role AS ENUM ('captain', 'member', 'substitute');
CREATE TYPE team_member_status AS ENUM ('pending', 'accepted', 'rejected', 'left');
```

---

## perfis 🟢

Espelha `auth.users` com metadados de perfil. Trigger `handle_new_user` cria automaticamente ao inserir em `auth.users`.

| Coluna | Tipo | Constraints | RLS / Notas |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users.id` | Leitura pública; update apenas pelo próprio usuário |
| `email` | `text` | NOT NULL | |
| `full_name` | `text` | NULLABLE | |
| `avatar_url` | `text` | NULLABLE | |
| `is_admin` | `boolean` | NOT NULL DEFAULT `false` | Usado em função `is_admin(uid)` para policies |
| `is_banned` | `boolean` | NOT NULL DEFAULT `false` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | Trigger genérica |
| `riot_game_name` | `text` | NULLABLE | |
| `riot_tag_line` | `text` | NULLABLE | |
| `role` | `user_role` | DEFAULT `player` | |

---

## torneios 🟢

Tabela principal de torneios. Leitura pública; insert/update/delete restritos a `is_admin` ou `organizer_id`.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, `uuid_generate_v4()` | |
| `name` | `text` | NOT NULL | |
| `description` | `text` | NULLABLE | |
| `status` | `text` | NOT NULL DEFAULT `DRAFT` | Coerente com `tournament_status` |
| `bracket_type` | `bracket_type` | NOT NULL DEFAULT `SINGLE_ELIMINATION` | |
| `max_teams` | `integer` | NOT NULL DEFAULT 8, `>= 2` | |
| `prize_pool` | `text` | NULLABLE | |
| `start_date` | `timestamptz` | NULLABLE | |
| `end_date` | `timestamptz` | NULLABLE | |
| `created_by` | `uuid` | NULLABLE, FK → `profiles.id` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `min_tier` | `text` | NULLABLE | Elo mínimo |
| `discord_webhook_url` | `text` | NULLABLE | |
| `slug` | `text` | NOT NULL, UNIQUE | URLs semânticas |
| `featured` | `boolean` | NULLABLE DEFAULT `false` | |
| `banner_url` | `text` | NULLABLE | |
| `registration_deadline` | `timestamptz` | NULLABLE | |
| `starts_at` | `timestamptz` | GENERATED ALWAYS AS (`start_date`) STORED | Alias para queries |
| `organizer_id` | `uuid` | NULLABLE, FK → `profiles.id` | Perfil dono do torneio. Limite: 2 torneios não-cancelados por organizador. |
| `rules` | `text` | NULLABLE | Regras do torneio definidas pelo organizador na etapa 1 do wizard de criação. |
| `min_members` | `integer` | NOT NULL DEFAULT 1 | |
| `max_members` | `integer` | NOT NULL DEFAULT 10 | |
| `ends_at` | `timestamptz` | NULLABLE | |

---

## equipes 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tournament_id` | `uuid` | NULLABLE, FK → `tournaments.id` | |
| `name` | `text` | NOT NULL | |
| `tag` | `text` | NOT NULL, length 1–6 | UNIQUE com `tournament_id` |
| `logo_url` | `text` | NULLABLE | |
| `owner_id` | `uuid` | NULLABLE, FK → `profiles.id` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `is_eliminated` | `boolean` | NOT NULL DEFAULT `false` | |
| `slug` | `text` | NULLABLE, UNIQUE | |
| `description` | `text` | NULLABLE | |
| `is_active` | `boolean` | NOT NULL DEFAULT `true` | |
| `region` | `text` | NULLABLE DEFAULT `BR1` | |
| `banner_url` | `text` | NULLABLE | |

---

## jogadores 🟢

Jogadores vinculados a times. Vínculo sempre por UUID (`team_id`), nunca por slug.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `team_id` | `uuid` | NULLABLE, FK → `teams.id` | |
| `summoner_name` | `text` | NOT NULL | |
| `tag_line` | `text` | NOT NULL DEFAULT `BR1` | |
| `puuid` | `text` | NULLABLE, UNIQUE | Sincronizado com Riot API |
| `role` | `player_role` | NULLABLE | |
| `tier` | `text` | NOT NULL DEFAULT `UNRANKED` | |
| `rank` | `text` | NOT NULL DEFAULT `''` | |
| `lp` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `wins` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `losses` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `profile_icon` | `integer` | NULLABLE | |
| `summoner_level` | `integer` | NULLABLE | |
| `last_synced` | `timestamptz` | NULLABLE | Última sync com Riot |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `riot_account_id` | `uuid` | NULLABLE, FK → `riot_accounts.id` | |

---

## inscricoes 🟢

Pedido de inscrição de um time em um torneio.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tournament_id` | `uuid` | NOT NULL, FK → `tournaments.id` | Índice em `(tournament_id, status)` |
| `team_id` | `uuid` | NOT NULL, FK → `teams.id` | |
| `requested_by` | `uuid` | NULLABLE, FK → `profiles.id` | Índice em `(requested_by, status)` |
| `status` | `inscricao_status` | NOT NULL DEFAULT `PENDING` | |
| `reviewed_by` | `uuid` | NULLABLE, FK → `profiles.id` | Admin que aprovou/rejeitou |
| `reviewed_at` | `timestamptz` | NULLABLE | |
| `notes` | `text` | NULLABLE | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `checked_in_at` | `timestamptz` | NULLABLE | timestamp do check-in |
| `checked_in` | `boolean` | NOT NULL DEFAULT `false` | true quando o time confirmou presença no torneio |
| `checked_in_by` | `uuid` | NULLABLE, FK → `auth.users.id` | usuário que fez o check-in (capitão ou admin) |

---

## partidas 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tournament_id` | `uuid` | NOT NULL, FK → `tournaments.id` | Índice em `(tournament_id, round)` |
| `round` | `integer` | NOT NULL DEFAULT 1, `>= 1` | |
| `match_order` | `integer` | NOT NULL DEFAULT 1 | |
| `status` | `match_status` | NOT NULL DEFAULT `SCHEDULED` | |
| `team_a_id` | `uuid` | NULLABLE, FK → `teams.id` | |
| `team_b_id` | `uuid` | NULLABLE, FK → `teams.id` | |
| `winner_id` | `uuid` | NULLABLE, FK → `teams.id` | |
| `score_a` | `integer` | NULLABLE, `>= 0` | |
| `score_b` | `integer` | NULLABLE, `>= 0` | |
| `riot_match_id` | `text` | NULLABLE | ID de partida na Riot |
| `scheduled_at` | `timestamptz` | NULLABLE | |
| `played_at` | `timestamptz` | NULLABLE | |
| `notes` | `text` | NULLABLE | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `format` | `text` | NOT NULL DEFAULT `BO1`, in (`BO1`,`BO3`,`BO5`) | |
| `stage_id` | `uuid` | NULLABLE, FK → `tournament_stages.id` | |
| `match_number` | `integer` | NOT NULL DEFAULT 1 | |
| `best_of` | `integer` | NOT NULL DEFAULT 1 | |
| `finished_at` | `timestamptz` | NULLABLE | |
| `match_id_riot` | `text` | NULLABLE | |
| `tournament_code` | `text` | NULLABLE | |

---

## tournament_stages 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tournament_id` | `uuid` | NOT NULL, FK → `tournaments.id` | |
| `name` | `text` | NOT NULL | Ex.: "Quartas", "Grupos A" |
| `stage_order` | `integer` | NOT NULL DEFAULT 1 | |
| `bracket_type` | `bracket_type` | NULLABLE | Tipo específico da fase |
| `best_of` | `integer` | NOT NULL DEFAULT 1, in (1,3,5) | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

## match_games 🟢

Cada jogo individual dentro de uma série (BO3/BO5).

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `match_id` | `uuid` | NOT NULL, FK → `matches.id` | |
| `game_number` | `integer` | NOT NULL, `>= 1` | |
| `winner_id` | `uuid` | NULLABLE, FK → `teams.id` | |
| `riot_game_id` | `text` | NULLABLE | |
| `duration_sec` | `integer` | NULLABLE, `>= 0` | |
| `picks_bans` | `jsonb` | NULLABLE | Draft completo |
| `played_at` | `timestamptz` | NULLABLE | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

## player_stats 🟢

Estatísticas por jogador por jogo. Alimenta as views `v_player_tournament_kda` e `v_stage_standings`.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `game_id` | `uuid` | NOT NULL, FK → `match_games.id` | |
| `player_id` | `uuid` | NULLABLE, FK → `players.id` | |
| `team_id` | `uuid` | NULLABLE, FK → `teams.id` | |
| `champion` | `text` | NULLABLE | |
| `kills` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `deaths` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `assists` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `cs` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `vision_score` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `damage_dealt` | `integer` | NOT NULL DEFAULT 0, `>= 0` | |
| `is_mvp` | `boolean` | NOT NULL DEFAULT `false` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `gold_earned` | `integer` | NOT NULL DEFAULT 0 | |
| `wards_placed` | `integer` | NOT NULL DEFAULT 0 | |
| `game_duration` | `integer` | NULLABLE | |
| `win` | `boolean` | NOT NULL DEFAULT `false` | |
| `role` | `player_role` | NULLABLE | |

---

## notificações 🟢

RLS garante que o usuário logado só lê/altera suas próprias notificações.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `user_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `type` | `text` | NOT NULL | |
| `title` | `text` | NOT NULL | |
| `body` | `text` | NULLABLE | |
| `read` | `boolean` | NOT NULL DEFAULT `false` | |
| `metadata` | `jsonb` | NULLABLE | |
| `expires_at` | `timestamptz` | NULLABLE | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `message` | `text` | NULLABLE | Campo legado de compatibilidade |
| `link` | `text` | NULLABLE | |

---

## prize_distribution 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tournament_id` | `uuid` | NOT NULL, FK → `tournaments.id` | |
| `placement` | `integer` | NOT NULL, `>= 1` | |
| `description` | `text` | NOT NULL | |
| `value` | `text` | NOT NULL | |
| `created_at` | `timestamptz` | NULLABLE DEFAULT `now()` | |

---

## seedings 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tournament_id` | `uuid` | NOT NULL, FK → `tournaments.id` | |
| `team_id` | `uuid` | NOT NULL, FK → `teams.id` | |
| `seed` | `integer` | NOT NULL, `>= 1` | |
| `method` | `text` | NOT NULL DEFAULT `MANUAL`, in (`MANUAL`,`RANKING`,`RANDOM`) | |
| `created_at` | `timestamptz` | NULLABLE DEFAULT `now()` | |

---

## team_invites 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `team_id` | `uuid` | NOT NULL, FK → `teams.id` | |
| `invited_by` | `uuid` | NULLABLE, FK → `profiles.id` | |
| `summoner_name` | `text` | NOT NULL | |
| `tag_line` | `text` | NOT NULL DEFAULT `BR1` | |
| `role` | `player_role` | NULLABLE | |
| `status` | `invite_status` | NULLABLE DEFAULT `PENDING` | |
| `expires_at` | `timestamptz` | NULLABLE DEFAULT `(now() + '48:00:00'::interval)` | |
| `created_at` | `timestamptz` | NULLABLE DEFAULT `now()` | |

---

## disputas 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `match_id` | `uuid` | NOT NULL, FK → `matches.id` | |
| `reported_by` | `uuid` | NULLABLE, FK → `profiles.id` | |
| `reason` | `text` | NOT NULL | |
| `evidence_url` | `text` | NULLABLE | |
| `status` | `dispute_status` | NULLABLE DEFAULT `OPEN` | |
| `resolved_by` | `uuid` | NULLABLE, FK → `profiles.id` | |
| `resolution_notes` | `text` | NULLABLE | |
| `created_at` | `timestamptz` | NULLABLE DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NULLABLE DEFAULT `now()` | |

---

## tournament_rules 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `tournament_id` | `uuid` | NOT NULL, FK → `tournaments.id` | |
| `section` | `text` | NOT NULL | |
| `content` | `text` | NOT NULL | |
| `rule_order` | `integer` | NULLABLE DEFAULT 1 | |
| `created_at` | `timestamptz` | NULLABLE DEFAULT `now()` | |

---

## audit_log 🟡

Leitura restrita a `is_admin = true`. Nunca acessível por usuários comuns.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `admin_id` | `uuid` | NULLABLE, FK → `auth.users.id` | |
| `action` | `text` | NOT NULL | |
| `table_name` | `text` | NOT NULL | |
| `record_id` | `text` | NULLABLE | |
| `old_data` | `jsonb` | NULLABLE | |
| `new_data` | `jsonb` | NULLABLE | |
| `ip_address` | `inet` | NULLABLE | |
| `user_agent` | `text` | NULLABLE | |

---

## riot_accounts 🟢

Contas Riot vinculadas a perfis. Trigger `ensure_single_primary_riot_account` garante no máximo uma conta primária por `profile_id`.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `puuid` | `text` | NOT NULL | |
| `game_name` | `text` | NOT NULL | |
| `summoner_id` | `text` | NULLABLE | |
| `summoner_level` | `integer` | NULLABLE | |
| `profile_icon_id` | `integer` | NULLABLE | |
| `is_primary` | `boolean` | NOT NULL DEFAULT `false` | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `tag_line` | `text` | NOT NULL | |

---

## rank_snapshots 🟢

Histórico de rank por conta Riot. Acesso via service role ou Edge Function de sync.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `riot_account_id` | `uuid` | NOT NULL, FK → `riot_accounts.id` | |
| `queue_type` | `text` | NOT NULL | |
| `tier` | `text` | NOT NULL | |
| `rank` | `text` | NOT NULL | |
| `lp` | `integer` | NOT NULL DEFAULT 0 | |
| `wins` | `integer` | NOT NULL DEFAULT 0 | |
| `losses` | `integer` | NOT NULL DEFAULT 0 | |
| `hot_streak` | `boolean` | NOT NULL DEFAULT `false` | |
| `snapshotted_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

## champion_masteries 🟢

Maestrias por conta Riot. Atualizado pela Edge Function `riot-api-sync`.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK | |
| `riot_account_id` | `uuid` | NOT NULL, FK → `riot_accounts.id` | |
| `champion_id` | `integer` | NOT NULL | |
| `champion_name` | `text` | NULLABLE | |
| `mastery_level` | `integer` | NOT NULL DEFAULT 0 | |
| `mastery_points` | `integer` | NOT NULL DEFAULT 0 | |
| `last_play_time` | `timestamptz` | NULLABLE | |
| `created_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

## site_terms_acceptance 🟢

Registro auditável de cada aceite dos termos da plataforma pelo organizador antes de criar torneio.

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `terms_version` | `text` | NOT NULL DEFAULT `v1` | |
| `accepted_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `ip_address` | `text` | NULLABLE | |

---

## team_members 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `team_id` | `uuid` | NOT NULL, FK → `teams.id` | |
| `profile_id` | `uuid` | NOT NULL, FK → `profiles.id` | |
| `riot_account_id` | `uuid` | NULLABLE, FK → `riot_accounts.id` | |
| `team_role` | `team_member_role` | NOT NULL DEFAULT `member` | |
| `status` | `team_member_status` | NOT NULL DEFAULT `pending` | |
| `invited_by` | `uuid` | NULLABLE, FK → `profiles.id` | |
| `invited_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |
| `responded_at` | `timestamptz` | NULLABLE | |
| `lane` | `player_role` | NULLABLE | |

---

## active_team 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `profile_id` | `uuid` | PK, FK → `profiles.id` | |
| `team_id` | `uuid` | NULLABLE, FK → `teams.id` | |
| `updated_at` | `timestamptz` | NOT NULL DEFAULT `now()` | |

---

## tournament_match_results 🟢

| Coluna | Tipo | Constraints | Notas |
|---|---|---|---|
| `id` | `uuid` | PK, `gen_random_uuid()` | |
| `tournament_code` | `text` | NOT NULL, UNIQUE | |
| `game_id` | `bigint` | NULLABLE | |
| `game_data` | `jsonb` | NOT NULL | |
| `processed` | `boolean` | NULLABLE DEFAULT `false` | |
| `received_at` | `timestamptz` | NULLABLE DEFAULT `now()` | |

---

## Resumo de FKs por UUID

Todas as relações são feitas por UUID real. **Nunca por slug ou string de URL.**

```
profiles.id            ↔ auth.users.id
tournaments.created_by → profiles.id
tournaments.organizer_id → profiles.id
teams.tournament_id    → tournaments.id
teams.owner_id         → profiles.id
players.team_id        → teams.id
players.riot_account_id → riot_accounts.id
inscricoes.tournament_id, team_id → tournaments.id, teams.id
inscricoes.requested_by, reviewed_by → profiles.id
inscricoes.checked_in_by → auth.users.id
matches.tournament_id  → tournaments.id
matches.team_a_id / team_b_id / winner_id → teams.id
matches.stage_id       → tournament_stages.id
tournament_stages.tournament_id → tournaments.id
match_games.match_id   → matches.id
match_games.winner_id  → teams.id
player_stats.game_id   → match_games.id
player_stats.player_id → players.id
player_stats.team_id   → teams.id
notifications.user_id  → profiles.id
prize_distribution.tournament_id → tournaments.id
seedings.tournament_id, team_id → tournaments.id, teams.id
team_invites.team_id   → teams.id
team_invites.invited_by → profiles.id
disputes.match_id      → matches.id
disputes.reported_by, resolved_by → profiles.id
tournament_rules.tournament_id → tournaments.id
audit_log.admin_id     → auth.users.id
riot_accounts.profile_id → profiles.id
rank_snapshots.riot_account_id → riot_accounts.id
champion_masteries.riot_account_id → riot_accounts.id
site_terms_acceptance.profile_id → profiles.id
team_members.team_id   → teams.id
team_members.profile_id → profiles.id
team_members.riot_account_id → riot_accounts.id
team_members.invited_by → profiles.id
active_team.profile_id → profiles.id
active_team.team_id    → teams.id
```

---

## Funções SQL auxiliares

| Função | Uso |
|---|---|
| `is_admin(uid uuid)` | Retorna `boolean` — usada em todas as policies de admin |
| `handle_new_user()` | Trigger `AFTER INSERT ON auth.users` — cria `profiles` autom. |
| `ensure_single_primary_riot_account()` | Trigger em `riot_accounts` — no máximo 1 conta primária por profile |
| `is_current_user_admin()` | Retorna `boolean` — verifica se o usuário atual é admin |
| `is_organizer_or_admin(uid uuid)` | Retorna `boolean` — verifica se o usuário é organizador ou admin |
| `is_tournament_organizer(tid uuid, uid uuid)` | Retorna `boolean` — verifica se o usuário é organizador do torneio |
| `log_admin_action(p_action text, p_table_name text, p_record_id text, p_old_data jsonb, p_new_data jsonb, p_ip_address inet, p_user_agent text)` | Registra ações administrativas no `audit_log` |
| `accept_team_invite(p_invite_id uuid, p_profile_id uuid, p_riot_acc_id uuid)` | Aceita um convite de time |

---

## Views

| View | Base | Uso |
|---|---|---|
| `v_player_leaderboard` | `players`, `rank_snapshots` | Ranking geral de jogadores |
| `v_stage_standings` | `tournament_stages`, `matches`, `teams` | Classificação por fase |
| `v_player_tournament_kda` | `player_stats`, `match_games`, `matches` | KDA agregado por torneio |
