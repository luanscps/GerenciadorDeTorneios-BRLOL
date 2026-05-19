# Schema Real do Banco — GerenciadorDeTorneios-BRLOL

> **Fonte:** Supabase projeto `awbieglbwhfavxlghuvy` — sincronizado via MCP Tool em 2026-05-19.
> **Regra:** Este arquivo é a **fonte da verdade**. Não seguir README, .txt ou .sql antigos.
> **Atualização:** Revisão completa — 21 tabelas corrigidas/ampliadas em relação à versão anterior.

---

## Enums (valores reais)

| Enum | Valores |
|---|---|
| `bracket_type` | `SINGLE_ELIMINATION` \| `DOUBLE_ELIMINATION` \| `ROUND_ROBIN` \| `SWISS` |
| `dispute_status` | `OPEN` \| `UNDER_REVIEW` \| `RESOLVED` \| `DISMISSED` |
| `inscricao_status` | `PENDING` \| `APPROVED` \| `REJECTED` |
| `invite_status` | `PENDING` \| `ACCEPTED` \| `DECLINED` \| `EXPIRED` |
| `match_status` | `SCHEDULED` \| `IN_PROGRESS` \| `FINISHED` \| `CANCELLED` \| `WALKOVER` |
| `player_role` | `TOP` \| `JUNGLE` \| `MID` \| `ADC` \| `SUPPORT` |
| `team_member_role` | `captain` \| `member` \| `substitute` |
| `team_member_status` | `pending` \| `accepted` \| `rejected` \| `left` |
| `tournament_status` | `DRAFT` \| `OPEN` \| `IN_PROGRESS` \| `FINISHED` \| `CANCELLED` |
| `user_role` | `player` \| `organizer` \| `admin` |

---

## Tabelas

### `profiles`
Espelha `auth.users`. Um registro por usuário autenticado.

> ⚠️ **Diff v anterior:** removidos `username`, `display_name`, `riot_game_name`, `riot_tag_line`.
> Adicionados `full_name` e `notification_preferences` (jsonb com defaults por canal/evento).

| Coluna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | FK `auth.users.id` |
| `email` | text | NO | — |
| `full_name` | text | YES | — |
| `avatar_url` | text | YES | — |
| `role` | `user_role` | NO | `'player'` |
| `is_admin` | bool | NO | `false` |
| `is_banned` | bool | NO | `false` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |
| `notification_preferences` | jsonb | YES | `{"email_team_invite":true,"email_match_result":true,"email_new_tournament":false,"discord_bracket_update":true,"email_checkin_reminder":true}` |

---

### `riot_accounts`
Contas Riot vinculadas a um perfil. Uma pode ser primária.

> ⚠️ **Diff v anterior:** removidos `summoner_id`, `account_id`, `is_locked` (bool), `region`.
> Adicionados `lock_status` (3 estados), `lock_until`, `lock_reason`, `summoner_level`, `profile_icon_id`.
> O sistema de lock foi **refatorado** de `bool is_locked` para enum de 3 estados.

| Coluna | Tipo | Nullable | Default / Check |
|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `profile_id` | uuid | NO | FK `profiles.id` |
| `puuid` | text | NO | UNIQUE |
| `game_name` | text | NO | — |
| `tag_line` | text | NO | — |
| `summoner_level` | int4 | YES | — |
| `profile_icon_id` | int4 | YES | — |
| `is_primary` | bool | NO | `false` |
| `lock_status` | text | NO | `'locked_until'` — check: `unlocked\|locked_permanent\|locked_until` |
| `lock_until` | timestamptz | YES | `now() + 30 days` |
| `locked_by` | uuid | YES | FK `profiles.id` |
| `locked_at` | timestamptz | YES | `now()` |
| `lock_reason` | text | YES | — |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

---

### `riot_account_lock_logs`
Log auditável de todas as alterações de lock em `riot_accounts`.

