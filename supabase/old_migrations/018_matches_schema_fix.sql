-- Sprint 3: garante schema correto da tabela matches
-- Colunas adicionadas se não existirem (safe)

ALTER TABLE public.matches
  ADD COLUMN IF NOT EXISTS winner_id        uuid REFERENCES public.teams(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS round            integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS match_number     integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS best_of          integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS score_a          integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS score_b          integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status           text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS finished_at      timestamptz,
  ADD COLUMN IF NOT EXISTS match_id_riot    text;

-- Índice para busca por torneio + round
CREATE INDEX IF NOT EXISTS idx_matches_tournament_round
  ON public.matches (tournament_id, round, match_number);

-- RLS
ALTER TABLE public.matches ENABLE ROW LEVEL SECURITY;

-- DROP seguro antes de recriar (evita "policy already exists")
DROP POLICY IF EXISTS "matches_read_all"  ON public.matches;
DROP POLICY IF EXISTS "matches_write_admin" ON public.matches;

CREATE POLICY "matches_read_all"
  ON public.matches FOR SELECT
  USING (true);

CREATE POLICY "matches_write_admin"
  ON public.matches FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
    OR
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = matches.tournament_id
        AND t.organizer_id = auth.uid()
    )
  );
