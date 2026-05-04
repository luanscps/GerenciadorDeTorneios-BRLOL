-- =============================================================
-- Migration 004: seedings table, player Riot fields, pg_net triggers
-- =============================================================

-- -------------------------------------------------------
-- 1. TABELA seedings (seedagem de times nos torneios)
-- -------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.seedings (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id       uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  seed          int  NOT NULL CHECK (seed > 0),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tournament_id, team_id),
  UNIQUE (tournament_id, seed)
);

CREATE INDEX IF NOT EXISTS idx_seedings_tournament ON public.seedings(tournament_id);
CREATE INDEX IF NOT EXISTS idx_seedings_seed      ON public.seedings(tournament_id, seed);

ALTER TABLE public.seedings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view seedings"
  ON public.seedings FOR SELECT USING (true);

CREATE POLICY "Admins can manage seedings"
  ON public.seedings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

-- -------------------------------------------------------
-- 2. COLUNAS RIOT em players (para riot-api-sync)
-- -------------------------------------------------------
ALTER TABLE public.players
  ADD COLUMN IF NOT EXISTS puuid          text,
  ADD COLUMN IF NOT EXISTS tagline        text,
  ADD COLUMN IF NOT EXISTS profile_icon   int,
  ADD COLUMN IF NOT EXISTS summoner_level int,
  ADD COLUMN IF NOT EXISTS tier           text DEFAULT 'UNRANKED',
  ADD COLUMN IF NOT EXISTS rank           text DEFAULT '',
  ADD COLUMN IF NOT EXISTS lp             int  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS wins           int  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS losses         int  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_synced    timestamptz;

CREATE INDEX IF NOT EXISTS idx_players_puuid       ON public.players(puuid)
  WHERE puuid IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_players_last_synced ON public.players(last_synced)
  WHERE last_synced IS NOT NULL;

-- -------------------------------------------------------
-- 3. ENABLE pg_net extension (necessaria para HTTP calls nos triggers)
-- -------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- -------------------------------------------------------
-- 4. FUNCAO auxiliar: chama edge function via pg_net
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.call_edge_function(
  function_name text,
  payload       jsonb
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  supabase_url  text := current_setting('app.supabase_url',  true);
  service_key   text := current_setting('app.service_role_key', true);
BEGIN
  PERFORM extensions.http_post(
    url     := supabase_url || '/functions/v1/' || function_name,
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || service_key
    ),
    body    := payload::text
  );
EXCEPTION WHEN OTHERS THEN
  -- Nao bloquear a transacao principal se o webhook falhar
  RAISE WARNING 'call_edge_function(%) falhou: %', function_name, SQLERRM;
END;
$$;

GRANT EXECUTE ON FUNCTION public.call_edge_function TO service_role;

-- -------------------------------------------------------
-- 5. TRIGGER: inscricao aprovada/rejeitada -> send-email + discord-webhook
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_inscricao_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_team_name       text;
  v_captain_name    text;
  v_captain_email   text;
  v_tournament_name text;
  v_start_date      text;
  v_notes           text;
  v_tournament_id   uuid;
