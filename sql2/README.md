# sql2 — Backups pg_dump do Supabase

Esta pasta armazena backups completos do banco de dados gerados via `pg_dump`.

## Arquivos

| Arquivo | Data | Versão PG | Descrição |
|---|---|---|---|
| `2026-04-26_134812.sql` | 2026-04-26 13:49 | 17.6 (dump 18.3) | Backup completo — schema public + auth + storage + realtime |

## Como restaurar

```bash
psql -h <host> -U postgres -d postgres < 2026-04-26_134812.sql
```

## Estrutura do schema `public` (mapeado do backup)

### Tabelas principais

| Tabela | Descrição |
|---|---|
| `tournaments` | Torneios — owner: `organizer_id`, status via enum `tournament_status` |
| `tournament_stages` | Fases do torneio (SINGLE_ELIMINATION etc), `best_of` 1/3/5 |
| `tournament_rules` | Regras por seção, texto livre |
| `teams` | Times vinculados a um torneio — `owner_id`, `tag` 1-6 chars |
| `team_members` | Membros do time — roles: `captain`/`member`, status: `pending`/`accepted` |
| `team_invites` | Convites por sumoner name + tagline, expira em 8 dias |
| `players` | Players legacy com `role`, `tier`, `lp` etc |
| `matches` | Partidas — `team_a_id`, `team_b_id`, `winner_id`, `score_a`, `score_b`, `best_of` |
| `match_games` | Jogos individuais dentro da partida — `picks_bans` em JSONB |
| `player_stats` | Stats por jogo — kills/deaths/assists/cs/vision/damage |
| `inscricoes` | Inscrições de times em torneios — status: PENDING/APPROVED/REJECTED |
| `seedings` | Ordem dos times no bracket — method: MANUAL/RANKING/RANDOM |
| `prize_distribution` | Premiações por colocação |
| `disputes` | Disputas de resultado — status: OPEN/etc |
| `profiles` | Usuários da plataforma — `is_admin`, `is_banned`, `role` |
| `riot_accounts` | Contas Riot vinculadas (puuid, gamename, tagline) |
| `rank_snapshots` | Histórico de rank por conta Riot |
| `champion_masteries` | Maestrias de campeões por conta Riot |
| `notifications` | Notificações in-app por usuário |
| `audit_log` | Log de auditoria de ações admin |
| `site_terms_acceptance` | Aceite dos termos pelo organizador |
| `active_team` | Time ativo atual de um perfil |

### Enums relevantes

```sql
-- match_status: SCHEDULED, IN_PROGRESS, FINISHED, CANCELLED, etc.
-- bracket_type: SINGLE_ELIMINATION, DOUBLE_ELIMINATION, SWISS, ROUND_ROBIN
-- player_role: TOP, JUNGLE, MID, ADC, SUPPORT
-- user_role: player, organizer, admin
-- invite_status: PENDING, ACCEPTED, DECLINED
-- inscricao_status: PENDING, APPROVED, REJECTED
-- dispute_status: OPEN, RESOLVED, etc.
-- team_member_role: captain, member
-- team_member_status: pending, accepted
```

### Triggers ativos

| Trigger | Tabela | Evento | Função |
|---|---|---|---|
| `trg_match_finished` | matches | AFTER UPDATE | `trg_match_finished()` |
| `trg_tournament_started` | tournaments | AFTER UPDATE | `trg_tournament_started()` |
| `trg_inscricao_nova` | inscricoes | AFTER INSERT | `trg_inscricao_nova()` |
| `trg_inscricao_status_change` | inscricoes | AFTER UPDATE | `trg_inscricao_status_change()` |
| `trg_auto_captain` | teams | AFTER INSERT | `auto_add_captain_as_member()` |
| `on_auth_user_created` | auth.users | AFTER INSERT | `handle_new_user()` |
| `set_tournament_slug` | tournaments | BEFORE INSERT/UPDATE | `generate_tournament_slug()` |
| `audit_matches_trigger` | matches | AFTER INSERT/UPDATE | `audit_matches_changes()` |
| `trg_riot_accounts_primary` | riot_accounts | BEFORE INSERT/UPDATE | `ensure_single_primary_riot_account()` |

### Pontos de atenção identificados

1. **`matches.team_a_id` / `matches.team_b_id`** — colunas existem no banco com nomes `team_a_id`/`team_b_id`. O código deve fazer `.select()` incluindo essas colunas explicitamente — erro foi corrigido em `lib/actions/partida.ts`.

2. **`match_games.picks_bans`** — armazenado como `JSONB` (não tabela separada). Se houver tabela `picks_bans` separada no código, verificar consistência.

3. **Políticas RLS duplicadas** — existem policies com nomes diferentes mas mesma lógica (ex: `teams_select_all` e `teams_select_public` ambas com `USING (true)`). Recomendado limpar duplicatas.

4. **`tournaments.starts_at`** — coluna GENERATED ALWAYS AS `start_date` STORED. Não inserir diretamente.

5. **`team_members` tabela nova** — adicionada recentemente (OID 19831). Verificar se todos os flows de convite/aceite usam essa tabela em vez de `team_invites`.

6. **Limite de torneios por organizador** — comentário no schema: `LIMITE 2 torneios não-cancelados por organizador`. Garantir que a trigger ou RLS implemente isso.
