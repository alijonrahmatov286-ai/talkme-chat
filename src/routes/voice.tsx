import { Link, createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Settings as SettingsIcon, Phone, Sparkles, PhoneOff } from "lucide-react";
import { useApp, type Gender } from "@/lib/app-context";
import { useOnlineCount } from "@/lib/use-online";
import { BottomNav } from "@/components/bottom-nav";
import { feedback } from "@/lib/feedback";

export const Route = createFileRoute("/voice")({
  head: () => ({
    meta: [
      { title: "TalkMe — Voice call" },
      { name: "description", content: "Anonymous voice calls with new people." },
    ],
  }),
  component: VoicePage,
});

function VoicePage() {
  const { t, profile, userId, brand } = useApp();
  const online = useOnlineCount(userId);

  const [gender, setGender] = useState<Gender>(profile?.gender ?? "male");
  const [age, setAge] = useState<number>(profile?.age ?? 21);
  const [wantGender, setWantGender] = useState<Gender>(
    (profile?.wantGender as Gender) ?? "female",
  );
  const [ageRange, setAgeRange] = useState<[number, number]>([
    profile?.wantAgeMin ?? 18,
    profile?.wantAgeMax ?? 20,
  ]);
  const [calling, setCalling] = useState(false);

  const ageLabel = useMemo(
    () => (age === 30 ? "30+" : age === 18 ? "18–20" : "21–25"),
    [age],
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-6 flex items-center justify-between animate-fade-up">
        <div className="flex items-center gap-2">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_10px_30px_-10px_var(--brand-glow)]">
            <Phone className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight">TalkMe</span>
        </div>
        <Link to="/settings" className="btn-pill btn-ghost-pill !p-3" aria-label={t("settings")}>
          <SettingsIcon className="h-5 w-5" />
        </Link>
      </header>

      <section className="card-soft mb-6 flex items-center justify-between gap-3 px-5 py-4 animate-fade-up">
        <div className="flex items-center gap-3">
          <span className="pulse-dot" />
          <div>
            <div className="text-2xl font-bold tabular-nums">{online}</div>
            <div className="text-xs text-muted-foreground">{t("online")}</div>
          </div>
        </div>
        <div className="text-xs text-muted-foreground capitalize">{brand}</div>
      </section>

      {calling ? (
        <div className="card-soft flex flex-col items-center gap-5 p-8 animate-fade-up">
          <div className="relative grid h-24 w-24 place-items-center">
            <div className="absolute inset-0 animate-float rounded-full bg-[var(--brand)]/20 blur-2xl" />
            <div className="grid h-20 w-20 place-items-center rounded-full bg-[var(--brand)] text-[var(--brand-foreground)] shadow-[0_20px_50px_-10px_var(--brand-glow)]">
              <Phone className="h-9 w-9" />
            </div>
          </div>
          <div className="h-1 w-40 overflow-hidden rounded-full bg-secondary">
            <div className="h-full w-full animate-shimmer" />
          </div>
          <p className="text-sm text-muted-foreground">{t("voiceSearching")}</p>
          <button
            onClick={() => setCalling(false)}
            className="btn-pill btn-ghost-pill w-full"
          >
            <PhoneOff className="h-5 w-5" />
            {t("cancel")}
          </button>
        </div>
      ) : (
        <div className="card-soft p-5 animate-fade-up">
          <h2 className="mb-1 text-lg font-semibold">{t("voiceTitle")}</h2>
          <p className="mb-5 text-sm text-muted-foreground">
            <Sparkles className="mr-1 inline h-4 w-4" />
            {t("voiceHint")}
          </p>

          <Field label={t("yourGender")}>
            <Segmented
              value={gender}
              onChange={(v) => setGender(v as Gender)}
              options={[
                { value: "male", label: t("male") },
                { value: "female", label: t("female") },
              ]}
            />
          </Field>

          <Field label={`${t("yourAge")}: ${ageLabel}`}>
            <ChipGroup
              value={age}
              onChange={setAge}
              options={[
                { value: 18, label: "18–20" },
                { value: 21, label: "21–25" },
                { value: 30, label: "30+" },
              ]}
            />
          </Field>

          <div className="my-4 h-px bg-border" />

          <Field label={t("lookingFor")}>
            <Segmented
              value={wantGender}
              onChange={(v) => setWantGender(v as Gender)}
              options={[
                { value: "male", label: t("male") },
                { value: "female", label: t("female") },
              ]}
            />
          </Field>

          <Field
            label={`${t("ageRange")}: ${ageRange[0] === 30 ? "30+" : `${ageRange[0]}–${ageRange[1]}`}`}
          >
            <ChipGroup
              value={`${ageRange[0]}-${ageRange[1]}`}
              onChange={(v) => {
                const [a, b] = String(v).split("-").map(Number);
                setAgeRange([a, b]);
              }}
              options={[
                { value: "18-20", label: "18–20" },
                { value: "21-25", label: "21–25" },
                { value: "30-99", label: "30+" },
              ]}
            />
          </Field>

          <button
            onClick={() => setCalling(true)}
            className="btn-pill btn-brand mt-5 w-full text-base"
          >
            <Phone className="h-5 w-5" />
            {t("startCall")}
          </button>
        </div>
      )}

      <BottomNav />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="mb-4 block">
      <span className="mb-2 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="flex gap-2">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={"btn-pill flex-1 text-sm " + (active ? "btn-brand" : "btn-ghost-pill")}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipGroup<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<T | { value: T; label: string }>;
}) {
  const norm = options.map((o) =>
    typeof o === "object" ? o : { value: o, label: String(o) },
  );
  return (
    <div className="flex flex-wrap gap-2">
      {norm.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={String(o.value)}
            type="button"
            onClick={() => onChange(o.value)}
            className={
              "btn-pill !px-4 !py-2 text-sm " + (active ? "btn-brand" : "btn-ghost-pill")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
