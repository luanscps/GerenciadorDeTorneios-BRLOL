--
-- 011_fix_triggers_and_functions.sql
-- Corrige triggers/funções para o schema real do snapshot
-- Referências:
--   - sql/public.inscricoes_2026-04-23T090140.sql
--   - sql/public.matches_2026-04-23T090140.sql
--   - sql/public.match_games_2026-04-23T090140.sql
--

-- -----------------------------------------------------------------
-- Helper interno: verifica se public.call_edge_function existe
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.has_call_edge_function()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'call_edge_function'
  );
$$;

-- -----------------------------------------------------------------
-- Trigger: nova inscrição
-- Usa requested_by e payload compatível com send-email
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_inscricao_nova()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_name text;
  v_tournament_name text;
  v_captain_name text;
  v_captain_email text;
BEGIN
  IF NEW.status <> 'PENDING' THEN RETURN NEW; END IF;

  SELECT t.name INTO v_team_name FROM public.teams t WHERE t.id = NEW.team_id;
  SELECT tr.name INTO v_tournament_name FROM public.tournaments tr WHERE tr.id = NEW.tournament_id;

  IF NEW.requested_by IS NOT NULL THEN
    SELECT p.full_name, p.email INTO v_captain_name, v_captain_email
    FROM public.profiles p WHERE p.id = NEW.requested_by;

    INSERT INTO public.notifications (
      id, user_id, type, title, body, message, metadata, read, created_at
    ) VALUES (
      uuid_generate_v4(),
      NEW.requested_by,
      'registration_update',
      'Inscrição recebida',
      format('A inscrição do time %s foi registrada no torneio %s.', COALESCE(v_team_name, 'Time'), COALESCE(v_tournament_name, 'Torneio')),
      format('A inscrição do time %s foi registrada no torneio %s.', COALESCE(v_team_name, 'Time'), COALESCE(v_tournament_name, 'Torneio')),
      jsonb_build_object('team_id', NEW.team_id, 'tournament_id', NEW.tournament_id, 'status', NEW.status),
      false,
      now()
    );

    IF public.has_call_edge_function() AND v_captain_email IS NOT NULL THEN
      PERFORM public.call_edge_function(
        'send-email',
        jsonb_build_object(
          'template', 'inscricao_pendente',
          'data', jsonb_build_object(
            'to_email', v_captain_email,
            'captain_name', COALESCE(v_captain_name, 'Capitão'),
            'team_name', COALESCE(v_team_name, 'Time'),
            'tournament_name', COALESCE(v_tournament_name, 'Torneio')
          )
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inscricao_nova ON public.inscricoes;
CREATE TRIGGER trg_inscricao_nova
  AFTER INSERT ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_inscricao_nova();

-- -----------------------------------------------------------------
-- Trigger: mudança de status da inscrição
-- Usa requested_by em vez de user_id
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_inscricao_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_name text;
  v_tournament_name text;
  v_captain_name text;
  v_captain_email text;
  v_notification_title text;
  v_notification_body text;
  v_email_template text;
  v_discord_type text;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status NOT IN ('APPROVED', 'REJECTED') THEN RETURN NEW; END IF;

  SELECT t.name INTO v_team_name FROM public.teams t WHERE t.id = NEW.team_id;
  SELECT tr.name INTO v_tournament_name FROM public.tournaments tr WHERE tr.id = NEW.tournament_id;

  IF NEW.requested_by IS NOT NULL THEN
    SELECT p.full_name, p.email INTO v_captain_name, v_captain_email
    FROM public.profiles p WHERE p.id = NEW.requested_by;
  END IF;

  IF NEW.status = 'APPROVED' THEN
    v_notification_title := 'Inscrição aprovada';
    v_notification_body := format('O time %s foi aprovado no torneio %s.', COALESCE(v_team_name, 'Time'), COALESCE(v_tournament_name, 'Torneio'));
    v_email_template := 'inscricao_aprovada';
    v_discord_type := 'inscricao_aprovada';
  ELSE
    v_notification_title := 'Inscrição rejeitada';
    v_notification_body := format('O time %s não foi aprovado no torneio %s.', COALESCE(v_team_name, 'Time'), COALESCE(v_tournament_name, 'Torneio'));
    v_email_template := 'inscricao_rejeitada';
    v_discord_type := 'inscricao_rejeitada';
  END IF;

  IF NEW.requested_by IS NOT NULL THEN
    INSERT INTO public.notifications (
      id, user_id, type, title, body, message, metadata, read, created_at
    ) VALUES (
      uuid_generate_v4(),
      NEW.requested_by,
      'registration_update',
      v_notification_title,
      v_notification_body,
      v_notification_body,
      jsonb_build_object('team_id', NEW.team_id, 'tournament_id', NEW.tournament_id, 'status', NEW.status, 'notes', NEW.notes),
      false,
      now()
    );

    IF public.has_call_edge_function() AND v_captain_email IS NOT NULL THEN
      PERFORM public.call_edge_function(
        'send-email',
        jsonb_build_object(
          'template', v_email_template,
          'data', jsonb_build_object(
            'to_email', v_captain_email,
            'captain_name', COALESCE(v_captain_name, 'Capitão'),
            'team_name', COALESCE(v_team_name, 'Time'),
            'tournament_name', COALESCE(v_tournament_name, 'Torneio'),
            'reason', NEW.notes
          )
        )
      );
    END IF;
  END IF;

  IF public.has_call_edge_function() THEN
    PERFORM public.call_edge_function(
      'discord-webhook',
      jsonb_build_object(
        'type', v_discord_type,
        'tournament_id', NEW.tournament_id::text,
        'data', jsonb_build_object(
          'team_name', COALESCE(v_team_name, 'Time'),
          'tournament_name', COALESCE(v_tournament_name, 'Torneio')
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_inscricao_status_change ON public.inscricoes;
CREATE TRIGGER trg_inscricao_status_change
  AFTER UPDATE ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.trg_inscricao_status_change();

-- -----------------------------------------------------------------
-- Trigger: match finalizada
-- Usa match_games em vez de games
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_match_finished()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_a_name text;
  v_team_b_name text;
  v_winner_name text;
  v_tournament_name text;
  v_score_a integer := 0;
  v_score_b integer := 0;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'FINISHED' THEN RETURN NEW; END IF;

  SELECT name INTO v_team_a_name FROM public.teams WHERE id = NEW.team_a_id;
  SELECT name INTO v_team_b_name FROM public.teams WHERE id = NEW.team_b_id;
  SELECT name INTO v_winner_name FROM public.teams WHERE id = NEW.winner_id;
  SELECT name INTO v_tournament_name FROM public.tournaments WHERE id = NEW.tournament_id;

  IF NEW.score_a IS NOT NULL AND NEW.score_b IS NOT NULL THEN
    v_score_a := NEW.score_a;
    v_score_b := NEW.score_b;
  ELSE
    SELECT
      COUNT(*) FILTER (WHERE mg.winner_id = NEW.team_a_id),
      COUNT(*) FILTER (WHERE mg.winner_id = NEW.team_b_id)
    INTO v_score_a, v_score_b
    FROM public.match_games mg
    WHERE mg.match_id = NEW.id;
  END IF;

  IF public.has_call_edge_function() THEN
    PERFORM public.call_edge_function(
      'discord-webhook',
      jsonb_build_object(
        'type', 'partida_finalizada',
        'tournament_id', NEW.tournament_id::text,
        'data', jsonb_build_object(
          'team_a', COALESCE(v_team_a_name, 'Time A'),
          'team_b', COALESCE(v_team_b_name, 'Time B'),
          'score_a', COALESCE(v_score_a, 0),
          'score_b', COALESCE(v_score_b, 0),
          'winner', COALESCE(v_winner_name, 'A definir'),
          'tournament_name', COALESCE(v_tournament_name, 'Torneio'),
          'format', COALESCE(NEW.format::text, 'BO1')
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_match_finished ON public.matches;
CREATE TRIGGER trg_match_finished
  AFTER UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.trg_match_finished();

-- -----------------------------------------------------------------
-- Trigger: torneio iniciado
-- Mantém integração com discord-webhook
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.trg_tournament_started()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_count integer := 0;
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status THEN RETURN NEW; END IF;
  IF NEW.status <> 'IN_PROGRESS' THEN RETURN NEW; END IF;

  SELECT COUNT(*) INTO v_team_count
  FROM public.inscricoes i
  WHERE i.tournament_id = NEW.id AND i.status = 'APPROVED';

  IF public.has_call_edge_function() THEN
    PERFORM public.call_edge_function(
      'discord-webhook',
      jsonb_build_object(
        'type', 'torneio_iniciado',
        'tournament_id', NEW.id::text,
        'data', jsonb_build_object(
          'tournament_name', NEW.name,
          'team_count', v_team_count,
          'bracket_type', NEW.bracket_type::text
        )
      )
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_tournament_started ON public.tournaments;
CREATE TRIGGER trg_tournament_started
  AFTER UPDATE ON public.tournaments
  FOR EACH ROW EXECUTE FUNCTION public.trg_tournament_started();
