-- Migration 003: audit_log table and trigger
-- CORRIGIDO: usa public.profiles (is_admin boolean), nao public.users

-- Drop objects se existirem (idempotente)
DROP TRIGGER IF EXISTS audit_matches_trigger ON public.matches;
DROP FUNCTION IF EXISTS public.audit_matches_changes();
DROP FUNCTION IF EXISTS public.log_admin_action(text, text, text, jsonb, jsonb);
DROP TABLE IF EXISTS public.audit_log;

-- Tabela principal de auditoria
CREATE TABLE public.audit_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at timestamptz DEFAULT now() NOT NULL,
  admin_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  table_name text NOT NULL,
  record_id text,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  user_agent text
);

-- RLS: apenas admins (profiles.is_admin = true) podem ler
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view audit log"
  ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND is_admin = true
    )
  );

CREATE POLICY "System can insert audit log"
  ON public.audit_log FOR INSERT
  WITH CHECK (true);

-- Indices para performance
CREATE INDEX idx_audit_log_created_at ON public.audit_log(created_at DESC);
CREATE INDEX idx_audit_log_admin_id   ON public.audit_log(admin_id);
CREATE INDEX idx_audit_log_table_name ON public.audit_log(table_name);

-- Funcao publica para registrar acoes administrativas manualmente
CREATE OR REPLACE FUNCTION public.log_admin_action(
  p_action text,
  p_table_name text,
  p_record_id text DEFAULT NULL,
  p_old_data jsonb DEFAULT NULL,
  p_new_data jsonb DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.audit_log (admin_id, action, table_name, record_id, old_data, new_data)
  VALUES (auth.uid(), p_action, p_table_name, p_record_id, p_old_data, p_new_data);
END;
$$;

-- Funcao de trigger para auditoria automatica na tabela matches
CREATE OR REPLACE FUNCTION public.audit_matches_changes()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    INSERT INTO public.audit_log (admin_id, action, table_name, record_id, old_data, new_data)
    VALUES (
      auth.uid(),
      'UPDATE',
      'matches',
      NEW.id::text,
      row_to_json(OLD)::jsonb,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  ELSIF TG_OP = 'INSERT' THEN
    INSERT INTO public.audit_log (admin_id, action, table_name, record_id, new_data)
    VALUES (
      auth.uid(),
      'INSERT',
      'matches',
      NEW.id::text,
      row_to_json(NEW)::jsonb
    );
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$;

CREATE TRIGGER audit_matches_trigger
  AFTER INSERT OR UPDATE ON public.matches
  FOR EACH ROW EXECUTE FUNCTION public.audit_matches_changes();

-- Permissoes
GRANT EXECUTE ON FUNCTION public.log_admin_action TO authenticated;
