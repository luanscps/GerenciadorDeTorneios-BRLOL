-- Migration: add queue_type aligned with Riot Tournament-v5 mapType/pickType
-- Reference: https://developer.riotgames.com/apis#tournament-v5

ALTER TABLE tournaments
  ADD COLUMN IF NOT EXISTS queue_type text
  NOT NULL DEFAULT 'SUMMONERS_RIFT_5v5';

-- Constraint to enforce only valid Riot Tournament API values
ALTER TABLE tournaments
  ADD CONSTRAINT tournaments_queue_type_check
  CHECK (queue_type IN (
    'SUMMONERS_RIFT_5v5',       -- mapType: SUMMONERS_RIFT, pickType: TOURNAMENT_DRAFT (competitivo padrão)
    'SUMMONERS_RIFT_DRAFT',     -- mapType: SUMMONERS_RIFT, pickType: DRAFT_MODE (draft normal)
    'SUMMONERS_RIFT_BLIND',     -- mapType: SUMMONERS_RIFT, pickType: BLIND_PICK (casual)
    'SUMMONERS_RIFT_ALL_RANDOM',-- mapType: SUMMONERS_RIFT, pickType: ALL_RANDOM (ARURF etc)
    'HOWLING_ABYSS_ARAM'        -- mapType: HOWLING_ABYSS, pickType: ALL_RANDOM (ARAM)
  ));

-- Backfill: all existing tournaments default to SR 5v5 competitive
UPDATE tournaments
  SET queue_type = 'SUMMONERS_RIFT_5v5'
  WHERE queue_type IS NULL;

COMMENT ON COLUMN tournaments.queue_type IS
  'Tipo de fila mapeado ao mapType+pickType da Riot Tournament-v5.
   SUMMONERS_RIFT_5v5     => mapType: SUMMONERS_RIFT | pickType: TOURNAMENT_DRAFT
   SUMMONERS_RIFT_DRAFT   => mapType: SUMMONERS_RIFT | pickType: DRAFT_MODE
   SUMMONERS_RIFT_BLIND   => mapType: SUMMONERS_RIFT | pickType: BLIND_PICK
   SUMMONERS_RIFT_ALL_RANDOM => mapType: SUMMONERS_RIFT | pickType: ALL_RANDOM
   HOWLING_ABYSS_ARAM     => mapType: HOWLING_ABYSS   | pickType: ALL_RANDOM';
