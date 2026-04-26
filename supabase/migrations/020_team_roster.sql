-- =============================================================
-- 020_team_roster.sql
-- Sprint 3 — sistema de convites de time
--
-- team_members já existe (016). Esta migration adiciona:
--   1. ENUM invite_status
--   2. Tabela team_invites
--   3. Índices
--   4. RLS policies
--   5. GRANTS
--   6. Função helper: accept_team_invite()
--   7. Trigger: expirar convites aceitos/rejeitados automaticamente
-- =============================================================

-- ---------------------------------------------------------------
-- 1. ENUM invite_status
-- ---------------------------------------------------------------
do $$ begin
  create type invite_status as enum ('PENDING', 'ACCEPTED', 'REJECTED', 'EXPIRED');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------
-- 2. Tabela team_invites
--    Convites enviados pelo capitão a jogadores (por summoner name)
-- ---------------------------------------------------------------
create table if not exists public.team_invites (
  id             uuid primary key default extensions.uuid_generate_v4(),
  team_id        uuid not null references public.teams(id) on delete cascade,
  invited_by     uuid references public.profiles(id) on delete set null,
  summoner_name  text not null,
  tagline        text not null default 'BR1',
  role           player_role,                          -- enum do schema anterior
  status         invite_status not null default 'PENDING',
  expires_at     timestamptz not null default (now() + interval '48 hours'),
  created_at     timestamptz not null default now(),

  -- Impede duplicata de convite pendente para o mesmo summoner no mesmo time
  constraint uq_team_invites_pending
    unique (team_id, summoner_name, tagline)
);

-- ---------------------------------------------------------------
-- 3. Índices
-- ---------------------------------------------------------------
create index if not exists idx_team_invites_team
  on public.team_invites(team_id);

create index if not exists idx_team_invites_status
  on public.team_invites(status);

create index if not exists idx_team_invites_expires
  on public.team_invites(expires_at)
  where status = 'PENDING';

-- ---------------------------------------------------------------
-- 4. RLS
-- ---------------------------------------------------------------
alter table public.team_invites enable row level security;

-- SELECT: capitão do time OU admin vê todos os convites do time
create policy "team_invites_select"
  on public.team_invites for select
  using (
    public.is_admin(auth.uid())
    or team_id in (
      select id from public.teams where owner_id = auth.uid()
    )
    or invited_by = auth.uid()
  );

-- INSERT: apenas o capitão (owner) pode convidar
create policy "team_invites_insert"
  on public.team_invites for insert
  with check (
    public.is_admin(auth.uid())
    or team_id in (
      select id from public.teams where owner_id = auth.uid()
    )
  );

-- UPDATE: capitão pode editar / admin pode tudo
create policy "team_invites_update"
  on public.team_invites for update
  using (
    public.is_admin(auth.uid())
    or team_id in (
      select id from public.teams where owner_id = auth.uid()
    )
  );

-- DELETE: capitão cancela / admin
create policy "team_invites_delete"
  on public.team_invites for delete
  using (
    public.is_admin(auth.uid())
    or team_id in (
      select id from public.teams where owner_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------
-- 5. GRANTS
-- ---------------------------------------------------------------
grant all on public.team_invites to service_role;
grant select, insert, update, delete on public.team_invites to authenticated;

-- ---------------------------------------------------------------
-- 6. Função: accept_team_invite
--    Chamada pela action quando o jogador aceita o convite.
--    Transaciona: valida expiração → aceita convite → upsert em team_members
-- ---------------------------------------------------------------
create or replace function public.accept_team_invite(
  p_invite_id   uuid,
  p_profile_id  uuid,
  p_riot_acc_id uuid default null
)
returns jsonb language plpgsql security definer as $$
declare
  v_invite  public.team_invites%rowtype;
  v_role    team_member_role := 'member';
begin
  -- Busca e trava o convite
  select * into v_invite
    from public.team_invites
    where id = p_invite_id
    for update;

  if not found then
    return jsonb_build_object('error', 'Convite não encontrado');
  end if;

  if v_invite.status <> 'PENDING' then
    return jsonb_build_object('error', 'Convite não está mais pendente');
  end if;

  if v_invite.expires_at < now() then
    update public.team_invites set status = 'EXPIRED' where id = p_invite_id;
    return jsonb_build_object('error', 'Convite expirado');
  end if;

  -- Mapeia role do convite para team_member_role
  if v_invite.role is not null then
    v_role := case
      when v_invite.role::text = 'captain' then 'captain'
      else 'member'
    end::team_member_role;
  end if;

  -- Marca convite como aceito
  update public.team_invites
    set status = 'ACCEPTED'
    where id = p_invite_id;

  -- Upsert em team_members
  insert into public.team_members (
    team_id, profile_id, riot_account_id, team_role, status,
    invited_by, invited_at, responded_at
  ) values (
    v_invite.team_id, p_profile_id, p_riot_acc_id, v_role, 'accepted',
    v_invite.invited_by, v_invite.created_at, now()
  )
  on conflict (team_id, profile_id)
    do update set
      status       = 'accepted',
      responded_at = now(),
      team_role    = excluded.team_role;

  -- Define como time ativo do jogador
  insert into public.active_team (profile_id, team_id)
    values (p_profile_id, v_invite.team_id)
    on conflict (profile_id)
      do update set team_id = excluded.team_id, updated_at = now();

  return jsonb_build_object('success', true, 'team_id', v_invite.team_id);
end;
$$;

grant execute on function public.accept_team_invite(uuid, uuid, uuid) to authenticated;
grant execute on function public.accept_team_invite(uuid, uuid, uuid) to service_role;

-- ---------------------------------------------------------------
-- 7. Função + Trigger: expirar convites PENDING vencidos
--    Roda a cada UPDATE na tabela (lazy expiration)
--    Para expiração proativa, configurar cron no Supabase:
--    SELECT cron.schedule('expire-invites', '0 * * * *',
--      $$UPDATE public.team_invites SET status='EXPIRED'
--        WHERE status='PENDING' AND expires_at < now()$$);
-- ---------------------------------------------------------------
create or replace function public.expire_pending_invites()
returns trigger language plpgsql security definer as $$
begin
  if new.status = 'PENDING' and new.expires_at < now() then
    new.status := 'EXPIRED';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_expire_invite on public.team_invites;
create trigger trg_expire_invite
  before insert or update on public.team_invites
  for each row execute function public.expire_pending_invites();
