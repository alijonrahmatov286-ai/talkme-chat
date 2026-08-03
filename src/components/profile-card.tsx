import { User } from "lucide-react";
import { useApp } from "@/lib/app-context";

export interface CardProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  gender: string | null;
  age: number | null;
}

export function ProfileCard({ profile, compact }: { profile: CardProfile | null; compact?: boolean }) {
  const { t } = useApp();
  if (!profile) return null;
  const genderLabel = profile.gender === "female" ? t("female") : t("male");
  const size = compact ? "h-10 w-10" : "h-14 w-14";

  return (
    <div className="card-soft flex items-center gap-3 px-4 py-3 animate-fade-up">
      <div
        className={
          "grid shrink-0 place-items-center overflow-hidden rounded-full bg-[var(--brand)]/20 " + size
        }
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.displayName}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <User className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold">{profile.displayName || t("stranger")}</div>
        <div className="text-xs text-muted-foreground">
          {genderLabel}
          {profile.age ? ` · ${profile.age} ${t("yearsShort")}` : ""}
        </div>
      </div>
    </div>
  );
}
