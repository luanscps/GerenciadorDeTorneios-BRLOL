-- =============================================================
-- 002_schema_expansion.sql
-- Expansao do schema: GerenciadorDeTorneios-BRLOL
-- Novas tabelas, colunas e RLS baseados no roadmap v2
-- =============================================================

-- ---------------------------------------------------------------
-- PASSO 1: NOVA TABELA tournament_stages
-- Criada ANTES de alterar matches (FK depende dela)
-- ---------------------------------------------------------------
drop trigger if exists trg_stages_updated_at on public.tournament_stages;

create table if not exists public.tournament_stages (
  id            uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  stage_order   int  not null default 1,
  bracket_type  bracket_type,
  best_of       int  not null default 1 check (best_of in (1, 3, 5)),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_stages_tournament on public.tournament_stages(tournament_id);

create trigger trg_stages_updated_at
  before update on public.tournament_stages
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- PASSO 2: NOVAS COLUNAS EM TABELAS EXISTENTES
-- ---------------------------------------------------------------

alter table public.matches
  add column if not exists format text not null default 'BO1';

alter table public.matches
  add constraint matches_format_check check (format in ('BO1','BO3','BO5'));

alter table public.matches
  add column if not exists stage_id uuid references public.tournament_stages(id) on delete set null;

alter table public.tournaments
  add column if not exists min_tier text;

alter table public.tournaments
  add column if not exists discord_webhook_url text;

alter table public.inscricoes
  add column if not exists checked_in_at timestamptz;

alter table public.teams
  add column if not exists is_eliminated boolean not null default false;

-- ---------------------------------------------------------------
-- PASSO 3: NOVA TABELA match_games
-- Cada jogo individual dentro de uma serie BO3/BO5
-- ---------------------------------------------------------------
create table if not exists public.match_games (
  id           uuid primary key default uuid_generate_v4(),
  match_id     uuid not null references public.matches(id) on delete cascade,
  game_number  int  not null check (game_number >= 1),
  winner_id    uuid references public.teams(id) on delete set null,
  riot_game_id text,
  duration_sec int  check (duration_sec >= 0),
  picks_bans   jsonb,
  played_at    timestamptz,
  created_at   timestamptz not null default now(),
  unique (match_id, game_number)
);

create index if not exists idx_match_games_match on public.match_games(match_id);

-- ---------------------------------------------------------------
-- PASSO 4: NOVA TABELA player_stats
-- Stats por jogador por jogo individual
-- ---------------------------------------------------------------
create table if not exists public.player_stats (
  id            uuid primary key default uuid_generate_v4(),
  game_id       uuid not null references public.match_games(id) on delete cascade,
  player_id     uuid references public.players(id) on delete set null,
  team_id       uuid references public.teams(id) on delete set null,
  champion      text,
  kills         int  not null default 0 check (kills >= 0),
  deaths        int  not null default 0 check (deaths >= 0),
  assists       int  not null default 0 check (assists >= 0),
  cs            int  not null default 0 check (cs >= 0),
  vision_score  int  not null default 0 check (vision_score >= 0),
  damage_dealt  int  not null default 0 check (damage_dealt >= 0),
  is_mvp        boolean not null default false,
  created_at    timestamptz not null default now()
);

create index if not exists idx_player_stats_game   on public.player_stats(game_id);
create index if not exists idx_player_stats_player on public.player_stats(player_id);
create index if not exists idx_player_stats_team   on public.player_stats(team_id);

-- ---------------------------------------------------------------
-- PASSO 5: NOVA TABELA audit_log
-- Registro de acoes administrativas
-- ---------------------------------------------------------------
create table if not exists public.audit_log (
  id           bigserial primary key,
  admin_id     uuid references public.profiles(id) on delete set null,
  action       text not null,
  target_table text,
  target_id    uuid,
  old_data     jsonb,
  new_data     jsonb,
  ip_address   inet,
  created_at   timestamptz not null default now()
);

create index if not exists idx_audit_admin  on public.audit_log(admin_id);
create index if not exists idx_audit_action on public.audit_log(action);
create index if not exists idx_audit_time   on public.audit_log(created_at desc);

-- ---------------------------------------------------------------
-- PASSO 6: NOVA TABELA notifications
-- Notificacoes in-app via Supabase Realtime
-- ---------------------------------------------------------------
create table if not exists public.notifications (
  id         uuid primary key default uuid_generate_v4(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  read       boolean not null default false,
  metadata   jsonb,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_user    on public.notifications(user_id);
create index if not exists idx_notifications_unread  on public.notifications(user_id) where read = false;
create index if not exists idx_notifications_expires on public.notifications(expires_at);

-- ---------------------------------------------------------------
-- PASSO 7: ROW LEVEL SECURITY nas novas tabelas
-- ---------------------------------------------------------------
alter table public.tournament_stages enable row level security;
alter table public.match_games       enable row level security;
alter table public.player_stats      enable row level security;
alter table public.audit_log         enable row level security;
alter table public.notifications     enable row level security;

drop policy if exists "stages_select_all" on public.tournament_stages;
drop policy if exists "stages_all_admin" on public.tournament_stages;
create policy "stages_select_all"
  on public.tournament_stages for select using (true);
create policy "stages_all_admin"
  on public.tournament_stages for all
  using (public.is_admin(auth.uid()));

drop policy if exists "match_games_select_all" on public.match_games;
drop policy if exists "match_games_all_admin" on public.match_games;
create policy "match_games_select_all"
  on public.match_games for select using (true);
create policy "match_games_all_admin"
  on public.match_games for all
  using (public.is_admin(auth.uid()));

drop policy if exists "player_stats_select_all" on public.player_stats;
drop policy if exists "player_stats_all_admin" on public.player_stats;
create policy "player_stats_select_all"
  on public.player_stats for select using (true);
create policy "player_stats_all_admin"
  on public.player_stats for all
  using (public.is_admin(auth.uid()));

drop policy if exists "audit_log_select_admin" on public.audit_log;
drop policy if exists "audit_log_insert_admin" on public.audit_log;
create policy "audit_log_select_admin"
  on public.audit_log for select
  using (public.is_admin(auth.uid()));
create policy "audit_log_insert_admin"
  on public.audit_log for insert
  with check (public.is_admin(auth.uid()));

drop policy if exists "notifications_select_own" on public.notifications;
drop policy if exists "notifications_update_own" on public.notifications;
drop policy if exists "notifications_insert_service" on public.notifications;
drop policy if exists "notifications_delete_own" on public.notifications;
create policy "notifications_select_own"
  on public.notifications for select
  using (auth.uid() = user_id);
create policy "notifications_update_own"
  on public.notifications for update
  using (auth.uid() = user_id);
create policy "notifications_insert_service"
  on public.notifications for insert
  with check (true);
create policy "notifications_delete_own"
  on public.notifications for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------
-- PASSO 8: GRANTS nas novas tabelas
-- ---------------------------------------------------------------
grant all on public.tournament_stages to service_role;
grant all on public.match_games       to service_role;
grant all on public.player_stats      to service_role;
grant all on public.audit_log         to service_role;
grant all on public.notifications     to service_role;
grant all on sequence public.audit_log_id_seq to service_role;

grant select on public.tournament_stages to anon, authenticated;
grant select on public.match_games       to anon, authenticated;
grant select on public.player_stats      to anon, authenticated;
grant select, insert, update, delete on public.notifications to authenticated;

-- ---------------------------------------------------------------
-- PASSO 9: VIEWS uteis para o frontend
-- ---------------------------------------------------------------

create or replace view public.v_stage_standings as
select
  ts.tournament_id,
  ts.id as stage_id,
  ts.name as stage_name,
  t.id as team_id,
  t.name as team_name,
  t.tag,
  count(m.id) filter (where m.winner_id = t.id) as wins,
  count(m.id) filter (where m.winner_id is not null and m.winner_id != t.id
    and (m.team_a_id = t.id or m.team_b_id = t.id)) as losses,
  count(m.id) filter (where m.winner_id = t.id) * 3 as points
from public.tournament_stages ts
join public.matches m on m.stage_id = ts.id
join public.teams t on t.id = m.team_a_id or t.id = m.team_b_id
where m.status = 'FINISHED'
group by ts.tournament_id, ts.id, ts.name, t.id, t.name, t.tag;

create or replace view public.v_player_tournament_kda as
select
  ps.player_id,
  p.summoner_name,
  m.tournament_id,
  count(ps.id) as games_played,
  round(avg(ps.kills)::numeric, 2)   as avg_kills,
  round(avg(ps.deaths)::numeric, 2)  as avg_deaths,
  round(avg(ps.assists)::numeric, 2) as avg_assists,
  round(
    case when avg(ps.deaths) = 0 then (avg(ps.kills) + avg(ps.assists))
    else (avg(ps.kills) + avg(ps.assists)) / avg(ps.deaths)
    end::numeric, 2
  ) as kda_ratio,
  count(ps.id) filter (where ps.is_mvp = true) as mvp_count
from public.player_stats ps
join public.players p on p.id = ps.player_id
join public.match_games mg on mg.id = ps.game_id
join public.matches m on m.id = mg.match_id
group by ps.player_id, p.summoner_name, m.tournament_id;

-- ---------------------------------------------------------------
-- FIM DA MIGRATION 002
-- ---------------------------------------------------------------