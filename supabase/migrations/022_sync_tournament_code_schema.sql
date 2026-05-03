-- Migration: Sincronização da coluna tournament_code (Idempotente)
-- Esta migration reflete as alterações já aplicadas manualmente no banco remoto.

DO $$ 
BEGIN
    -- 1. Adiciona a coluna tournament_code se não existir
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'matches' 
        AND column_name = 'tournament_code'
    ) THEN
        ALTER TABLE public.matches ADD COLUMN tournament_code TEXT;
        COMMENT ON COLUMN public.matches.tournament_code IS 'Código oficial da Riot (Tournament Code) para esta partida.';
    END IF;

    -- 2. Cria o índice se não existir
    IF NOT EXISTS (
        SELECT 1
        FROM pg_class c
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE c.relname = 'idx_matches_tournament_code'
        AND n.nspname = 'public'
    ) THEN
        CREATE INDEX idx_matches_tournament_code ON public.matches(tournament_code);
    END IF;
END $$;