> ⚠️ **Diff v anterior:** adicionados `lock_until`, `lock_reason`, `previous_status`, `previous_until`.
> Coluna `reason` da v anterior foi renomeada para `lock_reason`.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `riot_account_id` | uuid | NO — FK `riot_accounts.id` |
| `changed_by` | uuid | NO — FK `profiles.id` |
| `action` | text | NO — check: `locked_permanent\|locked_until\|unlocked` |
| `lock_until` | timestamptz | YES |
| `lock_reason` | text | YES |
| `previous_status` | text | YES |
| `previous_until` | timestamptz | YES |
| `created_at` | timestamptz | NO — `now()` |

---

### `players`
Dados de jogador sincronizados via Riot API (summoner + rank snapshot atual).

> ⚠️ **Diff v anterior:** removido `profile_id` direto.
> Adicionados `puuid` (UNIQUE) e `last_synced`. Vínculo com perfil é via `riot_accounts.profile_id`.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `riot_account_id` | uuid | YES — FK `riot_accounts.id` UNIQUE |
| `summoner_name` | text | NO |
| `tag_line` | text | NO — default `'BR1'` |
| `puuid` | text | YES — UNIQUE |
| `role` | `player_role` | YES |
| `tier` | text | NO — default `'UNRANKED'` |
| `rank` | text | NO — default `''` |
| `lp` | int4 | NO — default `0`, check `>= 0` |
| `wins` | int4 | NO — default `0`, check `>= 0` |
| `losses` | int4 | NO — default `0`, check `>= 0` |
| `profile_icon` | int4 | YES |
| `summoner_level` | int4 | YES |
| `last_synced` | timestamptz | YES |
| `created_at` | timestamptz | NO — `now()` |
| `updated_at` | timestamptz | NO — `now()` |

---

### `rank_snapshots`
Histórico de tier/rank/LP por conta Riot ao longo do tempo.

> ⚠️ **Diff v anterior:** `captured_at` renomeado para `snapshotted_at`. Adicionado `hot_streak`.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `riot_account_id` | uuid | NO — FK `riot_accounts.id` |
| `queue_type` | text | NO |
| `tier` | text | NO |
| `rank` | text | NO |
| `lp` | int4 | NO — default `0` |
| `wins` | int4 | NO — default `0` |
| `losses` | int4 | NO — default `0` |
| `hot_streak` | bool | NO — default `false` |
| `snapshotted_at` | timestamptz | NO — default `now()` |

---

### `champion_masteries`
Maestrias de campeões sincronizadas da Riot API.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `riot_account_id` | uuid | NO — FK `riot_accounts.id` |
| `champion_id` | int4 | NO |
| `champion_name` | text | YES |
| `mastery_level` | int4 | NO — default `0` |
| `mastery_points` | int4 | NO — default `0` |
| `last_play_time` | timestamptz | YES |
| `created_at` | timestamptz | NO — `now()` |
| `updated_at` | timestamptz | NO — `now()` |

---

### `teams`
Times cadastrados na plataforma.

> ⚠️ **Diff v anterior:** adicionados `description`, `slug` (UNIQUE), `is_active`. Sem `updated_at`.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `name` | text | NO |
| `tag` | text | NO — check: 1–6 chars |
| `logo_url` | text | YES |
| `banner_url` | text | YES |
| `description` | text | YES |
| `slug` | text | YES — UNIQUE |
| `owner_id` | uuid | YES — FK `profiles.id` |
| `tournament_id` | uuid | YES — FK `tournaments.id` |
| `region` | text | YES — default `'BR1'` |
| `is_active` | bool | NO — default `true` |
| `is_eliminated` | bool | NO — default `false` |
| `created_at` | timestamptz | NO — `now()` |

---

### `team_members`
Relacionamento jogador ↔ time com papel e status.

> ⚠️ **Diff v anterior:** `created_at` é `invited_at` no banco. Adicionado `is_reserve`.

