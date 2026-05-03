-- Migration: Adiciona coluna tournament_code na tabela matches (Fase 1)
-- Descrição: Cria a coluna como nullable para transição segura do campo notes.

ALTER TABLE public.matches 
ADD COLUMN tournament_code TEXT;

-- Comentário para documentação no banco
COMMENT ON COLUMN public.matches.tournament_code IS 'Código oficial da Riot (Tournament Code) para esta partida.';
