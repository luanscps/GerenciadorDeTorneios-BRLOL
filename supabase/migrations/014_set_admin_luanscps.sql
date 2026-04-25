-- Migration 014: define is_admin=true para o usuário luanscps@gmail.com
-- Roda uma única vez; idempotente via ON CONFLICT.
UPDATE public.profiles
SET    is_admin = TRUE
WHERE  id = (
  SELECT id
  FROM   auth.users
  WHERE  email = 'luanscps@gmail.com'
  LIMIT  1
);
