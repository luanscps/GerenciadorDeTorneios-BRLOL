--
-- 013_fix_tagline_column.sql
-- Renomeia coluna 'tagline' -> 'tag_line' em riot_accounts
-- para padronizar com snake_case e alinhar com o upsert do page.tsx
--
-- Causa do bug:
--   Migration 009 criou: tagline text NOT NULL
--   Upsert em page.tsx enviava: { tag_line: result.account.tagLine }
--   Resultado: NOT NULL constraint violation (tagline ficava NULL)
--

ALTER TABLE public.riot_accounts
  RENAME COLUMN tagline TO tag_line;

-- Atualiza registros de seed que possam ter sido inseridos com
-- a coluna antiga (proteção extra; em produção limpa não há seeds)
COMMENT ON COLUMN public.riot_accounts.tag_line IS
  'Tagline do Riot ID (ex: BR1). Renomeado de tagline -> tag_line na migration 013.';
