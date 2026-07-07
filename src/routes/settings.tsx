import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Volume2, VolumeX, Vibrate, VibrateOff, Moon, Sun, ChevronDown, LogOut, Camera, Loader2, Pencil, X } from "lucide-react";
import { useApp, BRANDS, type Brand } from "@/lib/app-context";
import { feedback } from "@/lib/feedback";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { Avatar } from "@/components/avatar";
import { uploadToBucket } from "@/lib/media";

const EMOJIS = ["👤", "😎", "🦊", "🐼", "🐧", "🦁", "🐵", "🐨", "🦄", "🐸", "🐙", "🦋", "🌸", "🍀", "⚡️", "🔥", "🌙", "⭐️", "🎧", "🎮"];

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Profile — TalkMe" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    t, lang, setLang, brand, setBrand,
    theme, setTheme,
    sound, setSound, vibration, setVibration,
    userId, session, signOut,
  } = useApp();
  const navigate = useNavigate();
  const { profile, refresh } = useProfile(userId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [editing, setEditing] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [emoji, setEmoji] = useState("👤");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setBio(profile.bio ?? "");
      setEmoji(profile.avatar_emoji);
    }
  }, [profile?.user_id]);

  const saveProfile = async () => {
    if (!profile) return;
    setSaving(true);
    await supabase
      .from("profiles")
      .update({
        display_name: displayName.trim() || null,
        avatar_emoji: emoji,
        bio: bio.trim() || null,
      } as never)
      .eq("user_id", userId);
    feedback("message");
    await refresh();
    setSaving(false);
    setEditing(false);
  };

  const onPickAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/${Date.now()}.${ext}`;
      await uploadToBucket("avatars", path, file, file.type);
      await supabase.from("profiles").update({ avatar_url: path } as never).eq("user_id", userId);
      await refresh();
      feedback("message");
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    await supabase.from("profiles").update({ avatar_url: null } as never).eq("user_id", userId);
    await refresh();
  };

  const doSignOut = async () => {
    if (!confirm(t("signOutConfirm"))) return;
    await signOut();
    navigate({ to: "/onboarding" });
  };

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const currentBrand = BRANDS.find((b) => b.code === brand) ?? BRANDS[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-6 flex items-center gap-3 animate-fade-up">
        <Link to="/" className="btn-pill btn-ghost-pill !p-3" aria-label={t("back")}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t("profile")}</h1>
      </header>

      {/* Instagram-style profile hero */}
      {profile && (
        <section className="card-soft mb-4 p-6 animate-fade-up">
          <div className="flex flex-col items-center text-center">
            <div className="relative">
              <div className="rounded-full p-[3px] bg-gradient-to-tr from-[var(--brand)] via-[oklch(0.78_0.17_55)] to-[oklch(0.68_0.19_300)]">
                <div className="rounded-full bg-background p-[3px]">
                  <Avatar
                    emoji={emoji}
                    avatarUrl={profile.avatar_url}
                    size={104}
                    className="!rounded-full"
                  />
                </div>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-1 right-1 grid h-9 w-9 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] shadow-lg transition-transform active:scale-95"
                aria-label={t("uploadPhoto")}
              >
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
              </button>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={onPickAvatar} />
            </div>

            <div className="mt-4 text-lg font-bold">{profile.display_name || `@${profile.nickname}`}</div>
            <div className="text-sm text-muted-foreground">@{profile.nickname}</div>
            {profile.bio && !editing && (
              <p className="mt-3 max-w-xs whitespace-pre-wrap text-sm text-foreground/85">{profile.bio}</p>
            )}
            {profile.email && (
              <div className="mt-1 text-xs text-muted-foreground">{profile.email}</div>
            )}

            <div className="mt-4 flex w-full gap-2">
              <button
                onClick={() => setEditing((v) => !v)}
                className="btn-pill btn-ghost-pill flex-1 !rounded-2xl !py-2.5 text-sm"
              >
                {editing ? <X className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                {editing ? t("cancel") : t("editProfile")}
              </button>
              {profile.avatar_url && (
                <button
                  onClick={removeAvatar}
                  className="btn-pill btn-ghost-pill !rounded-2xl !py-2.5 text-sm text-destructive"
                >
                  {t("removePhoto")}
                </button>
              )}
            </div>
          </div>

          {editing && (
            <div className="mt-5 space-y-3 border-t border-border pt-5 animate-fade-up">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("profileDisplayName")}
                </label>
                <input
                  value={displayName}
                  maxLength={30}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-2.5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("bio")}
                </label>
                <textarea
                  value={bio}
                  maxLength={160}
                  rows={3}
                  onChange={(e) => setBio(e.target.value)}
                  placeholder={t("bioPh")}
                  className="w-full resize-none rounded-2xl border border-border bg-secondary/40 px-4 py-2.5 text-sm outline-none"
                />
              </div>
              <div>
                <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  {t("emojiFallback")}
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {EMOJIS.map((e) => (
                    <button
                      key={e}
                      type="button"
                      onClick={() => setEmoji(e)}
                      className={
                        "grid h-9 w-9 place-items-center rounded-xl border text-base " +
                        (e === emoji
                          ? "border-foreground/60 bg-accent scale-110"
                          : "border-border bg-secondary/40")
                      }
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={saveProfile} disabled={saving} className="btn-pill btn-brand w-full">
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("save")}
              </button>
            </div>
          )}
        </section>
      )}

      {/* Language */}
      <section className="card-soft mb-4 p-5 animate-fade-up">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("language")}
        </h2>
        <Popover>
          <PopoverTrigger asChild>
            <button className="btn-pill btn-ghost-pill w-full justify-between !rounded-2xl !px-4 !py-3">
              <span className="flex items-center gap-3">
                <span className="text-xl leading-none">{currentLang.flag}</span>
                <span className="font-medium">{currentLang.native}</span>
              </span>
              <ChevronDown className="h-5 w-5 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" sideOffset={8} className="w-[calc(100vw-2.5rem)] max-w-sm rounded-3xl border-border bg-popover/95 p-2 backdrop-blur-xl">
            <div className="mb-2 px-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("chooseLanguage")}
            </div>
            <div className="max-h-[60vh] overflow-y-auto pr-1">
              {LANGUAGES.map((l) => {
                const active = l.code === lang;
                return (
                  <button
                    key={l.code}
                    onClick={() => setLang(l.code as Lang)}
                    className={
                      "flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left transition-colors " +
                      (active ? "bg-accent text-accent-foreground" : "hover:bg-accent/60")
                    }
                  >
                    <span className="flex items-center gap-3">
                      <span className="text-xl leading-none">{l.flag}</span>
                      <span className="text-sm font-medium">{l.native}</span>
                      <span className="text-xs text-muted-foreground">{l.label}</span>
                    </span>
                    {active && <Check className="h-4 w-4" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </section>

      {/* Brand color */}
      <section className="card-soft mb-4 p-5 animate-fade-up">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("buttonColor")}
        </h2>
        <Popover>
          <PopoverTrigger asChild>
            <button className="btn-pill btn-ghost-pill w-full justify-between !rounded-2xl !px-4 !py-3">
              <span className="flex items-center gap-3">
                <span className="h-7 w-7 rounded-full border border-border shadow-inner" style={{ background: currentBrand.color }} />
                <span className="font-medium">{currentBrand.label}</span>
              </span>
              <ChevronDown className="h-5 w-5 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="center" sideOffset={8} className="w-[calc(100vw-2.5rem)] max-w-sm rounded-3xl border-border bg-popover/95 p-3 backdrop-blur-xl">
            <div className="mb-2 px-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t("chooseColor")}
            </div>
            <div className="grid grid-cols-5 gap-2">
              {BRANDS.map((b) => {
                const active = b.code === brand;
                return (
                  <button
                    key={b.code}
                    onClick={() => setBrand(b.code as Brand)}
                    aria-label={b.label}
                    className={
                      "relative flex aspect-square items-center justify-center rounded-2xl border transition-all " +
                      (active ? "border-foreground/60 scale-105" : "border-border hover:border-foreground/30")
                    }
                    style={{ background: b.color }}
                  >
                    {active && <Check className="h-5 w-5" style={{ color: "oklch(0.15 0.02 280)" }} />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </section>

      {/* Theme */}
      <section className="card-soft mb-4 p-5 animate-fade-up">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("appearance")}</h2>
        <div className="flex gap-2">
          {([
            ["dark", t("dark"), Moon],
            ["light", t("light"), Sun],
          ] as const).map(([code, label, Icon]) => {
            const active = theme === code;
            return (
              <button
                key={code}
                onClick={() => setTheme(code)}
                className={"btn-pill flex-1 !rounded-2xl !py-3 text-sm " + (active ? "btn-brand" : "btn-ghost-pill")}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>
      </section>

      {/* Feedback */}
      <section className="card-soft p-5 animate-fade-up">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">{t("feedback")}</h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              const next = !sound;
              setSound(next);
              if (next) setTimeout(() => feedback("message"), 0);
            }}
            className={"btn-pill w-full justify-between !rounded-2xl !px-4 !py-3 " + (sound ? "btn-brand" : "btn-ghost-pill")}
          >
            <span className="flex items-center gap-3">
              {sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
              <span className="font-medium text-sm">{t("sound")}</span>
            </span>
            {sound && <Check className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => {
              const next = !vibration;
              setVibration(next);
              if (next) setTimeout(() => feedback("message"), 0);
            }}
            className={"btn-pill w-full justify-between !rounded-2xl !px-4 !py-3 " + (vibration ? "btn-brand" : "btn-ghost-pill")}
          >
            <span className="flex items-center gap-3">
              {vibration ? <Vibrate className="h-5 w-5" /> : <VibrateOff className="h-5 w-5" />}
              <span className="font-medium text-sm">{t("vibration")}</span>
            </span>
            {vibration && <Check className="h-5 w-5" />}
          </button>
        </div>
      </section>

      {/* Sign out */}
      {session && (
        <section className="card-soft mt-4 p-5 animate-fade-up">
          <button onClick={doSignOut} className="btn-pill btn-ghost-pill w-full text-destructive">
            <LogOut className="h-4 w-4" />
            {t("signOut")}
          </button>
        </section>
      )}
      <BottomNav />
    </main>
  );
}
