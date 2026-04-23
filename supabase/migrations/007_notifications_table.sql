-- 007_notifications_table.sql
-- Tabela de notificacoes in-app com Supabase Realtime
-- Executado em: Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title       text NOT NULL,
  message     text NOT NULL,
  type        text NOT NULL DEFAULT 'system'
                CHECK (type IN ('match', 'inscricao', 'torneio', 'system')),
  read        boolean NOT NULL DEFAULT false,
  link        text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Index para busca por usuario
CREATE INDEX IF NOT EXISTS notifications_user_id_idx
  ON public.notifications (user_id, created_at DESC);

-- RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_see_own_notifications"
  ON public.notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_update_own_notifications"
  ON public.notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- Habilitar Realtime para a tabela
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
