BEGIN;

-- Passo 1: Sincronizar vínculos existentes ANTES de apagar players.team_id
-- Migrar vínculos de players para team_members, evitando duplicatas.
INSERT INTO team_members (team_id, profile_id, role, status, created_at)
SELECT p.team_id, p.profile_id, COALESCE(p.role, 'member')::team_member_role, 'accepted'::team_member_status, COALESCE(p.created_at, NOW())
FROM players p
WHERE p.team_id IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM team_members tm
    WHERE tm.team_id = p.team_id AND tm.profile_id = p.profile_id
  );

-- Passo 2: Criar trigger de limite de 5 jogadores em team_members
-- Garante que um time não tenha mais de 5 membros ativos.
CREATE OR REPLACE FUNCTION check_team_member_limit()
RETURNS TRIGGER AS $$
BEGIN
  IF (SELECT COUNT(*) FROM team_members WHERE team_id = NEW.team_id AND status = 'accepted') >= 5 THEN
    RAISE EXCEPTION 'Time já possui 5 jogadores ativos';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_team_limit ON team_members;
CREATE TRIGGER enforce_team_limit
  BEFORE INSERT ON team_members
  FOR EACH ROW EXECUTE FUNCTION check_team_member_limit();

-- Passo 3: Remover o campo team_id de players
ALTER TABLE players DROP COLUMN IF EXISTS team_id;

COMMIT;

-- Passo 4: Queries de validação (comentadas para execução manual)
-- SELECT * FROM team_members WHERE team_id IS NOT NULL;
-- SELECT * FROM players LIMIT 10; -- Verificar se team_id foi removido
-- SELECT COUNT(*) FROM team_members WHERE team_id = <ID_DO_TIME>; -- Verificar limite de membros