| Coluna | Tipo / Enum | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `team_id` | uuid | NO — FK `teams.id` |
| `profile_id` | uuid | NO — FK `profiles.id` |
| `riot_account_id` | uuid | YES — FK `riot_accounts.id` |
| `team_role` | `team_member_role` (`captain\|member\|substitute`) | NO — default `member` |
| `lane` | `player_role` | YES |
| `status` | `team_member_status` (`pending\|accepted\|rejected\|left`) | NO — default `pending` |
| `invited_by` | uuid | YES — FK `profiles.id` |
| `invited_at` | timestamptz | NO — `now()` |
| `responded_at` | timestamptz | YES |
| `is_reserve` | bool | NO — default `false` |

---

### `team_invites`
Convites enviados para jogadores entrarem em times.

> ⚠️ **Diff v anterior:** `role` usa `player_role` (não `team_member_role`). Adicionado `message`.

| Coluna | Tipo / Enum | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `team_id` | uuid | NO — FK `teams.id` |
| `invited_by` | uuid | YES — FK `profiles.id` |
| `invited_profile_id` | uuid | YES — FK `profiles.id` |
| `summoner_name` | text | YES |
| `tag_line` | text | YES |
| `role` | `player_role` (`TOP\|JUNGLE\|MID\|ADC\|SUPPORT`) | YES |
| `is_reserve` | bool | NO — default `false` |
| `message` | text | YES |
| `status` | `invite_status` (`PENDING\|ACCEPTED\|DECLINED\|EXPIRED`) | YES — default `PENDING` |
| `expires_at` | timestamptz | YES — default `now() + 48h` |
| `created_at` | timestamptz | YES — `now()` |

---

### `active_team`
Define qual time está "ativo" para um dado perfil (chave primária = `profile_id`).

| Coluna | Tipo | Nullable |
|---|---|---|
| `profile_id` | uuid | NO — PK, FK `profiles.id` |
| `team_id` | uuid | YES — FK `teams.id` |
| `updated_at` | timestamptz | NO — `now()` |

---

### `tournaments`
Torneios cadastrados na plataforma.

> ⚠️ **Diff v anterior:** `is_featured` → `featured`; `discord_webhook` → `discord_webhook_url`.
> Adicionados `registration_deadline`, `starts_at` (generated), `ends_at`, `queue_type`, `min_members`, `max_members`.

| Coluna | Tipo / Enum | Nullable | Default / Check |
|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `name` | text | NO | — |
| `slug` | text | NO | UNIQUE |
| `description` | text | YES | — |
| `status` | `tournament_status` | NO | `'DRAFT'` |
| `bracket_type` | `bracket_type` | NO | `'SINGLE_ELIMINATION'` |
| `max_teams` | int4 | NO | `8` — check `>= 2` |
| `min_members` | int4 | NO | `1` |
| `max_members` | int4 | NO | `10` |
| `min_tier` | text | YES | — |
| `queue_type` | text | NO | `'SUMMONERS_RIFT_5v5'` — check: `SR_5v5\|SR_DRAFT\|SR_BLIND\|SR_ARAM\|HOWLING_ABYSS_ARAM` |
| `prize_pool` | text | YES | — |
| `rules` | text | YES | — |
| `start_date` | timestamptz | YES | — |
| `end_date` | timestamptz | YES | — |
| `ends_at` | timestamptz | YES | — |
| `starts_at` | timestamptz | YES | GENERATED = `start_date` |
| `registration_deadline` | timestamptz | YES | — |
| `banner_url` | text | YES | — |
| `featured` | bool | YES | `false` |
| `discord_webhook_url` | text | YES | — |
| `organizer_id` | uuid | YES | FK `profiles.id` |
| `created_by` | uuid | YES | FK `profiles.id` |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

---

### `tournament_rules`
Seções de regras detalhadas por torneio.

> ⚠️ **Diff v anterior:** coluna `order` renomeada para `rule_order`.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `tournament_id` | uuid | NO — FK `tournaments.id` |
| `section` | text | NO |
| `content` | text | NO |
| `rule_order` | int4 | YES — default `1` |
| `created_at` | timestamptz | YES — `now()` |

---

### `tournament_stages`
Fases de um torneio (grupos, quartas, semifinais, etc.).

