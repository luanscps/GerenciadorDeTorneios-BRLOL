-- ============================================================
-- MIGRATION: security_revoke_anon_remaining
-- Data: 2026-05-06
-- Objetivo:
--   Revogar EXECUTE do role anon nas 2 funções restantes
--   identificadas como elegíveis após análise de dependência RLS:
--
--   1. ensure_single_primary_riot_account()
--      - É trigger de tabela (RETURNS trigger)
--      - Nunca deve ser chamada via REST pelo cliente
--      - Nenhuma policy RLS depende dela
--
--   2. accept_team_invite(uuid, uuid, uuid)
--      - É ação de usuário autenticado
--      - Anônimo com invite_id válido poderia aceitar convite
--        no lugar de outro usuário (sem validação de auth.uid())
--      - Role mínimo necessário: authenticated (mantido)
--
--   NÃO alteradas (helpers de RLS — revogar quebraria policies):
--     is_admin, is_current_user_admin, is_organizer_or_admin,
--     is_tournament_organizer
-- ============================================================

-- Trigger interna: nunca deve ser chamada via REST por anon
REVOKE EXECUTE ON FUNCTION public.ensure_single_primary_riot_account() FROM anon;

-- Ação de usuário: requer autenticação — anon não pode aceitar convite
REVOKE EXECUTE ON FUNCTION public.accept_team_invite(uuid, uuid, uuid) FROM anon;
