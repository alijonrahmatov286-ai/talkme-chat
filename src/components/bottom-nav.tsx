import { Link, useRouterState } from "@tanstack/react-router";
import { MessageCircle, Users, Shuffle, Settings as SettingsIcon } from "lucide-react";
import { useApp } from "@/lib/app-context";

export function BottomNav() {
  const { t } = useApp();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const items = [
    { to: "/", label: t("chatsTab"), icon: MessageCircle },
    { to: "/people", label: t("peopleTab"), icon: Users },
    { to: "/roulette", label: t("rouletteTab"), icon: Shuffle },
    { to: "/settings", label: t("settings"), icon: SettingsIcon },
  ] as const;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto max-w-md px-4 pb-3">
        <div className="card-soft flex items-center justify-around gap-1 p-2">
          {items.map((it) => {
            const active = pathname === it.to;
            const Icon = it.icon;
            return (
              <Link
                key={it.to}
                to={it.to}
                className={
                  "btn-pill flex-1 !py-2.5 !px-2 text-[11px] " +
                  (active ? "btn-brand" : "btn-ghost-pill")
                }
              >
                <Icon className="h-4 w-4" />
                <span className="hidden xs:inline">{it.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