> ⚠️ **Diff v anterior:** removido `is_current`. Adicionados `status`, `num_groups`, `teams_per_group`, `qualifiers_per_group`, `started_at`, `updated_at`.

| Coluna | Tipo / Enum | Nullable | Default / Check |
|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `tournament_id` | uuid | NO — FK `tournaments.id` | |
| `name` | text | NO | |
| `stage_order` | int4 | NO | `1` |
| `bracket_type` | `bracket_type` | YES | |
| `best_of` | int4 | NO | `1` — check: `1\|3\|5` |
| `status` | text | NO | `'pending'` — check: `pending\|active\|finished` |
| `num_groups` | int4 | NO | `1` |
| `teams_per_group` | int4 | NO | `4` |
| `qualifiers_per_group` | int4 | NO | `2` |
| `started_at` | timestamptz | YES | |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

---

### `seedings`
Seed numérico de cada time por torneio.

| Coluna | Tipo | Nullable | Default / Check |
|---|---|---|---|
| `id` | uuid | NO | |
| `tournament_id` | uuid | NO — FK `tournaments.id` | |
| `team_id` | uuid | NO — FK `teams.id` | |
| `seed` | int4 | NO | check `>= 1` |
| `method` | text | NO | `'MANUAL'` — check: `MANUAL\|RANKING\|RANDOM` |
| `created_at` | timestamptz | YES | `now()` |

---

### `inscricoes`
Inscrições de times em torneios com check-in integrado.

| Coluna | Tipo / Enum | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `tournament_id` | uuid | NO — FK `tournaments.id` | |
| `team_id` | uuid | NO — FK `teams.id` | |
| `status` | `inscricao_status` | NO | `'PENDING'` |
| `requested_by` | uuid | YES — FK `profiles.id` | |
| `reviewed_by` | uuid | YES — FK `profiles.id` | |
| `reviewed_at` | timestamptz | YES | |
| `notes` | text | YES | |
| `checked_in` | bool | NO | `false` |
| `checked_in_at` | timestamptz | YES | |
| `checked_in_by` | uuid | YES — FK `auth.users.id` | |
| `created_at` | timestamptz | NO | `now()` |

---

### `matches`
Séries (BO1/3/5) dentro de uma fase do torneio. **Integração Tournament API completa embutida.**

> ⚠️ **Diff v anterior:** massivamente expandido. Adicionados `live_game_data`, `tournament_codes` (array jsonb),
> `codes_generated_at`, `codes_expire_at`, `riot_tournament_id`, `riot_provider_id`, `match_order`, `notes`.

| Coluna | Tipo / Enum | Nullable | Default / Check |
|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `tournament_id` | uuid | NO — FK `tournaments.id` | |
| `stage_id` | uuid | YES — FK `tournament_stages.id` | |
| `team_a_id` | uuid | YES — FK `teams.id` | |
| `team_b_id` | uuid | YES — FK `teams.id` | |
| `winner_id` | uuid | YES — FK `teams.id` | |
| `status` | `match_status` | NO | `'SCHEDULED'` |
| `format` | text | NO | `'BO1'` — check: `BO1\|BO3\|BO5` |
| `best_of` | int4 | NO | `1` |
| `round` | int4 | NO | `1`, check `>= 1` |
| `match_number` | int4 | NO | `1` |
| `match_order` | int4 | NO | `1` |
| `score_a` | int4 | YES | check `>= 0` |
| `score_b` | int4 | YES | check `>= 0` |
| `notes` | text | YES | |
| `riot_match_id` | text | YES | |
| `tournament_code` | text | YES | legado — preferir `tournament_codes` jsonb |
| `tournament_codes` | jsonb | YES | `'[]'` — `[{code,game_number,used,used_at}]` |
| `codes_generated_at` | timestamptz | YES | null = não gerado ainda |
| `codes_expire_at` | timestamptz | YES | `codes_generated_at + 90d` |
| `riot_tournament_id` | int8 | YES | |
| `riot_provider_id` | int8 | YES | |
| `live_game_data` | jsonb | YES | cache Spectator v5 |
| `scheduled_at` | timestamptz | YES | |
| `started_at` | timestamptz | YES | preenchido via Spectator v5 |
| `played_at` | timestamptz | YES | |
| `finished_at` | timestamptz | YES | |
| `created_at` | timestamptz | NO | `now()` |
| `updated_at` | timestamptz | NO | `now()` |

