import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { MessageCircle, Check, X, Loader2, Mail, Lock, AtSign } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { isValidNickname } from "@/hooks/use-profile";
import { feedback } from "@/lib/feedback";

export const Route = createFileRoute("/onboarding")({
  head: () => ({ meta: [{ title: "Sign in — TalkMe" }] }),
  component: OnboardingPage,
});

const EMOJIS = ["👤", "😎", "🦊", "🐼", "🐧", "🦁", "🐵", "🐨", "🦄", "🐸", "🐙", "🦋", "🌸", "🍀", "⚡️", "🔥", "🌙", "⭐️", "🎧", "🎮"];

function OnboardingPage() {
  const { t, session, authLoading } = useApp();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"signup" | "signin">("signup");

  useEffect(() => {
    if (!authLoading && session) {
      // If already signed in and has profile → go home; else stay to create profile
      (async () => {
        const { data } = await supabase
          .from("profiles")
          .select("user_id")
          .eq("user_id", session.user.id)
          .maybeSingle();
        if (data) navigate({ to: "/" });
      })();
    }
  }, [authLoading, session, navigate]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-10">
      <div className="mb-6 flex flex-col items-center gap-3 animate-fade-up">
        <div className="grid h-16 w-16 place-items-center rounded-3xl bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_20px_50px_-10px_var(--brand-glow)]">
          <MessageCircle className="h-7 w-7" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight">TalkMe</h1>
        <p className="text-center text-sm text-muted-foreground">
          {mode === "signup" ? t("onbTitle") : t("signInSubtitle")}
        </p>
      </div>

      <div className="mb-4 flex gap-1 rounded-2xl bg-secondary/60 p-1 animate-fade-up">
        {(["signup", "signin"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={
              "flex-1 rounded-xl py-2 text-sm font-medium transition-all " +
              (mode === m ? "bg-background shadow-sm" : "text-muted-foreground")
            }
          >
            {m === "signup" ? t("signUp") : t("signIn")}
          </button>
        ))}
      </div>

      {session && !authLoading ? (
        <ProfileSetup />
      ) : mode === "signup" ? (
        <SignUpForm />
      ) : (
        <SignInForm onSignedIn={() => navigate({ to: "/" })} />
      )}
    </main>
  );
}

function SignUpForm() {
  const { t } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nick, setNick] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState("👤");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nickValid = useMemo(() => isValidNickname(nick), [nick]);
  const emailValid = /.+@.+\..+/.test(email);
  const passValid = password.length >= 6;

  useEffect(() => {
    if (!nickValid) {
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
  }, [nick, nickValid]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nickValid || available !== true || !emailValid || !passValid) return;
    setSaving(true);
    setError(null);
    const { data: signUp, error: signErr } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    if (signErr || !signUp.user) {
      setError(signErr?.message ?? "Sign up failed");
      setSaving(false);
      return;
    }
    const { error: pErr } = await supabase.from("profiles").insert({
      user_id: signUp.user.id,
      nickname: nick.toLowerCase(),
      display_name: displayName.trim() || null,
      avatar_emoji: emoji,
      email,
    } as never);
    if (pErr) {
      setError(pErr.message);
      setSaving(false);
      return;
    }
    feedback("match");
    window.location.href = "/";
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="card-soft p-5 animate-fade-up">
        <Field icon={<AtSign className="h-4 w-4" />} label={t("onbNickname")}>
          <div className="flex items-center">
            <span className="pl-1 pr-1 text-muted-foreground">@</span>
            <input
              value={nick}
              maxLength={20}
              onChange={(e) => setNick(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="yournick"
              className="flex-1 bg-transparent py-1 outline-none placeholder:text-muted-foreground"
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
        </Field>
        <p className="mt-1 text-xs text-muted-foreground">{t("onbNicknameHint")}</p>
      </section>

      <section className="card-soft space-y-3 p-5 animate-fade-up">
        <Field icon={<Mail className="h-4 w-4" />} label={t("email")}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder="you@example.com"
            className="w-full bg-transparent py-1 outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field icon={<Lock className="h-4 w-4" />} label={t("password")}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-transparent py-1 outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
      </section>

      <section className="card-soft p-5 animate-fade-up">
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

      <section className="card-soft p-5 animate-fade-up">
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

      {error && <div className="text-center text-sm text-destructive">{error}</div>}

      <button
        type="submit"
        disabled={!nickValid || available !== true || !emailValid || !passValid || saving}
        className="btn-pill btn-brand w-full text-base disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : t("onbContinue")}
      </button>
    </form>
  );
}

function SignInForm({ onSignedIn }: { onSignedIn: () => void }) {
  const { t } = useApp();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    feedback("match");
    onSignedIn();
  };

  const forgot = async () => {
    if (!/.+@.+\..+/.test(email)) {
      setError(t("enterEmailFirst"));
      return;
    }
    const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });
    if (err) setError(err.message);
    else setResetSent(true);
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <section className="card-soft space-y-3 p-5 animate-fade-up">
        <Field icon={<Mail className="h-4 w-4" />} label={t("email")}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value.trim())}
            placeholder="you@example.com"
            className="w-full bg-transparent py-1 outline-none placeholder:text-muted-foreground"
          />
        </Field>
        <Field icon={<Lock className="h-4 w-4" />} label={t("password")}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full bg-transparent py-1 outline-none placeholder:text-muted-foreground"
          />
        </Field>
      </section>

      {error && <div className="text-center text-sm text-destructive">{error}</div>}
      {resetSent && <div className="text-center text-sm text-[oklch(0.78_0.18_145)]">{t("resetSent")}</div>}

      <button type="submit" disabled={loading} className="btn-pill btn-brand w-full text-base disabled:opacity-50">
        {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : t("signIn")}
      </button>
      <button type="button" onClick={forgot} className="mx-auto block text-sm text-muted-foreground underline">
        {t("forgotPassword")}
      </button>
    </form>
  );
}

