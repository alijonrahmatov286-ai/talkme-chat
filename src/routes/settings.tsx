import { Link, createFileRoute } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { useApp, type Brand } from "@/lib/app-context";
import type { Lang } from "@/lib/i18n";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [{ title: "Settings — TalkMe" }],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { t, lang, setLang, brand, setBrand } = useApp();

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
    </main>
  );
}
