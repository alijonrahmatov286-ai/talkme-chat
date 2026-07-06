import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, ArrowLeft, MessageCircle } from "lucide-react";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import type { Profile } from "@/hooks/use-profile";

export const Route = createFileRoute("/people")({
  head: () => ({ meta: [{ title: "People — TalkMe" }] }),
  component: PeoplePage,
});

function PeoplePage() {
  const { userId, t } = useApp();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = q.trim().toLowerCase().replace(/^@/, "");
    setLoading(true);
    const h = setTimeout(async () => {
      let req = supabase.from("profiles").select("*").neq("user_id", userId).limit(30);
      if (query) req = req.ilike("nickname", `${query}%`);
      else req = req.order("last_seen", { ascending: false });
      const { data } = await req;
      setResults((data as Profile[]) ?? []);
      setLoading(false);
    }, 250);
    return () => clearTimeout(h);
  }, [q, userId]);

  const openChat = async (other: Profile) => {
    const { data } = await supabase.rpc("open_conversation", { p_a: userId, p_b: other.user_id });
    if (typeof data === "string") {
      navigate({ to: "/dm/$nickname", params: { nickname: other.nickname } });
    }
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col px-5 pb-28 pt-8">
      <header className="mb-4 flex items-center gap-3 animate-fade-up">
        <Link to="/" className="btn-pill btn-ghost-pill !p-3" aria-label={t("back")}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-bold">{t("peopleTitle")}</h1>
      </header>

      <div className="card-soft mb-4 flex items-center gap-2 px-4 py-2.5 animate-fade-up">
        <Search className="h-5 w-5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("searchNickname")}
          className="flex-1 bg-transparent py-1 text-sm outline-none placeholder:text-muted-foreground"
        />
      </div>

      <div className="space-y-2">
        {loading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">{t("loading")}</div>
        )}
        {!loading && results.length === 0 && (
          <div className="py-8 text-center text-sm text-muted-foreground">{t("noPeople")}</div>
        )}
        {results.map((p) => (
          <button
            key={p.user_id}
            onClick={() => openChat(p)}
            className="card-soft flex w-full items-center gap-3 px-4 py-3 text-left animate-fade-up"
          >
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-secondary text-xl">
              {p.avatar_emoji}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold">
                {p.display_name || `@${p.nickname}`}
              </div>
              <div className="truncate text-xs text-muted-foreground">@{p.nickname}</div>
            </div>
            <MessageCircle className="h-5 w-5 text-muted-foreground" />
          </button>
        ))}
      </div>
      <BottomNav />
    </main>
  );
}
