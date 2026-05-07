-- ============================================================
-- MIGRATION: security_fix_rls_and_revoke_anon
-- Data: 2026-05-06
-- Objetivo:
--   1. Criar policies RLS na tabela tournament_match_results
--      (estava com RLS ativado mas SEM nenhuma policy — bloqueava
--       leitura e escrita para todos os roles via API)
--   2. Revogar EXECUTE do role anon em funções SECURITY DEFINER
--      que são triggers internos ou funções sensíveis e nunca
--      devem ser chamadas diretamente pelo cliente
-- ============================================================

-- ------------------------------------------------------------
-- PARTE 1: RLS em tournament_match_results
-- ------------------------------------------------------------

-- Leitura pública (qualquer um pode ver resultados de partidas)
CREATE POLICY "resultados_select_public"
  ON public.tournament_match_results
  FOR SELECT
  USING (true);

-- Inserção/atualização/deleção: apenas admin ou organizador
CREATE POLICY "resultados_write_admin_or_organizer"
  ON public.tournament_match_results
  FOR ALL
  USING (
    is_admin(auth.uid())
    OR is_organizer_or_admin(auth.uid())
  );

-- ------------------------------------------------------------
-- PARTE 2: Revogar EXECUTE do anon em funções internas
-- Funções de trigger nunca precisam ser chamadas via REST;
-- funções sensíveis não devem ser acessíveis sem autenticação.
-- ------------------------------------------------------------

-- Trigger: cria entrada de audit ao alterar partidas
REVOKE EXECUTE ON FUNCTION public.audit_matches_changes() FROM anon;

-- Trigger: adiciona capitão automaticamente como membro do time
REVOKE EXECUTE ON FUNCTION public.auto_add_captain_as_member() FROM anon;

-- Trigger: atualiza updated_at automaticamente
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon;

-- Trigger: reage a mudanças de status de inscrição
REVOKE EXECUTE ON FUNCTION public.trg_inscricao_status_change() FROM anon;

-- Trigger: reage ao fim de uma partida
REVOKE EXECUTE ON FUNCTION public.trg_match_finished() FROM anon;

-- Trigger: reage ao início de um torneio
REVOKE EXECUTE ON FUNCTION public.trg_tournament_started() FROM anon;

-- Sensível: cria perfil de novo usuário (chamada apenas por trigger auth)
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;

-- Sensível: registra ação administrativa no audit log
REVOKE EXECUTE ON FUNCTION public.log_admin_action(text, text, text, jsonb, jsonb) FROM anon;

-- Sensível: chama edge function arbitrária — não pode ser pública
REVOKE EXECUTE ON FUNCTION public.call_edge_function(text, jsonb) FROM anon;

-- Sensível: expira convites pendentes
REVOKE EXECUTE ON FUNCTION public.expire_pending_invites() FROM anon;

-- Trigger: sincroniza body/message em notificações
REVOKE EXECUTE ON FUNCTION public.sync_notifications_body_message() FROM anon;
