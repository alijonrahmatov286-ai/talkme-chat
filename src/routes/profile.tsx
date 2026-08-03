import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Camera, LogOut, User } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { saveMyProfile } from "@/lib/auth-phone.functions";
import { feedback } from "@/lib/feedback";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Profile — TalkMe" },
      { name: "description", content: "Set your photo, name, gender and age on TalkMe." },
      { property: "og:title", content: "Profile — TalkMe" },
      { property: "og:description", content: "Set your photo, name, gender and age on TalkMe." },
      { property: "og:type", content: "profile" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ProfilePage,
});

async function toSquareDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const size = Math.min(512, Math.min(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("no canvas");
  const side = Math.min(bitmap.width, bitmap.height);
  ctx.drawImage(
    bitmap,
    (bitmap.width - side) / 2,
    (bitmap.height - side) / 2,
    side,
    side,
    0,
    0,
    size,
    size,
  );
  return canvas.toDataURL("image/jpeg", 0.85);
}

function ProfilePage() {
  const { t, token, me, authReady, setMe, signOut } = useApp();
  const navigate = useNavigate();
  const fileRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female">("male");
  const [age, setAge] = useState(21);
  const [preview, setPreview] = useState<string | null>(null);
  const [avatarData, setAvatarData] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const isSetup = !me?.displayName;

  useEffect(() => {
    if (authReady && !token) navigate({ to: "/auth", replace: true });
  }, [authReady, token, navigate]);

  useEffect(() => {
    if (!me) return;
    setName(me.displayName ?? "");
    setGender(me.gender === "female" ? "female" : "male");
    setAge(me.age ?? 21);
    setPreview(me.avatarUrl);
  }, [me]);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    try {
      const url = await toSquareDataUrl(file);
      setAvatarData(url);
      setPreview(url);
    } catch {
      setError(t("errGeneric"));
    }
  };

  const save = async () => {
    if (!token) return;
    setBusy(true);
    setError(null);
    try {
      const res = await saveMyProfile({
        data: { token, displayName: name, gender, age, avatarDataUrl: avatarData },
      });
      setMe(res.profile);
      setAvatarData(null);
      setDone(true);
      feedback("match");
      if (isSetup) navigate({ to: "/", replace: true });
      else setTimeout(() => setDone(false), 1500);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "";
      setError(msg.includes("NAME_TOO_SHORT") ? t("errNameShort") : t("errGeneric"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-[100dvh] max-w-md flex-col px-5 py-8">
      <header className="mb-6 flex items-center justify-between animate-fade-up">
        {isSetup ? (
          <span className="w-10" />
        ) : (
          <button
            onClick={() => navigate({ to: "/" })}
            className="btn-pill btn-ghost-pill !p-3"
            aria-label={t("back")}
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
        )}
        <h1 className="text-lg font-semibold">{t("profile")}</h1>
        <span className="w-10" />
      </header>

      <div className="card-soft p-5 animate-fade-up">
        <div className="mb-5 flex flex-col items-center gap-3">
          <button
            onClick={() => fileRef.current?.click()}
            className="relative grid h-24 w-24 place-items-center overflow-hidden rounded-full bg-[var(--brand)]/20"
            aria-label={t("choosePhoto")}
          >
            {preview ? (
              <img src={preview} alt={name || "avatar"} className="h-full w-full object-cover" />
            ) : (
              <User className="h-8 w-8 text-muted-foreground" />
            )}
            <span className="absolute bottom-0 grid w-full place-items-center bg-black/35 py-1">
              <Camera className="h-4 w-4 text-white" />
            </span>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => pick(e.target.files?.[0])}
          />
          <span className="text-xs text-muted-foreground">
            {preview ? t("changePhoto") : t("choosePhoto")}
          </span>
        </div>

        <label className="mb-4 block">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("yourName")}
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 32))}
            placeholder={t("namePlaceholder")}
            className="w-full rounded-full border border-border bg-transparent px-5 py-3 text-sm outline-none placeholder:text-muted-foreground"
          />
        </label>

        <div className="mb-4">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("yourGender")}
          </span>
          <div className="flex gap-2">
            {(["male", "female"] as const).map((g) => (
              <button
                key={g}
                onClick={() => setGender(g)}
                className={"btn-pill flex-1 text-sm " + (gender === g ? "btn-brand" : "btn-ghost-pill")}
              >
                {t(g)}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5">
          <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("yourAge")}
          </span>
          <div className="flex flex-wrap gap-2">
            {[
              { value: 18, label: "18–20" },
              { value: 21, label: "21–25" },
              { value: 30, label: "30+" },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => setAge(o.value)}
                className={
                  "btn-pill !px-4 !py-2 text-sm " + (age === o.value ? "btn-brand" : "btn-ghost-pill")
                }
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <button onClick={save} disabled={busy} className="btn-pill btn-brand w-full text-base">
          {busy ? <div className="ios-spinner" /> : done ? t("saved") : isSetup ? t("continueBtn") : t("save")}
        </button>
        {error && <p className="mt-3 text-center text-sm text-destructive">{error}</p>}
      </div>

      {!isSetup && (
        <button
          onClick={() => {
            signOut();
            navigate({ to: "/auth", replace: true });
          }}
          className="btn-pill btn-ghost-pill mt-4 w-full text-sm"
        >
          <LogOut className="h-4 w-4" />
          {t("logout")}
        </button>
      )}
    </main>
  );
}
