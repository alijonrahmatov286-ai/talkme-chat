import { useEffect, useState } from "react";
import { getSignedUrl } from "@/lib/media";

interface Props {
  emoji: string;
  avatarUrl?: string | null;
  size?: number;
  className?: string;
}

export function Avatar({ emoji, avatarUrl, size = 44, className = "" }: Props) {
  const [url, setUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setUrl(null);
    if (avatarUrl) {
      getSignedUrl("avatars", avatarUrl).then((u) => {
        if (!cancelled) setUrl(u);
      });
    }
    return () => {
      cancelled = true;
    };
  }, [avatarUrl]);

  const dim = { width: size, height: size, fontSize: Math.round(size * 0.5) };

  return (
    <div
      className={
        "grid place-items-center overflow-hidden rounded-full bg-secondary text-foreground " +
        className
      }
      style={dim}
    >
      {url ? (
        <img src={url} alt="" className="h-full w-full object-cover" />
      ) : (
        <span className="leading-none">{emoji}</span>
      )}
    </div>
  );
}
