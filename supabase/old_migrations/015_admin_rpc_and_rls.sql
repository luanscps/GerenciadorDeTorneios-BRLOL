-- Migration 015: função RPC para verificar admin + RLS policy correta

-- 1. Função SECURITY DEFINER: roda como superusuário, ignora RLS
--    Retorna true se o usuário atual é admin na tabela profiles.
CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT is_admin FROM public.profiles WHERE id = auth.uid() LIMIT 1),
    false
  );
$$;

-- Permite que qualquer usuário autenticado chame a função
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- 2. Garante RLS policy: usuário pode sempre ler o próprio perfil
--    (idempotente: usa IF NOT EXISTS via DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename  = 'profiles'
      AND policyname = 'profiles_select_own'
  ) THEN
    EXECUTE $policy$
      CREATE POLICY profiles_select_own ON public.profiles
      FOR SELECT USING (auth.uid() = id)
    $policy$;
  END IF;
END;
$$;

-- 3. Garante que is_admin=true para luanscps@gmail.com (idempotente)
UPDATE public.profiles
SET    is_admin = TRUE
WHERE  id = (SELECT id FROM auth.users WHERE email = 'luanscps@gmail.com' LIMIT 1)
  AND  (is_admin IS NULL OR is_admin = FALSE);
