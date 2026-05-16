-- Migration: sistema de convites e reservas de time
-- Máx 5 titulares (is_reserve=false) + 6 reservas (is_reserve=true) = 11 total

-- 1. Adiciona coluna is_reserve em team_members
ALTER TABLE team_members
  ADD COLUMN IF NOT EXISTS is_reserve BOOLEAN NOT NULL DEFAULT false;

-- 2. Cria tabela team_invites
CREATE TABLE IF NOT EXISTS team_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  invited_profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  invited_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','rejected','cancelled')),
  is_reserve BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  UNIQUE(team_id, invited_profile_id, status)
);

-- 3. Índices
CREATE INDEX IF NOT EXISTS idx_team_invites_team ON team_invites(team_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_invited ON team_invites(invited_profile_id);
CREATE INDEX IF NOT EXISTS idx_team_invites_status ON team_invites(status);

-- 4. RLS
ALTER TABLE team_invites ENABLE ROW LEVEL SECURITY;

-- Jogador convidado vê seus próprios convites
CREATE POLICY "invited user can view own invites"
  ON team_invites FOR SELECT
  USING (invited_profile_id = auth.uid());

-- Membro do time pode ver convites do time
CREATE POLICY "team members can view team invites"
  ON team_invites FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invites.team_id
        AND team_members.profile_id = auth.uid()
    )
  );

-- Apenas capitão pode criar convite
CREATE POLICY "captain can create invites"
  ON team_invites FOR INSERT
  WITH CHECK (
    invited_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM team_members
      WHERE team_members.team_id = team_invites.team_id
        AND team_members.profile_id = auth.uid()
        AND team_members.team_role = 'captain'
    ) AND
    -- Limite total de 11 membros
    (SELECT COUNT(*) FROM team_members WHERE team_members.team_id = team_invites.team_id) < 11
  );

-- Capitão pode cancelar; convidado pode rejeitar
CREATE POLICY "update invite status"
  ON team_invites FOR UPDATE
  USING (
    invited_profile_id = auth.uid() OR
    invited_by = auth.uid()
  );

-- 5. Constraint de limite em team_members (função + trigger)
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  total_members INT;
  titulares INT;
  reservas INT;
BEGIN
  SELECT COUNT(*) INTO total_members FROM team_members WHERE team_id = NEW.team_id;
  IF total_members >= 11 THEN
    RAISE EXCEPTION 'Time já atingiu o limite máximo de 11 jogadores.';
  END IF;

  IF NEW.is_reserve = false THEN
    SELECT COUNT(*) INTO titulares FROM team_members
      WHERE team_id = NEW.team_id AND is_reserve = false;
    IF titulares >= 5 THEN
      RAISE EXCEPTION 'Time já tem 5 titulares. Adicione como reserva.';
    END IF;
  ELSE
    SELECT COUNT(*) INTO reservas FROM team_members
      WHERE team_id = NEW.team_id AND is_reserve = true;
    IF reservas >= 6 THEN
      RAISE EXCEPTION 'Time já tem 6 reservas.';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_team_member_limit ON team_members;
CREATE TRIGGER trg_team_member_limit
  BEFORE INSERT ON team_members
  FOR EACH ROW EXECUTE FUNCTION check_team_member_limit();
