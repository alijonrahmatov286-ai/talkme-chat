
-- PROFILES
CREATE TABLE public.profiles (
  user_id text PRIMARY KEY,
  nickname text NOT NULL,
  display_name text,
  avatar_emoji text NOT NULL DEFAULT '👤',
  bio text,
  gender text,
  age integer,
  last_seen timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX profiles_nickname_lower_key ON public.profiles (lower(nickname));
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles open" ON public.profiles FOR ALL USING (true) WITH CHECK (true);

-- FRIENDSHIPS
CREATE TABLE public.friendships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  friend_id text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, friend_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.friendships TO anon, authenticated;
GRANT ALL ON public.friendships TO service_role;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
CREATE POLICY "friendships open" ON public.friendships FOR ALL USING (true) WITH CHECK (true);

-- CONVERSATIONS (user_a is always the lexicographically smaller id)
CREATE TABLE public.conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_a text NOT NULL,
  user_b text NOT NULL,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_a, user_b),
  CHECK (user_a < user_b)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.conversations TO anon, authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "conversations open" ON public.conversations FOR ALL USING (true) WITH CHECK (true);

-- DM MESSAGES
CREATE TABLE public.dm_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);
CREATE INDEX dm_messages_conv_idx ON public.dm_messages (conversation_id, created_at);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.dm_messages TO anon, authenticated;
GRANT ALL ON public.dm_messages TO service_role;
ALTER TABLE public.dm_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "dm_messages open" ON public.dm_messages FOR ALL USING (true) WITH CHECK (true);

-- TYPING STATUS
CREATE TABLE public.typing_status (
  conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  user_id text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (conversation_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.typing_status TO anon, authenticated;
GRANT ALL ON public.typing_status TO service_role;
ALTER TABLE public.typing_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "typing_status open" ON public.typing_status FOR ALL USING (true) WITH CHECK (true);

-- Get or create a conversation between two users
CREATE OR REPLACE FUNCTION public.open_conversation(p_a text, p_b text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_lo text;
  v_hi text;
  v_id uuid;
BEGIN
  IF p_a = p_b THEN
    RAISE EXCEPTION 'Cannot open conversation with self';
  END IF;
  IF p_a < p_b THEN v_lo := p_a; v_hi := p_b; ELSE v_lo := p_b; v_hi := p_a; END IF;
  SELECT id INTO v_id FROM public.conversations WHERE user_a = v_lo AND user_b = v_hi;
  IF v_id IS NOT NULL THEN RETURN v_id; END IF;
  INSERT INTO public.conversations (user_a, user_b) VALUES (v_lo, v_hi) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.dm_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.typing_status;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
