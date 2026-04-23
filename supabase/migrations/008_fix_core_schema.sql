-- 
-- 008_fix_core_schema.sql
-- Normalização do schema core com base no snapshot em sql
-- Referências:
--   - sql/public.players_2026-04-23T090140.sql
--   - sql/public.inscricoes_2026-04-23T090140.sql
--

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------
-- PLAYERS
-- Snapshot atual contém as duas colunas: tagline e tagline_.
-- A coluna usada de fato é tagline; tagline_ está nula no dump.
-- -----------------------------------------------------------------
UPDATE public.players
  SET tagline = COALESCE(
    NULLIF(tagline, ''),
    NULLIF(tagline_, ''),
    'BR1'
  )
  WHERE tagline IS NULL OR tagline = '';

ALTER TABLE public.players
  ALTER COLUMN tagline SET DEFAULT 'BR1';

ALTER TABLE public.players
  ALTER COLUMN tagline SET NOT NULL;

ALTER TABLE public.players
  DROP COLUMN IF EXISTS tagline_;

CREATE INDEX IF NOT EXISTS idx_players_team_id
  ON public.players(team_id);

CREATE INDEX IF NOT EXISTS idx_players_team_role
  ON public.players(team_id, role);

CREATE INDEX IF NOT EXISTS idx_players_puuid
  ON public.players(puuid);

CREATE INDEX IF NOT EXISTS idx_players_summonername_trgm
  ON public.players USING gin (summonername gin_trgm_ops);

-- -----------------------------------------------------------------
-- INSCRICOES
-- Snapshot atual usa requested_by (não existe user_id nessa tabela).
-- Aqui só reforamos índices para consultas e futuras policies.
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_inscricoes_team_id
  ON public.inscricoes(team_id);

CREATE INDEX IF NOT EXISTS idx_inscricoes_tournament_id
  ON public.inscricoes(tournament_id);

CREATE INDEX IF NOT EXISTS idx_inscricoes_requested_by
  ON public.inscricoes(requested_by);

CREATE INDEX IF NOT EXISTS idx_inscricoes_tournament_status
  ON public.inscricoes(tournament_id, status);

CREATE INDEX IF NOT EXISTS idx_inscricoes_requested_by_status
  ON public.inscricoes(requested_by, status);
