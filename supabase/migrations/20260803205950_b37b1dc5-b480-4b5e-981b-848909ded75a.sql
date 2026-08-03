-- 1. Phone auth tables (server-only access, no anon/authenticated grants)
CREATE TABLE public.auth_phones (
  user_id text PRIMARY KEY,
  phone text NOT NULL UNIQUE,
  verified boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.auth_phones TO service_role;
ALTER TABLE public.auth_phones ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.phone_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone text NOT NULL,
  code_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  consumed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX phone_codes_phone_idx ON public.phone_codes (phone, created_at DESC);
GRANT ALL ON public.phone_codes TO service_role;
ALTER TABLE public.phone_codes ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$
LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_auth_phones_updated_at BEFORE UPDATE ON public.auth_phones
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Profiles: hide sensitive columns, writes only from server
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.profiles ALTER COLUMN nickname DROP NOT NULL;

DROP POLICY IF EXISTS "profiles open" ON public.profiles;
REVOKE ALL ON public.profiles FROM anon, authenticated;
GRANT SELECT (user_id, display_name, avatar_url, avatar_emoji, bio, gender, age, last_seen, created_at)
  ON public.profiles TO anon, authenticated;
GRANT ALL ON public.profiles TO service_role;
CREATE POLICY "profiles public read" ON public.profiles FOR SELECT TO anon, authenticated USING (true);

-- 3. Lock down unused legacy tables (no client access at all)
DROP POLICY IF EXISTS "dm_messages open" ON public.dm_messages;
DROP POLICY IF EXISTS "conversations open" ON public.conversations;
DROP POLICY IF EXISTS "friendships open" ON public.friendships;
DROP POLICY IF EXISTS "typing_status open" ON public.typing_status;
REVOKE ALL ON public.dm_messages, public.conversations, public.friendships, public.typing_status FROM anon, authenticated;
GRANT ALL ON public.dm_messages, public.conversations, public.friendships, public.typing_status TO service_role;

-- 4. Storage: remove blanket public access (server issues signed URLs)
DROP POLICY IF EXISTS "media read all" ON storage.objects;
DROP POLICY IF EXISTS "media insert all" ON storage.objects;
DROP POLICY IF EXISTS "media update all" ON storage.objects;
DROP POLICY IF EXISTS "media delete all" ON storage.objects;