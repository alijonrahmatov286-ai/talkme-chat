import { useEffect, useState } from "react";
import { Play, Pause } from "lucide-react";
import { getSignedUrl } from "@/lib/media";

interface Props {
  kind: "image" | "video" | "voice";
  path: string;
  durationMs?: number | null;
  mine: boolean;
}

export function MessageMedia({ kind, path, durationMs, mine }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getSignedUrl("chat-media", path).then((u) => {
      if (!cancelled) setUrl(u);
    });
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (!url) {
    return (
      <div
        className="grid place-items-center rounded-2xl bg-black/10 p-6"
        style={{ minWidth: 160, minHeight: 100 }}
      >
        <div className="ios-spinner" style={{ width: "1.25rem", height: "1.25rem", borderWidth: "2px" }} />
      </div>
    );
  }

  if (kind === "image") {
    return (
      <a href={url} target="_blank" rel="noreferrer" className="block">
        <img src={url} alt="" className="max-h-72 max-w-full rounded-2xl object-cover" />
      </a>
    );
  }
  if (kind === "video") {
    return (
      <video src={url} controls playsInline className="max-h-72 max-w-full rounded-2xl" />
    );
  }
  return <VoicePlayer url={url} durationMs={durationMs ?? 0} mine={mine} />;
}

function VoicePlayer({ url, durationMs, mine }: { url: string; durationMs: number; mine: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [audio] = useState(() => new Audio(url));

  useEffect(() => {
    audio.src = url;
    audio.preload = "metadata";
    const onTime = () => {
      if (audio.duration) setProgress(audio.currentTime / audio.duration);
    };
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => {
      audio.pause();
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnd);
    };
  }, [url, audio]);

  const toggle = () => {
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      void audio.play();
      setPlaying(true);
    }
  };

  const seconds = Math.max(1, Math.round(durationMs / 1000));
  const mm = Math.floor(seconds / 60);
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div className="flex min-w-[180px] items-center gap-2.5">
      <button
        type="button"
        onClick={toggle}
        className={
          "grid h-9 w-9 place-items-center rounded-full transition-transform active:scale-95 " +
          (mine ? "bg-white/25 text-white" : "bg-[var(--brand)] text-[var(--brand-foreground)]")
        }
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4 pl-0.5" />}
      </button>
      <div className="flex-1">
        <div className={"relative h-1.5 rounded-full " + (mine ? "bg-white/25" : "bg-foreground/15")}>
          <div
            className={"absolute inset-y-0 left-0 rounded-full " + (mine ? "bg-white" : "bg-[var(--brand)]")}
            style={{ width: `${progress * 100}%` }}
          />
        </div>
        <div className={"mt-1 text-[10px] " + (mine ? "text-white/80" : "text-muted-foreground")}>
          {mm}:{ss}
        </div>
      </div>
    </div>
  );
}
