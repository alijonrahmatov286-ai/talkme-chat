import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Flag, Wifi, WifiOff } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { feedback } from "@/lib/feedback";
import { useNetworkStatus } from "@/lib/use-network";
import { reportChat } from "@/lib/moderation.functions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  const [loading, setLoading] = useState(true);
  const network = useNetworkStatus();
  const scrollRef = useRef<HTMLDivElement>(null);

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
        else feedback("match");
      }
      const { data: m } = await supabase
        .from("messages")
        .select("*")
        .eq("room_id", roomId)
        .order("created_at", { ascending: true });
      if (!cancelled && m) setMessages(m as Message[]);
      if (!cancelled) setLoading(false);
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
  }, [roomId, userId]);

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
    feedback("leave");
    await supabase.from("chat_rooms").update({ active: false }).eq("id", roomId);
    await supabase.from("waiting_queue").delete().eq("user_id", userId);
    navigate({ to: "/" });
  };

  const showNetworkBar = network === "offline" || network === "connecting";

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col px-4 py-3">
      {showNetworkBar && (
        <div className="mb-2 flex justify-center animate-fade-up">
          <div
            className={
              "network-bar " +
              (network === "offline" ? "network-bar-offline" : "network-bar-connecting")
            }
          >
            {network === "offline" ? (
              <>
                <WifiOff className="h-3 w-3" />
                {t("noConnection")}
              </>
            ) : (
              <>
                <div className="ios-spinner ios-spinner-brand" />
                {t("connecting")}
              </>
            )}
          </div>
        </div>
      )}

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
        <button onClick={leave} className="btn-pill btn-ghost-pill !p-2.5" aria-label={t("leave")}>
          <LogOut className="h-5 w-5" />
        </button>
      </header>

      <div ref={scrollRef} className="flex-1 space-y-2 overflow-y-auto px-1 py-2">
        {loading && (
          <div className="flex flex-col items-center justify-center gap-3 py-12 animate-fade-up">
            <div className="ios-spinner ios-spinner-brand" style={{ width: "2rem", height: "2rem", borderWidth: "3px" }} />
            <span className="text-xs text-muted-foreground">{t("loadingMessages")}</span>
          </div>
        )}

        {messages.map((m) => {
          const mine = m.sender_id === userId;
          return (
            <div
              key={m.id}
              className={"flex animate-fade-up " + (mine ? "justify-end" : "justify-start")}
            >
              <div
                className={
                  "max-w-[78%] rounded-full px-4 py-2.5 text-sm leading-snug " +
                  (mine
                    ? "bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_8px_24px_-12px_var(--brand-glow)]"
                    : "bg-card text-foreground border border-border")
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
