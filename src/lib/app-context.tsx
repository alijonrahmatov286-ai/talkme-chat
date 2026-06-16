import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { translations, type Lang, type TKey } from "./i18n";

export type Brand = "white" | "pink" | "blue";
export type Gender = "male" | "female";

export interface UserProfile {
  userId: string;
  gender: Gender;
  age: number;
  wantGender: Gender | "any";
  wantAgeMin: number;
  wantAgeMax: number;
}

interface AppState {
  lang: Lang;
  setLang: (l: Lang) => void;
  brand: Brand;
  setBrand: (b: Brand) => void;
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  sound: boolean;
  setSound: (v: boolean) => void;
  vibration: boolean;
  setVibration: (v: boolean) => void;
  t: (k: TKey) => string;
  userId: string;
}

const Ctx = createContext<AppState | null>(null);

function uuid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "u-" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [hydrated, setHydrated] = useState(false);
  const [lang, setLangState] = useState<Lang>("ru");
  const [brand, setBrandState] = useState<Brand>("white");
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [userId, setUserId] = useState<string>("");
  const [sound, setSoundState] = useState<boolean>(true);
  const [vibration, setVibrationState] = useState<boolean>(true);

  useEffect(() => {
    setLangState(readLS<Lang>("talkme_lang", "ru"));
    setBrandState(readLS<Brand>("talkme_brand", "white"));
    setProfileState(readLS<UserProfile | null>("talkme_profile", null));
    setSoundState(readLS<boolean>("talkme_sound", true));
    setVibrationState(readLS<boolean>("talkme_vibration", true));
    let uid = readLS<string>("talkme_uid", "");
    if (!uid) {
      uid = uuid();
      localStorage.setItem("talkme_uid", JSON.stringify(uid));
    }
    setUserId(uid);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    document.documentElement.setAttribute("data-brand", brand);
    document.documentElement.lang = lang;
  }, [brand, lang, hydrated]);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("talkme_lang", JSON.stringify(l));
  };
  const setBrand = (b: Brand) => {
    setBrandState(b);
    localStorage.setItem("talkme_brand", JSON.stringify(b));
  };
  const setProfile = (p: UserProfile | null) => {
    setProfileState(p);
    if (p) localStorage.setItem("talkme_profile", JSON.stringify(p));
    else localStorage.removeItem("talkme_profile");
  };
  const setSound = (v: boolean) => {
    setSoundState(v);
    localStorage.setItem("talkme_sound", JSON.stringify(v));
  };
  const setVibration = (v: boolean) => {
    setVibrationState(v);
    localStorage.setItem("talkme_vibration", JSON.stringify(v));
  };

  const value = useMemo<AppState>(
    () => ({
      lang,
      setLang,
      brand,
      setBrand,
      profile,
      setProfile,
      sound,
      setSound,
      vibration,
      setVibration,
      userId,
      t: (k) => translations[lang][k],
    }),
    [lang, brand, profile, sound, vibration, userId],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useApp() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
