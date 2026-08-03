import { useNavigate } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { useApp } from "@/lib/app-context";

export function AuthGate({ children }: { children: ReactNode }) {
  const { authReady, token, me } = useApp();
  const navigate = useNavigate();

  const needsSetup = !!token && (!me || !me.displayName);

  useEffect(() => {
    if (!authReady) return;
    if (!token) navigate({ to: "/auth", replace: true });
    else if (needsSetup) navigate({ to: "/profile", replace: true });
  }, [authReady, token, needsSetup, navigate]);

  if (!authReady || !token || needsSetup) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center">
        <div
          className="ios-spinner ios-spinner-brand"
          style={{ width: "2rem", height: "2rem", borderWidth: "3px" }}
        />
      </div>
    );
  }

  return <>{children}</>;
}
