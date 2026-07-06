import { Link, createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Check, Volume2, VolumeX, Vibrate, VibrateOff, Moon, Sun, ChevronDown, LogOut, Save } from "lucide-react";
import { useApp, BRANDS, type Brand } from "@/lib/app-context";
import { feedback } from "@/lib/feedback";
import { LANGUAGES, type Lang } from "@/lib/i18n";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useProfile } from "@/hooks/use-profile";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";

const EMOJIS = ["👤", "😎", "🦊", "🐼", "🐧", "🦁", "🐵", "🐨", "🦄", "🐸", "🐙", "🦋", "🌸", "🍀", "⚡️", "🔥", "🌙", "⭐️", "🎧", "🎮"];

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — TalkMe" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const {
    t, lang, setLang, brand, setBrand,
    theme, setTheme,
    sound, setSound, vibration, setVibration,
    userId,
  } = useApp();
  
  const { profile, refresh } = useProfile(userId);

  const [displayName, setDisplayName] = useState("");
  const [emoji, setEmoji] = useState("👤");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name ?? "");
      setEmoji(profile.avatar_emoji);
    }
  }, [profile?.user_id]);

  const saveProfile = async () => {
    if (!profile) return;
    await supabase
      .from("profiles")
      .update({ display_name: displayName.trim() || null, avatar_emoji: emoji })
      .eq("user_id", userId);
    setSaved(true);
    feedback("message");
    await refresh();
    setTimeout(() => setSaved(false), 1500);
  };

  const resetAccount = () => {
    if (!confirm(t("resetAccountConfirm"))) return;
    try {
      localStorage.removeItem("talkme_uid");
      localStorage.removeItem("talkme_profile");
    } catch {}
    window.location.href = "/";
  };

  const currentLang = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const currentBrand = BRANDS.find((b) => b.code === brand) ?? BRANDS[0];

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-6 flex items-center gap-3 animate-fade-up">
        <Link to="/" className="btn-pill btn-ghost-pill !p-3" aria-label={t("back")}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t("settings")}</h1>
      </header>

      {/* Profile */}
      {profile && (
        <section className="card-soft mb-4 p-5 animate-fade-up">
          <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("profile")}
          </h2>
          <div className="mb-4 flex items-center gap-3">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-secondary text-2xl">
              {emoji}
            </div>
            <div>
              <div className="font-semibold">@{profile.nickname}</div>
              <div className="text-xs text-muted-foreground">{t("profileNickname")}</div>
            </div>
          </div>

          <label className="mb-1 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("profileDisplayName")}
          </label>
          <input
            value={displayName}
            maxLength={30}
            onChange={(e) => setDisplayName(e.target.value)}
            className="mb-3 w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none"
          />

          <label className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {t("profileAvatar")}
          </label>
          <div className="mb-4 flex flex-wrap gap-2">
            {EMOJIS.map((e) => {
              const active = e === emoji;
              return (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEmoji(e)}
                  className={
                    "grid h-10 w-10 place-items-center rounded-2xl border text-lg transition-all " +
                    (active
                      ? "border-foreground/60 bg-accent scale-110"
                      : "border-border bg-secondary/40")
                  }
                >
                  {e}
                </button>
              );
            })}
          </div>

          <button onClick={saveProfile} className="btn-pill btn-brand w-full">
            <Save className="h-4 w-4" />
            {saved ? t("saved") : t("save")}
          </button>
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
          <PopoverContent
            align="center"
            sideOffset={8}
            className="w-[calc(100vw-2.5rem)] max-w-sm rounded-3xl border-border bg-popover/95 p-2 backdrop-blur-xl"
          >
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
                <span
                  className="h-7 w-7 rounded-full border border-border shadow-inner"
                  style={{ background: currentBrand.color }}
                />
                <span className="font-medium">{currentBrand.label}</span>
              </span>
              <ChevronDown className="h-5 w-5 opacity-70" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            align="center"
            sideOffset={8}
            className="w-[calc(100vw-2.5rem)] max-w-sm rounded-3xl border-border bg-popover/95 p-3 backdrop-blur-xl"
          >
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
                      (active
                        ? "border-foreground/60 scale-105"
                        : "border-border hover:border-foreground/30")
                    }
                    style={{ background: b.color }}
                  >
                    {active && (
                      <Check
                        className="h-5 w-5"
                        style={{ color: "oklch(0.15 0.02 280)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </section>

      {/* Theme */}
      <section className="card-soft mb-4 p-5 animate-fade-up">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("appearance")}
        </h2>
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
                className={
                  "btn-pill flex-1 !rounded-2xl !py-3 text-sm " +
                  (active ? "btn-brand" : "btn-ghost-pill")
                }
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
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("feedback")}
        </h2>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              const next = !sound;
              setSound(next);
              if (next) setTimeout(() => feedback("message"), 0);
            }}
            className={
              "btn-pill w-full justify-between !rounded-2xl !px-4 !py-3 " +
              (sound ? "btn-brand" : "btn-ghost-pill")
            }
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
            className={
              "btn-pill w-full justify-between !rounded-2xl !px-4 !py-3 " +
              (vibration ? "btn-brand" : "btn-ghost-pill")
            }
          >
            <span className="flex items-center gap-3">
              {vibration ? <Vibrate className="h-5 w-5" /> : <VibrateOff className="h-5 w-5" />}
              <span className="font-medium text-sm">{t("vibration")}</span>
            </span>
            {vibration && <Check className="h-5 w-5" />}
          </button>
        </div>
      </section>

      {/* Reset */}
      {profile && (
        <section className="card-soft mt-4 p-5 animate-fade-up">
          <button onClick={resetAccount} className="btn-pill btn-ghost-pill w-full text-destructive">
            <LogOut className="h-4 w-4" />
            {t("resetAccount")}
          </button>
        </section>
      )}
      <BottomNav />
    </main>
  );
}