// Fallback: signed in but no profile yet (e.g. recovered flow) — let user create one.
function ProfileSetup() {
  const { t, session } = useApp();
  const [nick, setNick] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState("👤");
  const [available, setAvailable] = useState<boolean | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = isValidNickname(nick);

  useEffect(() => {
    if (!valid) {
      setAvailable(null);
      return;
    }
    const h = setTimeout(async () => {
      const { data } = await supabase.from("profiles").select("user_id").ilike("nickname", nick).maybeSingle();
      setAvailable(!data);
    }, 350);
    return () => clearTimeout(h);
  }, [nick, valid]);

  const submit = async () => {
    if (!session || !valid || available !== true) return;
    setSaving(true);
    const { error: err } = await supabase.from("profiles").insert({
      user_id: session.user.id,
      nickname: nick.toLowerCase(),
      display_name: displayName.trim() || null,
      avatar_emoji: emoji,
      email: session.user.email ?? null,
    } as never);
    if (err) {
      setError(err.message);
      setSaving(false);
      return;
    }
    window.location.href = "/";
  };

  return (
    <div className="space-y-4">
      <section className="card-soft p-5">
        <Field icon={<AtSign className="h-4 w-4" />} label={t("onbNickname")}>
          <div className="flex items-center">
            <span className="pr-1 text-muted-foreground">@</span>
            <input
              value={nick}
              maxLength={20}
              onChange={(e) => setNick(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
              placeholder="yournick"
              className="flex-1 bg-transparent py-1 outline-none placeholder:text-muted-foreground"
            />
          </div>
        </Field>
      </section>
      <section className="card-soft p-5">
        <input
          value={displayName}
          maxLength={30}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder={t("onbDisplayNamePh")}
          className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none"
        />
      </section>
      <section className="card-soft p-5">
        <div className="flex flex-wrap gap-2">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={
                "grid h-11 w-11 place-items-center rounded-2xl border text-xl " +
                (e === emoji ? "border-foreground/60 bg-accent scale-110" : "border-border bg-secondary/40")
              }
            >
              {e}
            </button>
          ))}
        </div>
      </section>
      {error && <div className="text-sm text-destructive">{error}</div>}
      <button
        onClick={submit}
        disabled={!valid || available !== true || saving}
        className="btn-pill btn-brand w-full disabled:opacity-50"
      >
        {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : t("onbContinue")}
      </button>
    </div>
  );
}

function Field({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/40 px-3 py-2">
        <span className="text-muted-foreground">{icon}</span>
        {children}
      </div>
    </div>
  );
}
