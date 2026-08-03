import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageCircle, Phone, ArrowLeft } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { requestPhoneCode, verifyPhoneCode } from "@/lib/auth-phone.functions";
import { feedback } from "@/lib/feedback";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — TalkMe" },
      { name: "description", content: "Sign in to TalkMe with your phone number to start chatting." },
      { property: "og:title", content: "Sign in — TalkMe" },
      { property: "og:description", content: "Sign in to TalkMe with your phone number." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function errorText(e: unknown, t: (k: never) => string): string {
  const msg = e instanceof Error ? e.message : "";
  const map: Record<string, string> = {
    INVALID_PHONE: "errInvalidPhone",
    CODE_INVALID: "errCodeInvalid",
    CODE_NOT_FOUND: "errCodeInvalid",
    CODE_EXPIRED: "errCodeExpired",
    TOO_MANY_ATTEMPTS: "errTooManyAttempts",
    RATE_LIMITED: "errRateLimited",
  };
  const key = Object.keys(map).find((k) => msg.includes(k));
  return t((key ? map[key] : "errGeneric") as never);
}

function AuthPage() {
  const { t, token, authReady, me, signIn } = useApp();
  const navigate = useNavigate();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("+7");
  const [code, setCode] = useState("");
  const [testCode, setTestCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (!authReady || !token) return;
    navigate({ to: me?.displayName ? "/" : "/profile", replace: true });
  }, [authReady, token, me, navigate]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setInterval(() => setCooldown((c) => Math.max(0, c - 1)), 1000);
    return () => clearInterval(id);
  }, [cooldown]);

  const send = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await requestPhoneCode({ data: { phone } });
      setTestCode(res.testCode);
      setStep("code");
      setCooldown(60);
      setCode("");
      feedback("match");
    } catch (e) {
      setError(errorText(e, t as never));
    } finally {
      setBusy(false);
    }
  };

  const verify = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await verifyPhoneCode({ data: { phone, code } });
      signIn(res.token, res.profile);
      feedback("match");
      navigate({ to: res.profile?.displayName ? "/" : "/profile", replace: true });
    } catch (e) {
      setError(errorText(e, t as never));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col justify-center px-5 py-10">
      <div className="mb-8 flex flex-col items-center gap-3 animate-fade-up">
        <div className="grid h-16 w-16 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_20px_50px_-12px_var(--brand-glow)]">
          <MessageCircle className="h-7 w-7" />
        </div>
        <div className="text-2xl font-bold tracking-tight">TalkMe</div>
        <p className="text-center text-sm text-muted-foreground">{t("signInHint")}</p>
      </div>

      <div className="card-soft p-5 animate-fade-up">
        {step === "phone" ? (
          <>
            <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("phoneNumber")}
            </span>
            <div className="mb-4 flex items-center gap-2 rounded-full border border-border px-4 py-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                inputMode="tel"
                placeholder="+7 900 000 00 00"
                className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <button
              onClick={send}
              disabled={busy || phone.replace(/\D/g, "").length < 8}
              className="btn-pill btn-brand w-full text-base"
            >
              {busy ? <div className="ios-spinner" /> : t("getCode")}
            </button>
          </>
        ) : (
          <>
            <button
              onClick={() => setStep("phone")}
              className="btn-pill btn-ghost-pill mb-4 !px-4 !py-2 text-sm"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("back")}
            </button>
            <p className="mb-1 text-sm text-muted-foreground">
              {t("codeSentTo")} {phone}
            </p>
            {testCode && (
              <div className="mb-4 rounded-2xl border border-border px-4 py-2 text-sm">
                {t("testMode")} <span className="font-semibold tabular-nums">{testCode}</span>
              </div>
            )}
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              inputMode="numeric"
              placeholder="000000"
              className="mb-4 w-full rounded-full border border-border bg-transparent px-5 py-3 text-center text-lg font-semibold tracking-[0.4em] tabular-nums outline-none placeholder:text-muted-foreground placeholder:tracking-[0.4em]"
            />
            <button
              onClick={verify}
              disabled={busy || code.length !== 6}
              className="btn-pill btn-brand w-full text-base"
            >
              {busy ? <div className="ios-spinner" /> : t("verify")}
            </button>
            <button
              onClick={send}
              disabled={cooldown > 0 || busy}
              className="btn-pill btn-ghost-pill mt-2 w-full text-sm"
            >
              {cooldown > 0 ? `${t("resendIn")} ${cooldown}s` : t("resend")}
            </button>
          </>
        )}

        {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
      </div>
    </main>
  );
}
