-- Migration: fix_tournament_match_results
-- Propósito:
--   1. Adiciona coluna match_id (FK para matches.id, nullable) — permite rastrear
--      qual match originou o callback sem precisar de lookup JSONB no momento do insert.
--   2. Adiciona coluna origin_ip (text, nullable) — auditoria do IP de origem do callback.
--   3. Cria índice UNIQUE em tournament_code — necessário para o upsert com onConflict.
--   4. Cria índice em match_id para acelerar queries de processamento posterior.
--
-- Todas as colunas são nullable para compatibilidade com linhas existentes.
-- O UNIQUE é criado com IF NOT EXISTS para ser idempotente.

-- 1. Adiciona match_id se não existir
ALTER TABLE tournament_match_results
  ADD COLUMN IF NOT EXISTS match_id uuid
    REFERENCES matches(id) ON DELETE SET NULL;

-- 2. Adiciona origin_ip se não existir
ALTER TABLE tournament_match_results
  ADD COLUMN IF NOT EXISTS origin_ip text;

-- 3. Cria UNIQUE constraint em tournament_code (necessário para upsert onConflict)
--    Usa DO $$ para ser idempotente: não falha se já existir.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'tournament_match_results_tournament_code_key'
      AND conrelid = 'tournament_match_results'::regclass
  ) THEN
    ALTER TABLE tournament_match_results
      ADD CONSTRAINT tournament_match_results_tournament_code_key
      UNIQUE (tournament_code);
  END IF;
END;
$$;

-- 4. Índice em match_id para queries de processamento posterior
CREATE INDEX IF NOT EXISTS idx_tournament_match_results_match_id
  ON tournament_match_results (match_id)
  WHERE match_id IS NOT NULL;

-- 5. Índice em processed para worker de processamento posterior
CREATE INDEX IF NOT EXISTS idx_tournament_match_results_processed
  ON tournament_match_results (processed)
  WHERE processed = false;
