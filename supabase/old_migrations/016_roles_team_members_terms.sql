-- =============================================================
-- 016_roles_team_members_terms.sql
-- Novos papéis (role), membros de time, time ativo, termos
-- =============================================================

-- ---------------------------------------------------------------
-- 1. ENUM user_role
-- ---------------------------------------------------------------
do $$ begin
  create type user_role as enum ('player', 'organizer', 'admin');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------
-- 2. Adicionar role em profiles (mantém is_admin por compat.)
-- ---------------------------------------------------------------
alter table public.profiles
  add column if not exists role user_role not null default 'player';

-- Migrar quem já era admin
update public.profiles set role = 'admin' where is_admin = true;

-- Helper atualizado: usa a nova coluna role
create or replace function public.is_admin(uid uuid)
returns boolean language sql security definer stable as $$
  select coalesce((select role = 'admin' from public.profiles where id = uid), false);
$$;

-- Helper: verifica organizador OU admin
create or replace function public.is_organizer_or_admin(uid uuid)
returns boolean language sql security definer stable as $$
  select coalesce((select role in ('organizer','admin') from public.profiles where id = uid), false);
$$;

-- Helper: verifica se uid é organizador do torneio específico
create or replace function public.is_tournament_organizer(uid uuid, tid uuid)
returns boolean language sql security definer stable as $$
  select exists (
    select 1 from public.tournaments
    where id = tid and (organizer_id = uid or created_by = uid)
  ) or public.is_admin(uid);
$$;

-- ---------------------------------------------------------------
-- 3. Adicionar organizer_id em tournaments
-- ---------------------------------------------------------------
alter table public.tournaments
  add column if not exists organizer_id uuid references public.profiles(id) on delete set null,
  add column if not exists slug text unique,
  add column if not exists rules text,                    -- regras definidas pelo organizador
  add column if not exists starts_at timestamptz,
  add column if not exists ends_at   timestamptz,
  add column if not exists min_members int not null default 6,
  add column if not exists max_members int not null default 10;

-- Preenche organizer_id a partir de created_by onde ainda nulo
update public.tournaments
  set organizer_id = created_by
  where organizer_id is null and created_by is not null;

-- ---------------------------------------------------------------
-- 4. Enum para status de membro de time
-- ---------------------------------------------------------------
do $$ begin
  create type team_member_status as enum ('pending', 'accepted', 'rejected', 'left');
exception when duplicate_object then null; end $$;

do $$ begin
  create type team_member_role as enum ('captain', 'member', 'substitute');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------
-- 5. Tabela team_members
-- ---------------------------------------------------------------
create table if not exists public.team_members (
  id              uuid primary key default gen_random_uuid(),
  team_id         uuid not null references public.teams(id) on delete cascade,
  profile_id      uuid not null references public.profiles(id) on delete cascade,
  riot_account_id uuid references public.riot_accounts(id) on delete set null,
  team_role       team_member_role not null default 'member',
  status          team_member_status not null default 'pending',
  invited_by      uuid references public.profiles(id) on delete set null,
  invited_at      timestamptz not null default now(),
  responded_at    timestamptz,
  unique (team_id, profile_id)
);

create index if not exists idx_team_members_team    on public.team_members(team_id);
create index if not exists idx_team_members_profile on public.team_members(profile_id);
create index if not exists idx_team_members_status  on public.team_members(status);

