import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { feedback } from "@/lib/feedback";
import type { Profile } from "@/hooks/use-profile";

export const Route = createFileRoute("/dm/$nickname")({
  head: () => ({ meta: [{ title: "Chat — TalkMe" }] }),
  component: DmPage,
});

interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

function DmPage() {
  const { nickname } = Route.useParams();
  const { userId, t } = useApp();
  const navigate = useNavigate();
  const [other, setOther] = useState<Profile | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);

  // load other + conversation + history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: p } = await supabase
        .from("profiles")
        .select("*")
        .ilike("nickname", nickname)
        .maybeSingle();
      if (cancelled || !p) {
        setLoading(false);
        return;
      }
      setOther(p as Profile);
      const { data: cid } = await supabase.rpc("open_conversation", {
        p_a: userId,
        p_b: (p as Profile).user_id,
      });
      if (cancelled || typeof cid !== "string") return;
      setConversationId(cid);
      const { data: m } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setMessages((m as DmMessage[]) ?? []);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nickname, userId]);

  // realtime
  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as DmMessage;
          setMessages((prev) => (prev.some((x) => x.id === msg.id) ? prev : [...prev, msg]));
          if (msg.sender_id !== userId) feedback("message");
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "typing_status", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const row = (payload.new ?? payload.old) as { user_id: string; updated_at: string } | null;
          if (!row || row.user_id === userId) return;
          const fresh = Date.now() - new Date(row.updated_at).getTime() < 3000;
          setOtherTyping(fresh);
          if (fresh) {
            window.setTimeout(() => setOtherTyping(false), 3200);
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [conversationId, userId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, otherTyping]);

  const pingTyping = () => {
    if (!conversationId) return;
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    supabase.from("typing_status").upsert(
      { conversation_id: conversationId, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" },
    );
    typingTimer.current = window.setTimeout(() => {}, 1500);
  };

  const send = async () => {
    const v = input.trim();
    if (!v || !conversationId) return;
    setInput("");
    const optimistic: DmMessage = {
      id: `tmp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: userId,
      content: v,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    await supabase.from("dm_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: v,
    });
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
  };

  const isOnline = other ? Date.now() - new Date(other.last_seen).getTime() < 45_000 : false;

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col px-4 py-3">
      <header className="card-soft mb-3 flex items-center justify-between gap-2 px-4 py-2.5 animate-fade-up">
        <button onClick={() => navigate({ to: "/" })} className="btn-pill btn-ghost-pill !p-2.5" aria-label={t("back")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-lg">
            {other?.avatar_emoji ?? "👤"}
          </div>
          <div className="flex min-w-0 flex-col items-start">
            <div className="truncate text-sm font-semibold">
              {other?.display_name || `@${other?.nickname ?? nickname}`}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {otherTyping ? (
                <span className="text-[var(--brand)]">{t("typing")}</span>
              ) : (
                <>
                  <span className={"h-1.5 w-1.5 rounded-full " + (isOnline ? "bg-[oklch(0.78_0.18_145)]" : "bg-muted-foreground/50")} />
                  {isOnline ? t("online2") : t("offline")}
                </>
              )}
            </div>
          </div>
        </div>
        <div className="w-9" />
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-1 py-2">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="ios-spinner ios-spinner-brand" style={{ width: "1.75rem", height: "1.75rem", borderWidth: "3px" }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">{t("dmEmpty")}</div>
        )}
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div key={m.id} className={"flex animate-fade-up " + (mine ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[78%] rounded-3xl px-4 py-2.5 text-sm leading-snug " +
                  (mine
                    ? "rounded-br-md bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_8px_24px_-12px_var(--brand-glow)]"
                    : "rounded-bl-md bg-card text-foreground border border-border")
                }
              >
                {m.content}
              </div>
            </div>
          );
        })}
        {otherTyping && (
          <div className="flex justify-start animate-fade-up">
            <div className="rounded-3xl rounded-bl-md border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              …
            </div>
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
        className="card-soft mt-3 flex items-center gap-2 p-2"
      >
        <input
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            pingTyping();
          }}
          placeholder={t("typeMessage")}
          className="flex-1 bg-transparent px-3 py-2 text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          type="submit"
          disabled={!input.trim()}
          className="btn-pill btn-brand !p-3"
          aria-label={t("send")}
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </main>
  );
}