---

### `match_games`
Jogos individuais dentro de uma série.

> ⚠️ **Diff v anterior:** `duration` renomeado para `duration_sec`. Adicionado `picks_bans` (jsonb).

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `match_id` | uuid | NO — FK `matches.id` |
| `game_number` | int4 | NO — check `>= 1` |
| `winner_id` | uuid | YES — FK `teams.id` |
| `riot_game_id` | text | YES |
| `duration_sec` | int4 | YES — check `>= 0` |
| `picks_bans` | jsonb | YES |
| `played_at` | timestamptz | YES |
| `created_at` | timestamptz | NO — `now()` |

---

### `tournament_match_results`
Payload bruto JSON retornado pela Riot Tournament API após cada jogo.

> ⚠️ **Diff v anterior:** removido `riot_match_id`. Adicionados `game_id` (bigint), `origin_ip`, `processing_at`.

| Coluna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `tournament_code` | text | NO — UNIQUE | |
| `match_id` | uuid | YES — FK `matches.id` | |
| `game_id` | int8 | YES | |
| `game_data` | jsonb | NO | |
| `processed` | bool | YES | `false` |
| `received_at` | timestamptz | YES | `now()` |
| `origin_ip` | text | YES | |
| `processing_at` | timestamptz | YES | null = disponível; não-null há > 10min = retry |

---

### `player_stats`
Estatísticas de um jogador por game individual.

> ⚠️ **Diff v anterior:** `damage` → `damage_dealt`; `gold` → `gold_earned`.
> Removidos `champion_id` + `champion_name` separados — banco usa coluna única `champion` (text).
> Adicionado `game_duration`.

| Coluna | Tipo | Nullable | Default |
|---|---|---|---|
| `id` | uuid | NO | `uuid_generate_v4()` |
| `game_id` | uuid | NO — FK `match_games.id` | |
| `player_id` | uuid | YES — FK `players.id` | |
| `riot_account_id` | uuid | YES — FK `riot_accounts.id` | |
| `team_id` | uuid | YES — FK `teams.id` | |
| `champion` | text | YES | nome do campeão |
| `role` | `player_role` | YES | |
| `kills` | int4 | NO | `0`, check `>= 0` |
| `deaths` | int4 | NO | `0`, check `>= 0` |
| `assists` | int4 | NO | `0`, check `>= 0` |
| `cs` | int4 | NO | `0`, check `>= 0` |
| `vision_score` | int4 | NO | `0`, check `>= 0` |
| `damage_dealt` | int4 | NO | `0`, check `>= 0` |
| `gold_earned` | int4 | NO | `0` |
| `wards_placed` | int4 | NO | `0` |
| `game_duration` | int4 | YES | segundos |
| `win` | bool | NO | `false` |
| `is_mvp` | bool | NO | `false` |
| `created_at` | timestamptz | NO | `now()` |

---

### `disputes`
Disputas de resultado abertas por capitão, resolvidas por organizador/admin.

> ⚠️ **Diff v anterior:** `resolved_at` não existe no banco — usar `updated_at` para rastrear resolução.

| Coluna | Tipo / Enum | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `match_id` | uuid | NO — FK `matches.id` |
| `reported_by` | uuid | YES — FK `profiles.id` |
| `resolved_by` | uuid | YES — FK `profiles.id` |
| `status` | `dispute_status` | YES — default `'OPEN'` |
| `reason` | text | NO |
| `evidence_url` | text | YES |
| `resolution_notes` | text | YES |
| `created_at` | timestamptz | YES — `now()` |
| `updated_at` | timestamptz | YES — `now()` |

---

### `prize_distribution`
Distribuição de prêmios por colocação.

