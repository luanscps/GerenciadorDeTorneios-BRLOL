--
-- 009_create_riot_accounts.sql
-- Cria o schema Riot usado pelo app, ausente no snapshot atual
-- Referência:
--   - ausência de tabelas Riot no diretório sql exportado
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------
-- riot_accounts
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.riot_accounts (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id    uuid        NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  puuid         text        NOT NULL,
  game_name     text        NOT NULL,
  tagline       text        NOT NULL,
  summoner_id   text,
  summoner_level integer,
  profile_icon_id integer,
  is_primary    boolean     NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_riot_accounts_puuid
  ON public.riot_accounts(puuid);

CREATE UNIQUE INDEX IF NOT EXISTS idx_riot_accounts_primary_per_profile
  ON public.riot_accounts(profile_id) WHERE is_primary = true;

CREATE INDEX IF NOT EXISTS idx_riot_accounts_profile_id
  ON public.riot_accounts(profile_id);

CREATE OR REPLACE FUNCTION public.ensure_single_primary_riot_account()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.is_primary THEN
    UPDATE public.riot_accounts
      SET is_primary = false
      WHERE profile_id = NEW.profile_id
        AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
        AND is_primary = true;
  ELSIF TG_OP = 'INSERT' THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.riot_accounts
      WHERE profile_id = NEW.profile_id AND is_primary = true
    ) THEN
      NEW.is_primary := true;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_riot_accounts_updated_at ON public.riot_accounts;
CREATE TRIGGER trg_riot_accounts_updated_at
  BEFORE UPDATE ON public.riot_accounts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_riot_accounts_primary ON public.riot_accounts;
CREATE TRIGGER trg_riot_accounts_primary
  BEFORE INSERT OR UPDATE ON public.riot_accounts
  FOR EACH ROW EXECUTE FUNCTION public.ensure_single_primary_riot_account();

-- -----------------------------------------------------------------
-- rank_snapshots
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.rank_snapshots (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  riot_account_id  uuid        NOT NULL REFERENCES public.riot_accounts(id) ON DELETE CASCADE,
  queue_type       text        NOT NULL,
  tier             text        NOT NULL,
  rank             text        NOT NULL,
  lp               integer     NOT NULL DEFAULT 0,
  wins             integer     NOT NULL DEFAULT 0,
  losses           integer     NOT NULL DEFAULT 0,
  hot_streak       boolean     NOT NULL DEFAULT false,
  snapshotted_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_rank_snapshots_account_time
  ON public.rank_snapshots(riot_account_id, snapshotted_at DESC);

CREATE INDEX IF NOT EXISTS idx_rank_snapshots_account_queue
  ON public.rank_snapshots(riot_account_id, queue_type);

-- -----------------------------------------------------------------
-- champion_masteries
-- -----------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.champion_masteries (
  id               uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  riot_account_id  uuid        NOT NULL REFERENCES public.riot_accounts(id) ON DELETE CASCADE,
  champion_id      integer     NOT NULL,
  champion_name    text,
  mastery_level    integer     NOT NULL DEFAULT 0,
  mastery_points   integer     NOT NULL DEFAULT 0,
  last_play_time   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT champion_masteries_unique_account_champion UNIQUE (riot_account_id, champion_id)
);

CREATE INDEX IF NOT EXISTS idx_champion_masteries_account
  ON public.champion_masteries(riot_account_id);

DROP TRIGGER IF EXISTS trg_champion_masteries_updated_at ON public.champion_masteries;
CREATE TRIGGER trg_champion_masteries_updated_at
  BEFORE UPDATE ON public.champion_masteries
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- -----------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------
ALTER TABLE public.riot_accounts      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rank_snapshots     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.champion_masteries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS riot_accounts_select_own    ON public.riot_accounts;
CREATE POLICY riot_accounts_select_own    ON public.riot_accounts FOR SELECT USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS riot_accounts_insert_own    ON public.riot_accounts;
CREATE POLICY riot_accounts_insert_own    ON public.riot_accounts FOR INSERT WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS riot_accounts_update_own    ON public.riot_accounts;
CREATE POLICY riot_accounts_update_own    ON public.riot_accounts FOR UPDATE USING (auth.uid() = profile_id) WITH CHECK (auth.uid() = profile_id);

DROP POLICY IF EXISTS riot_accounts_delete_own    ON public.riot_accounts;
CREATE POLICY riot_accounts_delete_own    ON public.riot_accounts FOR DELETE USING (auth.uid() = profile_id);

DROP POLICY IF EXISTS rank_snapshots_select_own   ON public.rank_snapshots;
CREATE POLICY rank_snapshots_select_own   ON public.rank_snapshots FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.riot_accounts ra WHERE ra.id = rank_snapshots.riot_account_id AND ra.profile_id = auth.uid()));

DROP POLICY IF EXISTS rank_snapshots_insert_own   ON public.rank_snapshots;
CREATE POLICY rank_snapshots_insert_own   ON public.rank_snapshots FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.riot_accounts ra WHERE ra.id = rank_snapshots.riot_account_id AND ra.profile_id = auth.uid()));

DROP POLICY IF EXISTS champion_masteries_select_own ON public.champion_masteries;
CREATE POLICY champion_masteries_select_own ON public.champion_masteries FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.riot_accounts ra WHERE ra.id = champion_masteries.riot_account_id AND ra.profile_id = auth.uid()));

DROP POLICY IF EXISTS champion_masteries_insert_own ON public.champion_masteries;
CREATE POLICY champion_masteries_insert_own ON public.champion_masteries FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.riot_accounts ra WHERE ra.id = champion_masteries.riot_account_id AND ra.profile_id = auth.uid()));

DROP POLICY IF EXISTS champion_masteries_update_own ON public.champion_masteries;
CREATE POLICY champion_masteries_update_own ON public.champion_masteries FOR UPDATE
  USING (EXISTS (SELECT 1 FROM public.riot_accounts ra WHERE ra.id = champion_masteries.riot_account_id AND ra.profile_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.riot_accounts ra WHERE ra.id = champion_masteries.riot_account_id AND ra.profile_id = auth.uid()));

DROP POLICY IF EXISTS champion_masteries_delete_own ON public.champion_masteries;
CREATE POLICY champion_masteries_delete_own ON public.champion_masteries FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.riot_accounts ra WHERE ra.id = champion_masteries.riot_account_id AND ra.profile_id = auth.uid()));

-- -----------------------------------------------------------------
-- GRANTS
-- -----------------------------------------------------------------
GRANT ALL ON public.riot_accounts      TO service_role;
GRANT ALL ON public.rank_snapshots     TO service_role;
GRANT ALL ON public.champion_masteries TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.riot_accounts      TO authenticated;
GRANT SELECT, INSERT                  ON public.rank_snapshots     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE  ON public.champion_masteries TO authenticated;
