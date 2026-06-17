import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, LogOut, MoreVertical, Flag, Ban } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { feedback } from "@/lib/feedback";
import { toast } from "sonner";

export const Route = createFileRoute("/chat/$roomId")({
  head: () => ({ meta: [{ title: "Chat — TalkMe" }] }),
  component: ChatPage,
});

interface Message {
  id: string;
  room_id: string;
  sender_id: string;
  content: string;
  created_at: string;
}

interface Room {
  id: string;
  user_a: string;
  user_b: string;
  active: boolean;
}

function ChatPage() {
  const { roomId } = Route.useParams();
  const { userId, t } = useApp();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [room, setRoom] = useState<Room | null>(null);
  const [input, setInput] = useState("");
  const [partnerLeft, setPartnerLeft] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [blockOpen, setBlockOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const partnerId = room ? (room.user_a === userId ? room.user_b : room.user_a) : null;

  // load room + history
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: r } = await supabase
        .from("chat_rooms")
        .select("*")
        .eq("id", roomId)
        .maybeSingle();
      if (!cancelled && r) {
        setRoom(r as Room);
        if (!r.active) setPartnerLeft(true);
      }
      const { data: m } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (!cancelled && m) setMessages(m as Message[]);
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  // realtime subscribe
  useEffect(() => {
    const ch = supabase
      .channel(`room-${roomId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `room_id=eq.${roomId}` },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => [...prev, msg]);
          if (msg.sender_id !== userId) feedback("message");
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "chat_rooms", filter: `id=eq.${roomId}` },
        (payload) => {
          const r = payload.new as Room;
          setRoom(r);
          if (!r.active) {
            setPartnerLeft(true);
            feedback("leave");
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [roomId]);

  // auto-scroll
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const v = input.trim();
    if (!v || !room?.active) return;
    setInput("");
    await supabase.from("messages").insert({
      room_id: roomId,
      sender_id: userId,
      content: v,
    });
  };

  const leave = async () => {
    await supabase.from("chat_rooms").update({ active: false }).eq("id", roomId);
    await supabase.from("waiting_queue").delete().eq("user_id", userId);
    navigate({ to: "/" });
  };

  const submitReport = async (reason: string) => {
    if (!partnerId) return;
    await supabase.from("user_reports").insert({
      reporter_id: userId,
      reported_id: partnerId,
      room_id: roomId,
      reason,
    });
    setReportOpen(false);
    toast.success(t("reported"));
  };

  const confirmBlock = async () => {
    if (!partnerId) return;
    await supabase.from("user_blocks").insert({
      blocker_id: userId,
      blocked_id: partnerId,
    });
    setBlockOpen(false);
    toast.success(t("blocked"));
    await leave();
  };

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col px-4 py-3">
      <header className="card-soft mb-3 flex items-center justify-between gap-2 px-4 py-2.5 animate-fade-up">
        <button
          onClick={leave}
          className="btn-pill btn-ghost-pill !p-2.5"
          aria-label={t("back")}
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex flex-col items-center">
          <div className="text-sm font-semibold">{t("stranger")}</div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className={
                "h-1.5 w-1.5 rounded-full " +
                (partnerLeft ? "bg-destructive" : "bg-[oklch(0.78_0.18_145)]")
              }
            />
            {partnerLeft ? t("partnerLeft") : t("connected")}
          </div>
        </div>
        <div className="relative">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="btn-pill btn-ghost-pill !p-2.5"
            aria-label={t("more")}
          >
            <MoreVertical className="h-5 w-5" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMenuOpen(false)} />
              <div className="card-soft absolute right-0 top-12 z-20 w-48 overflow-hidden p-1 animate-fade-up">
                <button
                  onClick={() => { setMenuOpen(false); setReportOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-accent"
                >
                  <Flag className="h-4 w-4" />
                  {t("report")}
                </button>
                <button
                  onClick={() => { setMenuOpen(false); setBlockOpen(true); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm text-destructive hover:bg-accent"
                >
                  <Ban className="h-4 w-4" />
                  {t("block")}
                </button>
                <div className="my-1 h-px bg-border" />
                <button
                  onClick={() => { setMenuOpen(false); leave(); }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm hover:bg-accent"
                >
                  <LogOut className="h-4 w-4" />
                  {t("leave")}
                </button>
              </div>
            </>
          )}
        </div>
      </header>

      {reportOpen && (
        <Sheet onClose={() => setReportOpen(false)}>
          <h3 className="text-lg font-semibold">{t("reportTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("reportHint")}</p>
          <div className="mt-4 space-y-2">
            {(["reasonSpam", "reasonAbuse", "reasonAge", "reasonOther"] as const).map((k) => (
              <button
                key={k}
                onClick={() => submitReport(t(k))}
                className="btn-pill btn-ghost-pill w-full justify-start !px-4"
              >
                {t(k)}
              </button>
            ))}
          </div>
          <button onClick={() => setReportOpen(false)} className="btn-pill btn-ghost-pill mt-3 w-full">
            {t("cancel")}
          </button>
        </Sheet>
      )}

      {blockOpen && (
        <Sheet onClose={() => setBlockOpen(false)}>
          <h3 className="text-lg font-semibold">{t("blockTitle")}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{t("blockHint")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={() => setBlockOpen(false)} className="btn-pill btn-ghost-pill">
              {t("cancel")}
            </button>
            <button onClick={confirmBlock} className="btn-pill bg-destructive text-destructive-foreground">
              {t("confirm")}
            </button>
          </div>
        </Sheet>
      )}

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-1 py-2">
        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div
              key={m.id}
              className={"flex animate-fade-up " + (mine ? "justify-end" : "justify-start")}
            >
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
        {partnerLeft && (
          <div className="py-6 text-center text-sm text-muted-foreground animate-fade-up">
            {t("partnerLeft")}
          </div>
        )}
      </div>

      {partnerLeft ? (
        <button onClick={() => navigate({ to: "/" })} className="btn-pill btn-brand mt-3 w-full">
          {t("newChat")}
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
          className="card-soft mt-3 flex items-center gap-2 p-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
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
      )}
    </main>
  );
}
