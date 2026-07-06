import { createFileRoute, useNavigate, Link, Navigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Users, Search, Settings as SettingsIcon } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { useProfile, type Profile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TalkMe — Chats" },
      { name: "description", content: "Chat with friends and meet new people." },
    ],
  }),
  component: ChatsPage,
});

interface ConvRow {
  id: string;
  user_a: string;
  user_b: string;
  last_message_at: string;
}
interface ChatItem {
  conversation_id: string;
  other: Profile;
  last_message: string | null;
  last_message_at: string;
}

function ChatsPage() {
  const { userId, t } = useApp();
  const { profile, loading: profileLoading } = useProfile(userId);
  const [chats, setChats] = useState<ChatItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    if (!userId) return;
    const { data: convs } = await supabase
      .from("conversations")
      .select("*")
      .or(`user_a.eq.${userId},user_b.eq.${userId}`)
      .order("last_message_at", { ascending: false });
    const rows = (convs as ConvRow[]) ?? [];
    if (rows.length === 0) {
      setChats([]);
      setLoading(false);
      return;
    }
    const otherIds = rows.map((r) => (r.user_a === userId ? r.user_b : r.user_a));
    const { data: profs } = await supabase.from("profiles").select("*").in("user_id", otherIds);
    const profMap = new Map<string, Profile>();
    (profs as Profile[] | null)?.forEach((p) => profMap.set(p.user_id, p));
    const { data: lastMsgs } = await supabase
      .from("dm_messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", rows.map((r) => r.id))
      .order("created_at", { ascending: false });
    const lastMap = new Map<string, string>();
    (lastMsgs ?? []).forEach((m: { conversation_id: string; content: string }) => {
      if (!lastMap.has(m.conversation_id)) lastMap.set(m.conversation_id, m.content);
    });
    const items: ChatItem[] = rows
      .map((r) => {
        const oid = r.user_a === userId ? r.user_b : r.user_a;
        const other = profMap.get(oid);
        if (!other) return null;
        return {
          conversation_id: r.id,
          other,
          last_message: lastMap.get(r.id) ?? null,
          last_message_at: r.last_message_at,
        };
      })
      .filter(Boolean) as ChatItem[];
    setChats(items);
    setLoading(false);
  };

  useEffect(() => {
    if (!profile) return;
    load();
    const ch = supabase
      .channel(`chats-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "dm_messages" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => load())
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.user_id, userId]);

  if (!profileLoading && !profile && userId) {
    return <Navigate to="/onboarding" />;
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-5 flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_10px_30px_-10px_var(--brand-glow)]">
            <MessageCircle className="h-5 w-5" />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-xl font-bold tracking-tight">TalkMe</span>
            {profile && (
              <span className="text-xs text-muted-foreground">@{profile.nickname}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/people" className="btn-pill btn-ghost-pill !p-3" aria-label={t("peopleTitle")}>
            <Search className="h-5 w-5" />
          </Link>
          <Link to="/settings" className="btn-pill btn-ghost-pill !p-3" aria-label={t("settings")}>
            <SettingsIcon className="h-5 w-5" />
          </Link>
        </div>
      </header>

      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {t("chatsTitle")}
      </h2>

      {loading ? (
        <div className="py-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
      ) : chats.length === 0 ? (
        <div className="card-soft flex flex-col items-center gap-3 p-8 text-center animate-fade-up">
          <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary">
            <Users className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm text-muted-foreground">{t("noChats")}</p>
          <Link to="/people" className="btn-pill btn-brand mt-2 w-full">
            <Users className="h-4 w-4" />
            {t("findPeople")}
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {chats.map((c) => (
            <Link
              key={c.conversation_id}
              to="/dm/$nickname"
              params={{ nickname: c.other.nickname }}
              className="card-soft flex w-full items-center gap-3 px-4 py-3 text-left animate-fade-up"
            >
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-xl">
                {c.other.avatar_emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">
                  {c.other.display_name || `@${c.other.nickname}`}
                </div>
                <div className="truncate text-xs text-muted-foreground">
                  {c.last_message ?? t("dmEmpty")}
                </div>
              </div>
              <div className="text-[10px] text-muted-foreground">
                {formatTime(c.last_message_at)}
              </div>
            </Link>
          ))}
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function formatTime(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const same = d.toDateString() === now.toDateString();
  return same
    ? d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString(undefined, { day: "2-digit", month: "2-digit" });
}
