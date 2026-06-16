// Sound + vibration helpers. Respect user prefs stored in localStorage.

function prefEnabled(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const v = localStorage.getItem(key);
    return v ? JSON.parse(v) : true;
  } catch {
    return true;
  }
}

let ctx: AudioContext | null = null;
function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    const AC = window.AudioContext || (window as any).webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

function beep(freq: number, durMs: number, when = 0, volume = 0.15) {
  const ac = getCtx();
  if (!ac) return;
  const t0 = ac.currentTime + when;
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0, t0);
  gain.gain.linearRampToValueAtTime(volume, t0 + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + durMs / 1000);
  osc.connect(gain).connect(ac.destination);
  osc.start(t0);
  osc.stop(t0 + durMs / 1000 + 0.02);
}

export function playSound(kind: "message" | "match" | "call") {
  if (!prefEnabled("talkme_sound")) return;
  if (kind === "message") {
    beep(880, 120);
  } else if (kind === "match") {
    beep(660, 140);
    beep(990, 180, 0.14);
  } else if (kind === "call") {
    beep(520, 200);
    beep(780, 220, 0.2);
  }
}

export function vibrate(pattern: number | number[]) {
  if (!prefEnabled("talkme_vibration")) return;
  if (typeof navigator === "undefined" || !navigator.vibrate) return;
  try {
    navigator.vibrate(pattern);
  } catch {
    /* ignore */
  }
}

export function feedback(kind: "message" | "match" | "call") {
  playSound(kind);
  if (kind === "message") vibrate(30);
  else if (kind === "match") vibrate([40, 60, 40]);
  else if (kind === "call") vibrate([50, 80, 50]);
}
