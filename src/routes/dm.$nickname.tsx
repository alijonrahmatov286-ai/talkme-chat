import { createFileRoute, useNavigate, Navigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Paperclip, Mic, X, Loader2, Check, CheckCheck } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { feedback } from "@/lib/feedback";
import { uploadToBucket } from "@/lib/media";
import { Avatar } from "@/components/avatar";
import { MessageMedia } from "@/components/message-media";
import type { Profile } from "@/hooks/use-profile";

export const Route = createFileRoute("/dm/$nickname")({
  head: () => ({ meta: [{ title: "Chat — TalkMe" }] }),
  component: DmPage,
});

type Kind = "text" | "image" | "video" | "voice";

interface DmMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
  read_at: string | null;
  kind: Kind;
  media_url: string | null;
  duration_ms: number | null;
}

function DmPage() {
  const { nickname } = Route.useParams();
  const { userId, t, authLoading } = useApp();
  const navigate = useNavigate();
  const [other, setOther] = useState<Profile | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<DmMessage[]>([]);
  const [input, setInput] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordStart, setRecordStart] = useState<number>(0);
  const [recordNow, setRecordNow] = useState<number>(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (!userId) return;
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
      setOther(p as unknown as Profile);
      const { data: cid } = await supabase.rpc("open_conversation", {
        p_a: userId,
        p_b: (p as { user_id: string }).user_id,
      });
      if (cancelled || typeof cid !== "string") return;
      setConversationId(cid);
      const { data: m } = await supabase
        .from("dm_messages")
        .select("*")
        .eq("conversation_id", cid)
        .order("created_at", { ascending: true });
      if (!cancelled) {
        setMessages((m as unknown as DmMessage[]) ?? []);
        setLoading(false);
        await supabase.rpc("mark_conversation_read" as never, {
          p_conversation_id: cid,
          p_user_id: userId,
        } as never);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [nickname, userId]);

  useEffect(() => {
    if (!conversationId) return;
    const ch = supabase
      .channel(`dm-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as unknown as DmMessage;
          setMessages((prev) => {
            const filtered = prev.filter((x) => !x.id.startsWith("tmp-") || x.content !== msg.content);
            if (filtered.some((x) => x.id === msg.id)) return filtered;
            return [...filtered, msg];
          });
          if (msg.sender_id !== userId) {
            feedback("message");
            supabase.rpc("mark_conversation_read" as never, {
              p_conversation_id: conversationId,
              p_user_id: userId,
            } as never);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "dm_messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as unknown as DmMessage;
          setMessages((prev) => prev.map((x) => (x.id === msg.id ? msg : x)));
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
          if (fresh) window.setTimeout(() => setOtherTyping(false), 3200);
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

  useEffect(() => {
    if (!recording) return;
    const id = setInterval(() => setRecordNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [recording]);

  if (!authLoading && !userId) return <Navigate to="/onboarding" />;

  const pingTyping = () => {
    if (!conversationId) return;
    if (typingTimer.current) window.clearTimeout(typingTimer.current);
    supabase.from("typing_status").upsert(
      { conversation_id: conversationId, user_id: userId, updated_at: new Date().toISOString() },
      { onConflict: "conversation_id,user_id" },
    );
    typingTimer.current = window.setTimeout(() => {}, 1500);
  };

  const sendMessage = async (payload: Partial<DmMessage> & { kind: Kind; content: string }) => {
    if (!conversationId) return;
    const optimistic: DmMessage = {
      id: `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      conversation_id: conversationId,
      sender_id: userId,
      content: payload.content,
      kind: payload.kind,
      media_url: payload.media_url ?? null,
      duration_ms: payload.duration_ms ?? null,
      read_at: null,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimistic]);
    await supabase.from("dm_messages").insert({
      conversation_id: conversationId,
      sender_id: userId,
      content: payload.content,
      kind: payload.kind,
      media_url: payload.media_url ?? null,
      duration_ms: payload.duration_ms ?? null,
    } as never);
    await supabase.from("conversations").update({ last_message_at: new Date().toISOString() }).eq("id", conversationId);
  };

  const sendText = async () => {
    const v = input.trim();
    if (!v) return;
    setInput("");
    await sendMessage({ kind: "text", content: v });
  };

  const onPickFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !conversationId) return;
    const kind: Kind = file.type.startsWith("video/") ? "video" : "image";
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg");
      const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      await uploadToBucket("chat-media", path, file, file.type);
      await sendMessage({
        kind,
        content: kind === "video" ? "🎥 Video" : "📷 Photo",
        media_url: path,
      });
    } finally {
      setUploading(false);
    }
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream, { mimeType: pickMime() });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        const dur = Date.now() - recordStart;
        if (dur < 500 || !conversationId) return;
        setUploading(true);
        try {
          const ext = rec.mimeType.includes("webm") ? "webm" : "m4a";
          const path = `${conversationId}/${Date.now()}-voice.${ext}`;
          await uploadToBucket("chat-media", path, blob, rec.mimeType);
          await sendMessage({
            kind: "voice",
            content: "🎤 Voice",
            media_url: path,
            duration_ms: dur,
          });
        } finally {
          setUploading(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecordStart(Date.now());
      setRecordNow(Date.now());
      setRecording(true);
    } catch {
      alert(t("micDenied"));
    }
  };

  const stopRecording = (cancel = false) => {
    const rec = recorderRef.current;
    if (!rec) return;
    if (cancel) {
      rec.onstop = () => rec.stream.getTracks().forEach((t) => t.stop());
    }
    rec.stop();
    setRecording(false);
    recorderRef.current = null;
  };

  const isOnline = other ? Date.now() - new Date(other.last_seen).getTime() < 45_000 : false;
  const recSec = Math.floor((recordNow - recordStart) / 1000);

  return (
    <main className="mx-auto flex h-[100dvh] max-w-md flex-col px-4 py-3">
      <header className="card-soft mb-3 flex items-center justify-between gap-2 px-4 py-2.5 animate-fade-up">
        <button onClick={() => navigate({ to: "/" })} className="btn-pill btn-ghost-pill !p-2.5" aria-label={t("back")}>
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex min-w-0 flex-1 items-center justify-center gap-2">
          <Avatar emoji={other?.avatar_emoji ?? "👤"} avatarUrl={other?.avatar_url} size={36} />
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

      <div ref={scrollRef} className="flex-1 space-y-1.5 overflow-y-auto px-1 py-2">
        {loading && (
          <div className="flex justify-center py-8">
            <div className="ios-spinner ios-spinner-brand" style={{ width: "1.75rem", height: "1.75rem", borderWidth: "3px" }} />
          </div>
        )}
        {!loading && messages.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">{t("dmEmpty")}</div>
        )}
        {messages.map((m, i) => {
          const mine = m.sender_id === userId;
          const prev = messages[i - 1];
          const grouped = prev && prev.sender_id === m.sender_id && new Date(m.created_at).getTime() - new Date(prev.created_at).getTime() < 60_000;
          const isMedia = m.kind !== "text";
          return (
            <div key={m.id} className={"flex animate-fade-up " + (mine ? "justify-end" : "justify-start")}>
              <div
                className={
                  "max-w-[80%] px-3.5 py-2 text-sm leading-snug shadow-sm " +
                  (isMedia ? "!p-1.5 " : "") +
                  (mine
                    ? "bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_8px_24px_-14px_var(--brand-glow)] "
                    : "bg-card text-foreground border border-border ") +
                  bubbleShape(mine, grouped)
                }
              >
                {m.kind === "text" ? (
                  <div className="whitespace-pre-wrap break-words">{m.content}</div>
                ) : (
                  <MessageMedia kind={m.kind} path={m.media_url ?? ""} durationMs={m.duration_ms} mine={mine} />
                )}
                <div
                  className={
                    "mt-0.5 flex items-center gap-1 text-[10px] " +
                    (isMedia ? "px-1.5 pb-0.5 " : "") +
                    (mine ? "justify-end text-white/75" : "justify-end text-muted-foreground")
                  }
                >
                  <span>{fmtTime(m.created_at)}</span>
                  {mine && (
                    m.read_at ? (
                      <CheckCheck className="h-3.5 w-3.5" />
                    ) : m.id.startsWith("tmp-") ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3.5 w-3.5" />
                    )
                  )}
                </div>
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

      {recording ? (
        <div className="card-soft mt-3 flex items-center gap-3 p-3 animate-fade-up">
          <button onClick={() => stopRecording(true)} className="btn-pill btn-ghost-pill !p-3" aria-label={t("cancel")}>
            <X className="h-5 w-5" />
          </button>
          <div className="flex flex-1 items-center gap-2">
            <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
            <span className="text-sm font-medium">{t("recording")}</span>
            <span className="ml-auto text-sm tabular-nums text-muted-foreground">
              {String(Math.floor(recSec / 60)).padStart(2, "0")}:{String(recSec % 60).padStart(2, "0")}
            </span>
          </div>
          <button onClick={() => stopRecording(false)} className="btn-pill btn-brand !p-3" aria-label={t("send")}>
            <Send className="h-5 w-5" />
          </button>
        </div>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendText();
          }}
          className="card-soft mt-3 flex items-center gap-1 p-2"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            className="hidden"
            onChange={onPickFile}
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="btn-pill btn-ghost-pill !p-2.5"
            aria-label={t("attach")}
          >
            {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Paperclip className="h-5 w-5" />}
          </button>
          <input
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              pingTyping();
            }}
            placeholder={t("typeMessage")}
            className="flex-1 bg-transparent px-2 py-2 text-sm outline-none placeholder:text-muted-foreground"
          />
          {input.trim() ? (
            <button type="submit" className="btn-pill btn-brand !p-2.5" aria-label={t("send")}>
              <Send className="h-5 w-5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={startRecording}
              className="btn-pill btn-brand !p-2.5"
              aria-label={t("recordVoice")}
            >
              <Mic className="h-5 w-5" />
            </button>
          )}
        </form>
      )}
    </main>
  );
}

function bubbleShape(mine: boolean, grouped: boolean): string {
  if (mine) return grouped ? "rounded-3xl rounded-br-md" : "rounded-3xl rounded-br-md";
  return grouped ? "rounded-3xl rounded-bl-md" : "rounded-3xl rounded-bl-md";
}

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}

function pickMime(): string {
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const c of candidates) {
    if (typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(c)) return c;
  }
  return "audio/webm";
}
