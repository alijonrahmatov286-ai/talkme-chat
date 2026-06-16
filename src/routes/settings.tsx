import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check, Volume2, VolumeX, Vibrate } from "lucide-react";
import { useApp, type Brand } from "@/lib/app-context";
import { Switch } from "@/components/ui/switch";
import { feedback } from "@/lib/feedback";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — TalkMe" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang, brand, setBrand, sound, setSound, vibration, setVibration } = useApp();

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-10 pt-8">
      <header className="mb-6 flex items-center gap-3 animate-fade-up">
        <Link to="/" className="btn-pill btn-ghost-pill !p-3" aria-label={t("back")}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t("settings")}</h1>
      </header>

      <section className="card-soft mb-4 p-5 animate-fade-up">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("language")}
        </h2>
        <div className="flex gap-2">
          {([
            ["ru", "Русский"],
            ["en", "English"],
          ] as [Lang, string][]).map(([code, label]) => (
            <button
              key={code}
              onClick={() => setLang(code)}
              className={
                "btn-pill flex-1 text-sm " +
                (lang === code ? "btn-brand" : "btn-ghost-pill")
              }
            >
              {label}
            </button>
          ))}
        </div>
      </section>

      <section className="card-soft p-5 animate-fade-up">
        <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {t("buttonColor")}
        </h2>
        <div className="space-y-2">
          {([
            ["white", t("white"), "oklch(0.98 0.005 280)"],
            ["pink", t("pink"), "oklch(0.78 0.15 350)"],
            ["blue", t("blue"), "oklch(0.72 0.16 240)"],
          ] as [Brand, string, string][]).map(([code, label, color]) => {
            const active = brand === code;
            return (
              <button
                key={code}
                onClick={() => setBrand(code)}
                className={
                  "btn-pill w-full justify-between !rounded-2xl !px-4 !py-3 " +
                  (active ? "btn-brand" : "btn-ghost-pill")
                }
              >
                <span className="flex items-center gap-3">
                  <span
                    className="h-7 w-7 rounded-full border border-border shadow-inner"
                    style={{ background: color }}
                  />
                  <span className="font-medium">{label}</span>
                </span>
                {active && <Check className="h-5 w-5" />}
              </button>
            );
          })}
        </div>
      </section>

      <section className="card-soft mt-4 p-5 animate-fade-up">
        <ToggleRow
          icon={sound ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
          title={t("sound")}
          hint={t("soundHint")}
          checked={sound}
          onChange={(v) => {
            setSound(v);
            if (v) {
              // play preview after pref is saved
              setTimeout(() => feedback("message"), 0);
            }
          }}
        />
        <div className="my-3 h-px bg-border" />
        <ToggleRow
          icon={<Vibrate className="h-5 w-5" />}
          title={t("vibration")}
          hint={t("vibrationHint")}
          checked={vibration}
          onChange={(v) => {
            setVibration(v);
            if (v) setTimeout(() => feedback("message"), 0);
          }}
        />
      </section>
    </main>
  );
}

function ToggleRow({
  icon,
  title,
  hint,
  checked,
  onChange,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <span className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-foreground">
          {icon}
        </span>
        <div>
          <div className="text-sm font-medium">{title}</div>
          <div className="text-xs text-muted-foreground">{hint}</div>
        </div>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
