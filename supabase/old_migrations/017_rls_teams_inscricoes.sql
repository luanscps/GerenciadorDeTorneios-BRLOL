-- Migration 017: RLS para teams e inscricoes (Sprint 2 fixes)
-- Garante que validações de ownership sejam enforçadas no banco,
-- não apenas no client.

-- ── TEAMS ──────────────────────────────────────────────────────────────────

-- Qualquer pessoa autenticada pode VER times (página pública /times/:tag)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_select_public') THEN
    EXECUTE $p$ CREATE POLICY teams_select_public ON public.teams
      FOR SELECT USING (true) $p$;
  END IF;
END $$;

-- Apenas o dono pode ATUALIZAR seu time
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_update_owner') THEN
    EXECUTE $p$ CREATE POLICY teams_update_owner ON public.teams
      FOR UPDATE USING (auth.uid() = owner_id) $p$;
  END IF;
END $$;

-- Apenas o dono pode DELETAR seu time
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_delete_owner') THEN
    EXECUTE $p$ CREATE POLICY teams_delete_owner ON public.teams
      FOR DELETE USING (auth.uid() = owner_id) $p$;
  END IF;
END $$;

-- Usuário autenticado pode INSERIR time (criação)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='teams' AND policyname='teams_insert_authenticated') THEN
    EXECUTE $p$ CREATE POLICY teams_insert_authenticated ON public.teams
      FOR INSERT WITH CHECK (auth.uid() = owner_id) $p$;
  END IF;
END $$;

-- ── INSCRICOES ──────────────────────────────────────────────────────────────

-- Qualquer autenticado pode VER inscrições (capitão vê a própria, admin vê todas)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inscricoes' AND policyname='inscricoes_select_authenticated') THEN
    EXECUTE $p$ CREATE POLICY inscricoes_select_authenticated ON public.inscricoes
      FOR SELECT USING (auth.uid() IS NOT NULL) $p$;
  END IF;
END $$;

-- Apenas quem criou pode fazer check-in (UPDATE checked_in) OU admin
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inscricoes' AND policyname='inscricoes_update_owner_or_admin') THEN
    EXECUTE $p$ CREATE POLICY inscricoes_update_owner_or_admin ON public.inscricoes
      FOR UPDATE USING (
        auth.uid() = requested_by
        OR public.is_current_user_admin()
      ) $p$;
  END IF;
END $$;

-- Apenas o capitão pode INSERT de inscrição
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='inscricoes' AND policyname='inscricoes_insert_owner') THEN
    EXECUTE $p$ CREATE POLICY inscricoes_insert_owner ON public.inscricoes
      FOR INSERT WITH CHECK (auth.uid() = requested_by) $p$;
  END IF;
END $$;

-- ── PLAYERS ─────────────────────────────────────────────────────────────────

-- Apenas o capitão do time pode atualizar roles dos jogadores
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename='players' AND policyname='players_update_team_owner') THEN
    EXECUTE $p$ CREATE POLICY players_update_team_owner ON public.players
      FOR UPDATE USING (
        EXISTS (
          SELECT 1 FROM public.teams
          WHERE teams.id = players.team_id
            AND teams.owner_id = auth.uid()
        )
      ) $p$;
  END IF;
END $$;