-- ---------------------------------------------------------------
-- 6. Tabela active_team — time ativo do jogador
-- ---------------------------------------------------------------
create table if not exists public.active_team (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  team_id    uuid references public.teams(id) on delete set null,
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------
-- 7. Tabela site_terms_acceptance — aceite dos termos do site
-- ---------------------------------------------------------------
create table if not exists public.site_terms_acceptance (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  terms_version text not null default 'v1',  -- versão das regras aceitas
  accepted_at timestamptz not null default now(),
  ip_address  text,
  unique (profile_id, terms_version)
);

-- ---------------------------------------------------------------
-- 8. RLS — team_members
-- ---------------------------------------------------------------
alter table public.team_members enable row level security;
alter table public.active_team  enable row level security;
alter table public.site_terms_acceptance enable row level security;

-- SELECT: membro do time vê os membros do time / admin vê tudo
create policy "team_members_select"
  on public.team_members for select
  using (
    auth.role() = 'authenticated'
    and (
      public.is_admin(auth.uid())
      or profile_id = auth.uid()
      or team_id in (
        select id from public.teams where owner_id = auth.uid()
      )
      or team_id in (
        select team_id from public.team_members
        where profile_id = auth.uid() and status = 'accepted'
      )
    )
  );

-- INSERT: só o capitão (owner) do time pode convidar / admin pode tudo
create policy "team_members_insert"
  on public.team_members for insert
  with check (
    public.is_admin(auth.uid())
    or team_id in (
      select id from public.teams where owner_id = auth.uid()
    )
  );

-- UPDATE: capitão pode editar membros do seu time / convidado responde ao próprio convite
create policy "team_members_update"
  on public.team_members for update
  using (
    public.is_admin(auth.uid())
    or team_id in (select id from public.teams where owner_id = auth.uid())
    or (profile_id = auth.uid() and status = 'pending')
  );

-- DELETE: capitão remove / próprio membro sai / admin
create policy "team_members_delete"
  on public.team_members for delete
  using (
    public.is_admin(auth.uid())
    or team_id in (select id from public.teams where owner_id = auth.uid())
    or profile_id = auth.uid()
  );

-- active_team: cada um gerencia o seu
create policy "active_team_select" on public.active_team for select using (profile_id = auth.uid());
create policy "active_team_upsert" on public.active_team for all   using (profile_id = auth.uid());

-- site_terms: cada um vê/insere o seu
create policy "terms_select" on public.site_terms_acceptance for select using (profile_id = auth.uid());
create policy "terms_insert" on public.site_terms_acceptance for insert with check (profile_id = auth.uid());

-- ---------------------------------------------------------------
-- 9. Atualizar RLS de tournaments para organizadores
-- ---------------------------------------------------------------
-- Dropar políticas antigas de insert/update/delete
drop policy if exists "tournaments_insert_admin"  on public.tournaments;
drop policy if exists "tournaments_update_admin"  on public.tournaments;
drop policy if exists "tournaments_delete_admin"  on public.tournaments;

-- INSERT: admin ou organizer (aceite de termos verificado no app)
create policy "tournaments_insert_organizer_or_admin"
  on public.tournaments for insert
  with check (public.is_organizer_or_admin(auth.uid()));

-- UPDATE: admin OU organizador do próprio torneio
create policy "tournaments_update_organizer_or_admin"
  on public.tournaments for update
  using (
    public.is_admin(auth.uid())
    or (auth.uid() = organizer_id and public.is_organizer_or_admin(auth.uid()))
  );

-- DELETE: só admin master
create policy "tournaments_delete_admin"
  on public.tournaments for delete
  using (public.is_admin(auth.uid()));

-- ---------------------------------------------------------------
-- 10. Atualizar RLS de inscricoes para organizadores
-- ---------------------------------------------------------------
drop policy if exists "inscricoes_update_admin" on public.inscricoes;

create policy "inscricoes_update_organizer_or_admin"
  on public.inscricoes for update
  using (
    public.is_admin(auth.uid())
    or public.is_tournament_organizer(auth.uid(), tournament_id)
  );

-- ---------------------------------------------------------------
-- 11. GRANTS para novas tabelas
-- ---------------------------------------------------------------
grant all on public.team_members           to service_role;
grant all on public.active_team            to service_role;
grant all on public.site_terms_acceptance  to service_role;

grant select, insert, update, delete on public.team_members          to authenticated;
grant select, insert, update         on public.active_team           to authenticated;
grant select, insert                 on public.site_terms_acceptance to authenticated;

-- ---------------------------------------------------------------
-- 12. Inserir capitão como membro ao criar o time
--     Trigger em teams.insert
-- ---------------------------------------------------------------
create or replace function public.auto_add_captain_as_member()
returns trigger language plpgsql security definer as $$
declare
  v_riot_id uuid;
begin
  -- Busca conta Riot primária do capitão
  select id into v_riot_id
    from public.riot_accounts
    where profile_id = new.owner_id and is_primary = true
    limit 1;

  insert into public.team_members (
    team_id, profile_id, riot_account_id, team_role, status, invited_by, responded_at
  ) values (
    new.id, new.owner_id, v_riot_id, 'captain', 'accepted', new.owner_id, now()
  )
  on conflict (team_id, profile_id) do nothing;

  -- Define como time ativo do capitão
  insert into public.active_team (profile_id, team_id)
    values (new.owner_id, new.id)
    on conflict (profile_id) do update set team_id = excluded.team_id, updated_at = now();

  return new;
end;
$$;

drop trigger if exists trg_auto_captain on public.teams;
create trigger trg_auto_captain
  after insert on public.teams
  for each row execute function public.auto_add_captain_as_member();
