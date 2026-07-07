
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS email text;

ALTER TABLE public.dm_messages
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_url text,
  ADD COLUMN IF NOT EXISTS duration_ms integer;

CREATE OR REPLACE FUNCTION public.mark_conversation_read(p_conversation_id uuid, p_user_id text)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.dm_messages
  SET read_at = now()
  WHERE conversation_id = p_conversation_id
    AND sender_id <> p_user_id
    AND read_at IS NULL;
$$;
