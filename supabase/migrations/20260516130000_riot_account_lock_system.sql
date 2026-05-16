-- ============================================================
-- Migration: Riot Account Lock System
-- Cada riot_account tem lock individual controlado pelo admin.
-- Estado inicial: locked_until = NOW() + 30 days
-- ============================================================

-- 1. Adiciona colunas de lock na tabela riot_accounts
ALTER TABLE riot_accounts
  ADD COLUMN IF NOT EXISTS lock_status   text        NOT NULL DEFAULT 'locked_until'
    CONSTRAINT riot_accounts_lock_status_check
    CHECK (lock_status IN ('unlocked', 'locked_permanent', 'locked_until')),
  ADD COLUMN IF NOT EXISTS lock_until    timestamptz DEFAULT (NOW() + INTERVAL '30 days'),
  ADD COLUMN IF NOT EXISTS locked_by     uuid        REFERENCES profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS locked_at     timestamptz DEFAULT NOW(),
  ADD COLUMN IF NOT EXISTS lock_reason   text;

-- Backfill: contas existentes -> locked_until 30 dias a partir de agora
UPDATE riot_accounts
  SET
    lock_status = 'locked_until',
    lock_until  = NOW() + INTERVAL '30 days',
    locked_at   = NOW()
  WHERE lock_status IS NULL;

COMMENT ON COLUMN riot_accounts.lock_status IS
  'Estado do lock da conta Riot. unlocked=usuario pode editar livremente; locked_permanent=so admin desbloqueia; locked_until=bloqueado ate lock_until (auto-expira).';
COMMENT ON COLUMN riot_accounts.lock_until IS
  'So relevante quando lock_status=locked_until. Apos este timestamp o usuario pode editar/remover a conta.';
COMMENT ON COLUMN riot_accounts.locked_by IS
  'UUID do admin (profiles.id) que aplicou o lock mais recente.';
COMMENT ON COLUMN riot_accounts.lock_reason IS
  'Motivo registrado pelo admin ao aplicar/alterar o lock (auditoria).';

-- 2. Funcao helper: pode o usuario editar esta conta Riot?
CREATE OR REPLACE FUNCTION can_user_edit_riot_account(p_riot_account_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    CASE
      WHEN lock_status = 'unlocked'         THEN true
      WHEN lock_status = 'locked_permanent' THEN false
      WHEN lock_status = 'locked_until'
           AND lock_until IS NOT NULL
           AND lock_until < NOW()            THEN true
      ELSE false
    END
  FROM riot_accounts
  WHERE id = p_riot_account_id;
$$;

COMMENT ON FUNCTION can_user_edit_riot_account IS
  'Retorna true se o usuario pode editar/remover a riot_account. Checa lock_status e expiracao do locked_until.';

-- 3. Tabela de auditoria de locks
CREATE TABLE IF NOT EXISTS riot_account_lock_logs (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  riot_account_id  uuid        NOT NULL REFERENCES riot_accounts(id) ON DELETE CASCADE,
  changed_by       uuid        NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  action           text        NOT NULL
    CONSTRAINT lock_log_action_check
    CHECK (action IN ('locked_permanent', 'locked_until', 'unlocked')),
  lock_until       timestamptz,
  lock_reason      text,
  previous_status  text,
  previous_until   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_lock_logs_riot_account
  ON riot_account_lock_logs (riot_account_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lock_logs_changed_by
  ON riot_account_lock_logs (changed_by, created_at DESC);

COMMENT ON TABLE riot_account_lock_logs IS
  'Log auditavel de todas as alteracoes de lock em riot_accounts feitas pelo admin.';

-- 4. RLS na tabela de logs
ALTER TABLE riot_account_lock_logs ENABLE ROW LEVEL SECURITY;

-- Admin le todos os logs
CREATE POLICY "admin_select_lock_logs"
  ON riot_account_lock_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
        AND profiles.is_admin = true
    )
  );

-- Service role insere via API route server-side
CREATE POLICY "service_insert_lock_logs"
  ON riot_account_lock_logs FOR INSERT
  WITH CHECK (true);
