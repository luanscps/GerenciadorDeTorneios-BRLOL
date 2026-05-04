--
-- 010_fix_notifications.sql
-- Consolida notifications mantendo compatibilidade com o snapshot
-- Referência:
--   - sql/public.notifications_2026-04-23T090140.sql
--

-- -----------------------------------------------------------------
-- Colunas compatíveis com frontend atual
-- -----------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS message text;

ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS link text;

UPDATE public.notifications
  SET message = body
  WHERE message IS NULL AND body IS NOT NULL;

-- -----------------------------------------------------------------
-- Garante FK em profiles
-- -----------------------------------------------------------------
ALTER TABLE public.notifications
  DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;

ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- -----------------------------------------------------------------
-- Mantém body <-> message sincronizados
-- body continua sendo a coluna canônica, mas message passa a existir
-- para compatibilidade com componentes que leem esse nome.
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sync_notifications_body_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.body IS NULL AND NEW.message IS NOT NULL THEN
    NEW.body := NEW.message;
  END IF;
  IF NEW.message IS NULL AND NEW.body IS NOT NULL THEN
    NEW.message := NEW.body;
  END IF;
  IF NEW.body IS NOT NULL AND NEW.message IS DISTINCT FROM NEW.body THEN
    NEW.message := NEW.body;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notifications_sync_body_message ON public.notifications;
CREATE TRIGGER trg_notifications_sync_body_message
  BEFORE INSERT OR UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.sync_notifications_body_message();

-- -----------------------------------------------------------------
-- Índices
-- -----------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_notifications_user_created_at
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, read);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON public.notifications(type);

-- -----------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_insert_own ON public.notifications;
CREATE POLICY notifications_insert_own ON public.notifications
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.role() = 'service_role');

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS notifications_delete_own ON public.notifications;
CREATE POLICY notifications_delete_own ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- -----------------------------------------------------------------
-- Realtime
-- -----------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'notifications'
  ) THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  END IF;
END;
$$;

-- -----------------------------------------------------------------
-- Grants
-- -----------------------------------------------------------------
GRANT ALL ON public.notifications TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
