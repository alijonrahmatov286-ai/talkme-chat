
CREATE TABLE public.user_blocks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blocker_id text NOT NULL,
  blocked_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (blocker_id, blocked_id)
);
GRANT SELECT, INSERT, DELETE ON public.user_blocks TO anon, authenticated;
GRANT ALL ON public.user_blocks TO service_role;
ALTER TABLE public.user_blocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "blocks open" ON public.user_blocks FOR ALL USING (true) WITH CHECK (true);

CREATE TABLE public.user_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id text NOT NULL,
  reported_id text NOT NULL,
  room_id uuid,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.user_reports TO anon, authenticated;
GRANT ALL ON public.user_reports TO service_role;
ALTER TABLE public.user_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reports insert" ON public.user_reports FOR INSERT WITH CHECK (true);
CREATE POLICY "reports select own" ON public.user_reports FOR SELECT USING (true);

-- Update matchmaking to exclude mutually blocked users
CREATE OR REPLACE FUNCTION public.find_or_queue_match(
  p_user_id text, p_gender text, p_age integer,
  p_want_gender text, p_want_age_min integer, p_want_age_max integer
) RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE
  v_partner record;
  v_room_id uuid;
BEGIN
  DELETE FROM public.waiting_queue WHERE user_id = p_user_id;

  SELECT * INTO v_partner
  FROM public.waiting_queue
  WHERE user_id <> p_user_id
    AND (p_want_gender = 'any' OR gender = p_want_gender)
    AND age BETWEEN p_want_age_min AND p_want_age_max
    AND (want_gender = 'any' OR want_gender = p_gender)
    AND p_age BETWEEN want_age_min AND want_age_max
    AND NOT EXISTS (
      SELECT 1 FROM public.user_blocks b
      WHERE (b.blocker_id = p_user_id AND b.blocked_id = waiting_queue.user_id)
         OR (b.blocker_id = waiting_queue.user_id AND b.blocked_id = p_user_id)
    )
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_partner.user_id IS NOT NULL THEN
    DELETE FROM public.waiting_queue WHERE user_id = v_partner.user_id;
    INSERT INTO public.chat_rooms (user_a, user_b)
    VALUES (p_user_id, v_partner.user_id)
    RETURNING id INTO v_room_id;
    RETURN v_room_id;
  END IF;

  INSERT INTO public.waiting_queue (user_id, gender, age, want_gender, want_age_min, want_age_max)
  VALUES (p_user_id, p_gender, p_age, p_want_gender, p_want_age_min, p_want_age_max);
  RETURN NULL;
END;
$$;