> ⚠️ **Diff v anterior:** adicionada coluna `value` (text) que estava faltando na doc.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `tournament_id` | uuid | NO — FK `tournaments.id` |
| `placement` | int4 | NO — check `>= 1` |
| `description` | text | NO |
| `value` | text | NO |
| `created_at` | timestamptz | YES — `now()` |

---

### `notifications`
Notificações por usuário, protegidas por RLS.

> ⚠️ **Diff v anterior:** adicionados `type`, `message`, `expires_at`.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `user_id` | uuid | NO — FK `profiles.id` |
| `type` | text | NO |
| `title` | text | NO |
| `body` | text | YES |
| `message` | text | YES |
| `link` | text | YES |
| `metadata` | jsonb | YES |
| `read` | bool | NO — default `false` |
| `expires_at` | timestamptz | YES |
| `created_at` | timestamptz | NO — `now()` |

---

### `site_terms_acceptance`
Registro de aceite dos termos da plataforma.

> ⚠️ **Diff v anterior:** coluna `user_agent` removida do banco.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `profile_id` | uuid | NO — FK `profiles.id` |
| `terms_version` | text | NO — default `'v1'` |
| `accepted_at` | timestamptz | NO — `now()` |
| `ip_address` | text | YES |

---

### `riot_tournament_registrations`
Registro único de provider + tournament na Riot API por torneio BRLOL.

> ⚠️ **Diff v anterior:** `riot_provider_id` e `riot_tournament_id` são **bigint** (int8), não int4.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `tournament_id` | uuid | NO — FK `tournaments.id` UNIQUE |
| `riot_provider_id` | int8 | NO |
| `riot_tournament_id` | int8 | NO |
| `region` | text | NO — default `'BR'` |
| `callback_url` | text | NO |
| `created_by` | uuid | YES — FK `profiles.id` |
| `created_at` | timestamptz | NO — `now()` |

---

### `tournament_announcements`
Comunicados do organizador para times do torneio, com suporte a canais e segmentação.

> ⚠️ **Diff v anterior:** adicionado `target_team_id` — comunicado direcionado a um time específico.

| Coluna | Tipo | Nullable | Default / Check |
|---|---|---|---|
| `id` | uuid | NO | `gen_random_uuid()` |
| `tournament_id` | uuid | NO — FK `tournaments.id` | |
| `sent_by` | uuid | YES — FK `profiles.id` | |
| `title` | text | NO | check: 5–150 chars |
| `body` | text | NO | check: 10–2000 chars |
| `channel` | text[] | NO | `ARRAY['email']` |
| `target` | text | NO | `'all'` — check: `all\|active\|eliminated` |
| `target_team_id` | uuid | YES — FK `teams.id` | para comunicado direcionado |
| `sent_at` | timestamptz | NO | `now()` |
| `created_at` | timestamptz | NO | `now()` |

---

### `audit_log`
Log de ações administrativas. Acessível apenas por admins via RLS.

| Coluna | Tipo | Nullable |
|---|---|---|
| `id` | uuid | NO |
| `admin_id` | uuid | YES — FK `auth.users.id` |
| `action` | text | NO |
| `table_name` | text | NO |
| `record_id` | text | YES |
| `old_data` | jsonb | YES |
| `new_data` | jsonb | YES |
| `ip_address` | inet | YES |
| `user_agent` | text | YES |
| `created_at` | timestamptz | NO — `now()` |

---

## Mapa de Foreign Keys

