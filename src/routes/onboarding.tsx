import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Check, X, Loader2 } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { isValidNickname } from "@/hooks/use-profile";
import { feedback } from "@/lib/feedback";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Create your @nickname — TalkMe" }] }),
  component: Onboarding,
});

const EMOJIS = ["👤", "😎", "🦊", "🐼", "🐧", "🦁", "🐵", "🐨", "🦄", "🐸", "🐙", "🦋", "🌸", "🍀", "⚡️", "🔥", "🌙", "⭐️", "🎧", "🎮"];

function Onboarding() {
  const { userId, t } = useApp();
  const navigate = useNavigate();
  const [nick, setNick] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState("👤");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const valid = useMemo(() => isValidNickname(nick), [nick]);

  useEffect(() => {
    if (!valid) {
      setAvailable(null);
      return;
    }
    setChecking(true);
    const h = setTimeout(async () => {
      const { data } = await supabase
        .from("profiles")
        .select("user_id")
        .ilike("nickname", nick)
        .maybeSingle();
      setAvailable(!data);
      setChecking(false);
    }, 350);
    return () => clearTimeout(h);
  }, [nick, valid]);

  const submit = async () => {
    if (!valid || available !== true || !userId) return;
    setSaving(true);
    setError(null);
    const { error: err } = await supabase.from("profiles").insert({
      user_id: userId,
      nickname: nick.toLowerCase(),
      display_name: displayName.trim() || null,
      avatar_emoji: emoji,
    });
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    feedback("match");
    navigate({ to: "/" });
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-10">
      <div className="mb-6 flex flex-col items-center gap-3 animate-fade-up">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_20px_50px_-10px_var(--brand-glow)]">
          <MessageCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">TalkMe</h1>
        <p className="text-center text-sm text-muted-foreground">
          {t("onbTitle")}
        </p>
      </div>

      <section className="card-soft mb-4 p-5 animate-fade-up">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("onbNickname")}
        </label>
        <div className="relative flex items-center rounded-2xl border border-border bg-secondary/40 px-3">
          <span className="text-lg text-muted-foreground">@</span>
          <input
            autoFocus
            value={nick}
            maxLength={20}
            onChange={(e) => setNick(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
            placeholder="yournick"
            className="flex-1 bg-transparent px-2 py-3 text-base outline-none placeholder:text-muted-foreground"
          />
          <span className="w-6 text-right">
            {checking ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin text-muted-foreground" />
            ) : available === true ? (
              <Check className="mx-auto h-5 w-5 text-[oklch(0.78_0.18_145)]" />
            ) : available === false ? (
              <X className="mx-auto h-5 w-5 text-destructive" />
            ) : null}
          </span>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">{t("onbNicknameHint")}</p>
      </section>

      <section className="card-soft mb-4 p-5 animate-fade-up">
        <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("onbDisplayName")}
        </label>
        <input
          value={displayName}
          maxLength={30}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("onbDisplayNamePh")}
          className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-base outline-none placeholder:text-muted-foreground"
        />
      </section>

      <section className="card-soft mb-4 p-5 animate-fade-up">
        <label className="mb-3 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("onbAvatar")}
        </label>
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => {
            const active = e === emoji;
            return (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={
                  "grid h-11 w-11 place-items-center rounded-2xl border text-xl transition-all " +
                  (active
                    ? "border-foreground/60 bg-accent scale-110"
                    : "border-border bg-secondary/40 hover:border-foreground/30")
                }
              >
                {e}
              </button>
            );
          })}
        </div>
      </section>

      {error && <div className="mb-3 text-center text-sm text-destructive">{error}</div>}

      <button
        onClick={submit}
        disabled={!valid || available !== true || saving}
        className="btn-pill btn-brand w-full text-base disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : t("onbContinue")}
      </button>
    </main>
  );
}
