import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface Profile {
  user_id: string;
  nickname: string;
  display_name: string | null;
  avatar_emoji: string;
  bio: string | null;
  gender: string | null;
  age: number | null;
  last_seen: string;
  created_at: string;
}

export function useProfile(userId: string) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!userId) return;
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    refresh();
  }, [userId, refresh]);

  // heartbeat last_seen
  useEffect(() => {
    if (!userId || !profile) return;
    const beat = () =>
      supabase.from("profiles").update({ last_seen: new Date().toISOString() }).eq("user_id", userId);
    beat();
    const id = setInterval(beat, 20_000);
    return () => clearInterval(id);
  }, [userId, profile?.user_id]);

  return { profile, loading, refresh, setProfile };
}

export function isValidNickname(n: string): boolean {
  return /^[a-z0-9_]{3,20}$/.test(n);
}
