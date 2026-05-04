-- Sprint 2: adiciona flags de check-in na tabela inscricoes
-- e cria índice para consultas rápidas por torneio

ALTER TABLE inscricoes
  ADD COLUMN IF NOT EXISTS checked_in         BOOLEAN   NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS checked_in_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS checked_in_by      UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_inscricoes_tournament_checkin
  ON inscricoes (tournament_id, checked_in);

COMMENT ON COLUMN inscricoes.checked_in    IS 'true quando o time confirmou presença no torneio';
COMMENT ON COLUMN inscricoes.checked_in_at IS 'timestamp do check-in';
COMMENT ON COLUMN inscricoes.checked_in_by IS 'usuário que fez o check-in (capitão ou admin)';
