-- =============================================================
-- 001_initial_schema.sql
-- Schema inicial: GerenciadorDeTorneios-BRLOL
-- Executar no Supabase: SQL Editor > New Query > Run
-- Ou via CLI: supabase db push
-- =============================================================

-- ---------------------------------------------------------------
-- EXTENSOES
-- ---------------------------------------------------------------
create extension if not exists "uuid-ossp";
create extension if not exists "pg_trgm";

-- ---------------------------------------------------------------
-- ENUMS
-- ---------------------------------------------------------------
do $$ begin
  create type tournament_status as enum (
    'DRAFT','OPEN','IN_PROGRESS','FINISHED','CANCELLED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type bracket_type as enum (
    'SINGLE_ELIMINATION','DOUBLE_ELIMINATION','ROUND_ROBIN','SWISS'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type match_status as enum (
    'SCHEDULED','IN_PROGRESS','FINISHED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type inscricao_status as enum (
    'PENDING','APPROVED','REJECTED'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type player_role as enum (
    'TOP','JUNGLE','MID','ADC','SUPPORT'
  );
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------
-- TABELA: profiles
-- Espelha auth.users com campos extras (is_admin, is_banned)
-- ---------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text not null,
  full_name   text,
  avatar_url  text,
  is_admin    boolean not null default false,
  is_banned   boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Trigger: criar profile automaticamente apos signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    coalesce(new.raw_user_meta_data->>'avatar_url', '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------
-- TABELA: tournaments
-- ---------------------------------------------------------------
create table if not exists public.tournaments (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  status       tournament_status not null default 'DRAFT',
  bracket_type bracket_type not null default 'SINGLE_ELIMINATION',
  max_teams    int not null default 8 check (max_teams >= 2),
  prize_pool   text,
  start_date   timestamptz,
  end_date     timestamptz,
  created_by   uuid references public.profiles(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- TABELA: teams
-- ---------------------------------------------------------------
create table if not exists public.teams (
  id            uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name          text not null,
  tag           text not null check (length(tag) between 1 and 6),
  logo_url      text,
  owner_id      uuid references public.profiles(id) on delete set null,
  created_at    timestamptz not null default now(),
  unique (tournament_id, tag)
);

-- ---------------------------------------------------------------
-- TABELA: players
-- ---------------------------------------------------------------
create table if not exists public.players (
  id             uuid primary key default uuid_generate_v4(),
  team_id        uuid references public.teams(id) on delete set null,
  summoner_name  text not null,
  tag_line       text not null default 'BR1',
  puuid          text unique,
  role           player_role,
  tier           text not null default 'UNRANKED',
  rank           text not null default '',
  lp             int not null default 0 check (lp >= 0),
  wins           int not null default 0 check (wins >= 0),
  losses         int not null default 0 check (losses >= 0),
  profile_icon   int,
  summoner_level int,
  last_synced    timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists idx_players_team_id
  on public.players(team_id);
create index if not exists idx_players_puuid
  on public.players(puuid);
create extension if not exists pg_trgm with schema public;

set search_path = public, extensions, pg_catalog;

create index if not exists idx_players_name_trgm
  on public.players using gin (summoner_name gin_trgm_ops);

-- ---------------------------------------------------------------
-- TABELA: inscricoes
-- ---------------------------------------------------------------
create table if not exists public.inscricoes (
  id            uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id       uuid not null references public.teams(id) on delete cascade,
  requested_by  uuid references public.profiles(id) on delete set null,
  status        inscricao_status not null default 'PENDING',
  reviewed_by   uuid references public.profiles(id) on delete set null,
  reviewed_at   timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  unique (tournament_id, team_id)
);

-- ---------------------------------------------------------------
-- TABELA: matches
-- ---------------------------------------------------------------
create table if not exists public.matches (
  id            uuid primary key default uuid_generate_v4(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  round         int not null default 1 check (round >= 1),
  match_order   int not null default 1,
  status        match_status not null default 'SCHEDULED',
  team_a_id     uuid references public.teams(id) on delete set null,
  team_b_id     uuid references public.teams(id) on delete set null,
  winner_id     uuid references public.teams(id) on delete set null,
  score_a       int check (score_a >= 0),
  score_b       int check (score_b >= 0),
  riot_match_id text,
  scheduled_at  timestamptz,
  played_at     timestamptz,
  notes         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists idx_matches_tournament
  on public.matches(tournament_id);
create index if not exists idx_matches_round
  on public.matches(tournament_id, round);

-- ---------------------------------------------------------------
-- FUNCAO: atualizar updated_at automaticamente
-- ---------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create trigger trg_tournaments_updated_at
  before update on public.tournaments
  for each row execute function public.set_updated_at();

create trigger trg_players_updated_at
  before update on public.players
  for each row execute function public.set_updated_at();

create trigger trg_matches_updated_at
  before update on public.matches
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------
alter table public.profiles    enable row level security;
alter table public.tournaments enable row level security;
alter table public.teams       enable row level security;
alter table public.players     enable row level security;
alter table public.inscricoes  enable row level security;
alter table public.matches     enable row level security;

-- Helper: verifica se uid() eh admin
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable as $$
  select coalesce(
    (select is_admin from public.profiles where id = uid),
    false
  );
$$;

-- PROFILES --
create policy "profiles_select_all"
  on public.profiles for select using (true);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id);

create policy "profiles_update_admin"
  on public.profiles for update
  using (public.is_admin(auth.uid()));

-- TOURNAMENTS --
create policy "tournaments_select_all"
  on public.tournaments for select using (true);

create policy "tournaments_insert_admin"
  on public.tournaments for insert
  with check (public.is_admin(auth.uid()));

create policy "tournaments_update_admin"
  on public.tournaments for update
  using (public.is_admin(auth.uid()));

create policy "tournaments_delete_admin"
  on public.tournaments for delete
  using (public.is_admin(auth.uid()));

-- TEAMS --
create policy "teams_select_all"
  on public.teams for select using (true);

create policy "teams_insert_owner_or_admin"
  on public.teams for insert
  with check (auth.uid() = owner_id or public.is_admin(auth.uid()));

create policy "teams_update_owner_or_admin"
  on public.teams for update
  using (auth.uid() = owner_id or public.is_admin(auth.uid()));

create policy "teams_delete_admin"
  on public.teams for delete
  using (public.is_admin(auth.uid()));

-- PLAYERS --
create policy "players_select_all"
  on public.players for select using (true);

create policy "players_insert_admin"
  on public.players for insert
  with check (public.is_admin(auth.uid()));

create policy "players_update_admin"
  on public.players for update
  using (public.is_admin(auth.uid()));

create policy "players_delete_admin"
  on public.players for delete
  using (public.is_admin(auth.uid()));

-- INSCRICOES --
create policy "inscricoes_select_auth"
  on public.inscricoes for select
  using (auth.role() = 'authenticated');

create policy "inscricoes_insert_user"
  on public.inscricoes for insert
  with check (auth.uid() = requested_by);

create policy "inscricoes_update_admin"
  on public.inscricoes for update
  using (public.is_admin(auth.uid()));

create policy "inscricoes_delete_admin"
  on public.inscricoes for delete
  using (public.is_admin(auth.uid()));

-- MATCHES --
create policy "matches_select_all"
  on public.matches for select using (true);

create policy "matches_all_admin"
  on public.matches for all
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------
-- GRANTS
-- ---------------------------------------------------------------
grant usage on schema public to service_role, anon, authenticated;
grant all   on all tables    in schema public to service_role;
grant all   on all sequences in schema public to service_role;
grant all   on all functions in schema public to service_role;

grant select on public.tournaments to anon, authenticated;
grant select on public.teams       to anon, authenticated;
grant select on public.players     to anon, authenticated;
grant select on public.matches     to anon, authenticated;
grant select on public.profiles    to anon, authenticated;

grant select, insert, update on public.inscricoes to authenticated;
grant select, insert, update on public.teams      to authenticated;

-- ---------------------------------------------------------------
-- COMO TORNAR O PRIMEIRO USUARIO ADMIN:
-- Apos criar a conta no app, rode no SQL Editor:
--   UPDATE public.profiles
--   SET is_admin = true
--   WHERE email = 'seu@email.com';
-- ---------------------------------------------------------------
