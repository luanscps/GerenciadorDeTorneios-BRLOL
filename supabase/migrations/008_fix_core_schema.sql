-- 
-- 008_fix_core_schema.sql
-- Normalização do schema core com base no dump atual (2026-04-25)
-- Colunas reais: tag_line (não tagline), summoner_name (não summonername)
--

CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- -----------------------------------------------------------------
-- PLAYERS — normalização de tag_line
-- Coluna real no banco: tag_line (com underscore)
-- -----------------------------------------------------------------
UPDATE public.players
  SET tag_line = COALESCE(
    NULLIF(tag_line, ''),
    'BR1'
  )
  WHERE tag_line IS NULL OR tag_line = '';

ALTER TABLE public.players
  ALTER COLUMN tag_line SET DEFAULT 'BR1';

ALTER TABLE public.players
  ALTER COLUMN tag_line SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_players_team_id
  ON public.players(team_id);

CREATE INDEX IF NOT EXISTS idx_players_team_role
  ON public.players(team_id, role);

CREATE INDEX IF NOT EXISTS idx_players_puuid
  ON public.players(puuid);

-- Índice trigram em summoner_name (coluna real com underscore)
CREATE INDEX IF NOT EXISTS idx_players_summoner_name_trgm
  ON public.players USING gin (summoner_name gin_trgm_ops);

-- -----------------------------------------------------------------
-- INSCRICOES — índices para consultas e RLS
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