| Tabela | Coluna | Referencia |
|---|---|---|
| `active_team` | `profile_id` | `profiles.id` |
| `active_team` | `team_id` | `teams.id` |
| `audit_log` | `admin_id` | `auth.users.id` |
| `champion_masteries` | `riot_account_id` | `riot_accounts.id` |
| `disputes` | `match_id` | `matches.id` |
| `disputes` | `reported_by` | `profiles.id` |
| `disputes` | `resolved_by` | `profiles.id` |
| `inscricoes` | `checked_in_by` | `auth.users.id` |
| `inscricoes` | `requested_by` | `profiles.id` |
| `inscricoes` | `reviewed_by` | `profiles.id` |
| `inscricoes` | `team_id` | `teams.id` |
| `inscricoes` | `tournament_id` | `tournaments.id` |
| `match_games` | `match_id` | `matches.id` |
| `match_games` | `winner_id` | `teams.id` |
| `matches` | `stage_id` | `tournament_stages.id` |
| `matches` | `team_a_id` | `teams.id` |
| `matches` | `team_b_id` | `teams.id` |
| `matches` | `tournament_id` | `tournaments.id` |
| `matches` | `winner_id` | `teams.id` |
| `notifications` | `user_id` | `profiles.id` |
| `player_stats` | `game_id` | `match_games.id` |
| `player_stats` | `player_id` | `players.id` |
| `player_stats` | `riot_account_id` | `riot_accounts.id` |
| `player_stats` | `team_id` | `teams.id` |
| `players` | `riot_account_id` | `riot_accounts.id` |
| `prize_distribution` | `tournament_id` | `tournaments.id` |
| `rank_snapshots` | `riot_account_id` | `riot_accounts.id` |
| `riot_account_lock_logs` | `changed_by` | `profiles.id` |
| `riot_account_lock_logs` | `riot_account_id` | `riot_accounts.id` |
| `riot_accounts` | `locked_by` | `profiles.id` |
| `riot_accounts` | `profile_id` | `profiles.id` |
| `riot_tournament_registrations` | `created_by` | `profiles.id` |
| `riot_tournament_registrations` | `tournament_id` | `tournaments.id` |
| `seedings` | `team_id` | `teams.id` |
| `seedings` | `tournament_id` | `tournaments.id` |
| `site_terms_acceptance` | `profile_id` | `profiles.id` |
| `team_invites` | `invited_by` | `profiles.id` |
| `team_invites` | `invited_profile_id` | `profiles.id` |
| `team_invites` | `team_id` | `teams.id` |
| `team_members` | `invited_by` | `profiles.id` |
| `team_members` | `profile_id` | `profiles.id` |
| `team_members` | `riot_account_id` | `riot_accounts.id` |
| `team_members` | `team_id` | `teams.id` |
| `teams` | `owner_id` | `profiles.id` |
| `teams` | `tournament_id` | `tournaments.id` |
| `tournament_announcements` | `sent_by` | `profiles.id` |
| `tournament_announcements` | `target_team_id` | `teams.id` |
| `tournament_announcements` | `tournament_id` | `tournaments.id` |
| `tournament_match_results` | `match_id` | `matches.id` |
| `tournament_rules` | `tournament_id` | `tournaments.id` |
| `tournament_stages` | `tournament_id` | `tournaments.id` |
| `tournaments` | `created_by` | `profiles.id` |
| `tournaments` | `organizer_id` | `profiles.id` |

---

## Bugs conhecidos nos actions

### `disputa.ts` — campo errado no INSERT
```ts
// ❌ ERRADO (atual em disputa.ts)
opened_by: profile.id

// ✅ CORRETO (conforme FK real do banco)
reported_by: profile.id
```

### Actions usando nomes de coluna desatualizados

| Coluna antiga (doc v anterior) | Coluna correta (banco real) |
|---|---|
| `captured_at` em `rank_snapshots` | `snapshotted_at` |
| `duration` em `match_games` | `duration_sec` |
| `order` em `tournament_rules` | `rule_order` |
| `is_featured` em `tournaments` | `featured` |
| `discord_webhook` em `tournaments` | `discord_webhook_url` |
| `damage` em `player_stats` | `damage_dealt` |
| `gold` em `player_stats` | `gold_earned` |
| `champion_id` / `champion_name` em `player_stats` | `champion` (coluna única, text) |
| `is_locked` em `riot_accounts` | `lock_status` (3 estados: unlocked / locked_permanent / locked_until) |
| `riot_provider_id`/`riot_tournament_id` como int4 | int8 (bigint) |
