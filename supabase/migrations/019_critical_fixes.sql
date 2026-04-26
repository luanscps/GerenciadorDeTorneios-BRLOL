-- ============================================================
-- Migration 019: Correções críticas de schema e RLS
-- ============================================================


-- ─── 1. PICKS_BANS ───────────────────────────────────────────
-- O banco armazena picks/bans como campo JSONB em match_games.
-- Não existe (nem deve existir) tabela separada picks_bans.
-- O código em partida.ts foi corrigido para usar match_games.picks_bans.
-- Nenhuma DDL necessária aqui.


-- ─── 2. RLS DUPLICADA: teams ─────────────────────────────────
-- A migration 001 já criou "teams_select_all" com USING (true).
-- Se por algum motivo existir uma segunda política "teams_select_public"
-- com a mesma condição, removemos a redundante.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'teams'
      AND policyname = 'teams_select_public'
  ) THEN
    EXECUTE 'DROP POLICY teams_select_public ON public.teams';
  END IF;
END;
$$;


-- ─── 3. TOURNAMENTS.STARTS_AT — coluna GENERATED ─────────────
-- Verifica se starts_at existe como coluna comum (não gerada) e a remove,
-- pois o valor correto é derivado de start_date pelo próprio Postgres.
-- Se a coluna não existir, este bloco é no-op seguro.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name   = 'tournaments'
      AND column_name  = 'starts_at'
      AND is_generated = 'NEVER'   -- só remove se NÃO for gerada
  ) THEN
    EXECUTE 'ALTER TABLE public.tournaments DROP COLUMN starts_at';
  END IF;
END;
$$;


-- ─── 4. TRIGGERS DE NOTIFICAÇÃO — usa requested_by ───────────
-- Recria fn_notify_inscricao garantindo que notificações vão para
-- quem fez a inscrição (requested_by), não para o admin reviewer.
CREATE OR REPLACE FUNCTION public.fn_notify_inscricao()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_title   text;
  v_body    text;
  v_type    text;
BEGIN
  -- FIX: user_id alvo = quem fez a inscrição (requested_by), não o admin
  v_user_id := COALESCE(NEW.requested_by, OLD.requested_by);

  IF v_user_id IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    v_type  := 'inscricao_nova';
    v_title := 'Inscrição enviada';
    v_body  := 'Sua inscrição foi recebida e está em análise.';

  ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    v_type  := 'inscricao_status';
    CASE NEW.status
      WHEN 'APPROVED' THEN
        v_title := 'Inscrição aprovada! 🎉';
        v_body  := 'Seu time foi aprovado para o torneio.';
      WHEN 'REJECTED' THEN
        v_title := 'Inscrição recusada';
        v_body  := 'Sua inscrição não foi aprovada desta vez.';
      ELSE
        RETURN NEW;
    END CASE;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, body, metadata)
  VALUES (
    v_user_id,
    v_type,
    v_title,
    v_body,
    jsonb_build_object(
      'tournament_id', NEW.tournament_id,
      'team_id',       NEW.team_id,
      'status',        NEW.status
    )
  );

  RETURN NEW;
END;
$$;

-- Recria os triggers com a função corrigida
DROP TRIGGER IF EXISTS trg_inscricao_nova          ON public.inscricoes;
DROP TRIGGER IF EXISTS trg_inscricao_status_change ON public.inscricoes;

CREATE TRIGGER trg_inscricao_nova
  AFTER INSERT ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_inscricao();

CREATE TRIGGER trg_inscricao_status_change
  AFTER UPDATE OF status ON public.inscricoes
  FOR EACH ROW EXECUTE FUNCTION public.fn_notify_inscricao();


-- ─── 5. GRANTS ───────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION public.fn_notify_inscricao TO service_role;