BEGIN
  -- So dispara quando status muda para APPROVED ou REJECTED
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('APPROVED', 'REJECTED') THEN RETURN NEW; END IF;

  v_tournament_id := NEW.tournament_id;

  -- Buscar nome do time
  SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_id;

  -- Buscar dados do torneio
  SELECT name, start_date::text
  INTO v_tournament_name, v_start_date
  FROM public.tournaments WHERE id = v_tournament_id;

  -- Buscar email e nome do capito (responsavel pela inscricao)
  SELECT p.full_name, p.email
  INTO v_captain_name, v_captain_email
  FROM public.profiles p
  WHERE p.id = NEW.user_id;

  v_notes := NEW.notes;

  -- Enviar email
  IF v_captain_email IS NOT NULL THEN
    PERFORM public.call_edge_function(
      'send-email',
      jsonb_build_object(
        'type', CASE NEW.status
          WHEN 'APPROVED' THEN 'inscricao_aprovada'
          WHEN 'REJECTED' THEN 'inscricao_rejeitada'
        END,
        'to',   v_captain_email,
        'data', jsonb_build_object(
          'captain_name',     v_captain_name,
          'team_name',        v_team_name,
          'tournament_name',  v_tournament_name,
          'start_date',       v_start_date,
          'notes',            v_notes
        )
      )
    );
  END IF;

  -- Enviar Discord
  PERFORM public.call_edge_function(
    'discord-webhook',
    jsonb_build_object(
      'type',          CASE NEW.status
        WHEN 'APPROVED' THEN 'inscricao_aprovada'
        WHEN 'REJECTED' THEN 'inscricao_rejeitada'
      END,
      'tournament_id', v_tournament_id::text,
      'data', jsonb_build_object(
        'team_name',       v_team_name,
        'tournament_name', v_tournament_name
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inscricao_status_change ON public.inscricoes;
CREATE TRIGGER trg_inscricao_status_change
  AFTER UPDATE ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_inscricao_status_change();

-- -------------------------------------------------------
-- 6. TRIGGER: partida finalizada -> send-email + discord-webhook
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_match_finished()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_team_a_name    text;
  v_team_b_name    text;
  v_winner_name    text;
  v_tournament_name text;
  v_tournament_id  uuid;
  v_score_a        int := 0;
  v_score_b        int := 0;
BEGIN
  -- So dispara quando status muda para FINISHED
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'FINISHED'  THEN RETURN NEW; END IF;

  v_tournament_id := NEW.tournament_id;

  SELECT name INTO v_team_a_name FROM public.teams WHERE id = NEW.team_a_id;
  SELECT name INTO v_team_b_name FROM public.teams WHERE id = NEW.team_b_id;
  SELECT name INTO v_winner_name FROM public.teams WHERE id = NEW.winner_id;
  SELECT name INTO v_tournament_name FROM public.tournaments WHERE id = v_tournament_id;

  -- Calcular placar a partir dos games
  SELECT
    COUNT(*) FILTER (WHERE winner_team_id = NEW.team_a_id),
    COUNT(*) FILTER (WHERE winner_team_id = NEW.team_b_id)
  INTO v_score_a, v_score_b
  FROM public.games
  WHERE match_id = NEW.id;

  -- Discord
  PERFORM public.call_edge_function(
    'discord-webhook',
    jsonb_build_object(
      'type',          'partida_finalizada',
      'tournament_id', v_tournament_id::text,
      'data', jsonb_build_object(
        'team_a',          v_team_a_name,
        'team_b',          v_team_b_name,
        'score_a',         v_score_a,
        'score_b',         v_score_b,
        'winner',          v_winner_name,
        'tournament_name', v_tournament_name,
        'format',          NEW.format
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_finished ON public.matches;
CREATE TRIGGER trg_match_finished
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.trg_match_finished();

-- -------------------------------------------------------
-- 7. TRIGGER: torneio muda para IN_PROGRESS -> discord-webhook
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_tournament_started()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_team_count int;
BEGIN
  IF NEW.status = OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'IN_PROGRESS' THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_team_count
  FROM public.inscricoes
  WHERE tournament_id = NEW.id AND status = 'APPROVED';

  PERFORM public.call_edge_function(
    'discord-webhook',
    jsonb_build_object(
      'type',          'torneio_iniciado',
      'tournament_id', NEW.id::text,
      'data', jsonb_build_object(
        'tournament_name', NEW.name,
        'team_count',      v_team_count,
        'bracket_type',    NEW.bracket_type::text
      )
    )
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournament_started ON public.tournaments;
CREATE TRIGGER trg_tournament_started
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.trg_tournament_started();

-- -------------------------------------------------------
-- 8. NOVO TRIGGER: inscricao PENDING -> email de confirmacao
-- -------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_inscricao_nova()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_team_name       text;
  v_captain_name    text;
  v_captain_email   text;
  v_tournament_name text;
BEGIN
  IF NEW.status <> 'PENDING' THEN RETURN NEW; END IF;

  SELECT name INTO v_team_name FROM public.teams WHERE id = NEW.team_id;
  SELECT name INTO v_tournament_name FROM public.tournaments WHERE id = NEW.tournament_id;
  SELECT p.full_name, p.email
  INTO v_captain_name, v_captain_email
  FROM public.profiles p WHERE p.id = NEW.user_id;

  IF v_captain_email IS NOT NULL THEN
    PERFORM public.call_edge_function(
      'send-email',
      jsonb_build_object(
        'type', 'inscricao_pendente',
        'to',   v_captain_email,
        'data', jsonb_build_object(
          'captain_name',    v_captain_name,
          'team_name',       v_team_name,
          'tournament_name', v_tournament_name
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inscricao_nova ON public.inscricoes;
CREATE TRIGGER trg_inscricao_nova
  AFTER INSERT ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_inscricao_nova();
