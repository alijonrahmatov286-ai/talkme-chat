// Server-only helpers for phone (OTP) authentication.
import { createHash, createHmac, randomInt, timingSafeEqual } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const CODE_TTL_MS = 5 * 60 * 1000;
export const MAX_ATTEMPTS = 5;
export const MAX_REQUESTS_PER_HOUR = 3;
const SESSION_TTL_MS = 90 * 24 * 60 * 60 * 1000;

export interface PublicProfile {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  gender: string | null;
  age: number | null;
}

function secret(): string {
  const s = process.env["TALKME_SESSION_SECRET"];
  if (!s) throw new Error("TALKME_SESSION_SECRET is not set");
  return s;
}

export function normalizePhone(raw: string): string {
  const digits = String(raw ?? "").replace(/[^\d]/g, "");
  if (digits.length < 8 || digits.length > 15) throw new Error("INVALID_PHONE");
  return "+" + digits;
}

export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function hashCode(phone: string, code: string): string {
  return createHash("sha256").update(`${phone}:${code}:${secret()}`).digest("hex");
}

export function signSession(userId: string): string {
  const exp = Date.now() + SESSION_TTL_MS;
  const payload = `${userId}.${exp}`;
  const sig = createHmac("sha256", secret()).update(payload).digest("base64url");
  return `${payload}.${sig}`;
}

export function verifySession(token: string | null | undefined): string | null {
  if (!token) return null;
  const parts = String(token).split(".");
  if (parts.length !== 3) return null;
  const [userId, exp, sig] = parts;
  const expected = createHmac("sha256", secret()).update(`${userId}.${exp}`).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (!Number(exp) || Number(exp) < Date.now()) return null;
  return userId;
}

export function requireUser(token: string | null | undefined): string {
  const userId = verifySession(token);
  if (!userId) throw new Error("UNAUTHORIZED");
  return userId;
}

export async function signedAvatarUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  if (path.startsWith("http")) return path;
  const { data } = await supabaseAdmin.storage.from("avatars").createSignedUrl(path, 60 * 60 * 24);
  return data?.signedUrl ?? null;
}

export async function loadProfile(userId: string): Promise<PublicProfile | null> {
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("user_id, display_name, avatar_url, gender, age")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return null;
  return {
    userId: data.user_id,
    displayName: data.display_name ?? "",
    avatarUrl: await signedAvatarUrl(data.avatar_url),
    gender: data.gender,
    age: data.age,
  };
}

export async function loadProfiles(userIds: string[]): Promise<PublicProfile[]> {
  const ids = userIds.filter(Boolean).slice(0, 20);
  if (ids.length === 0) return [];
  const { data } = await supabaseAdmin
    .from("profiles")
    .select("user_id, display_name, avatar_url, gender, age")
    .in("user_id", ids);
  return Promise.all(
    (data ?? []).map(async (p) => ({
      userId: p.user_id,
      displayName: p.display_name ?? "",
      avatarUrl: await signedAvatarUrl(p.avatar_url),
      gender: p.gender,
      age: p.age,
    })),
  );
}

export async function uploadAvatar(userId: string, dataUrl: string): Promise<string> {
  const match = /^data:(image\/(png|jpeg|jpg|webp));base64,(.+)$/i.exec(dataUrl);
  if (!match) throw new Error("INVALID_IMAGE");
  const contentType = match[1];
  const bytes = Buffer.from(match[3], "base64");
  if (bytes.byteLength > 3 * 1024 * 1024) throw new Error("IMAGE_TOO_LARGE");
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";
  const path = `${userId}/avatar-${Date.now()}.${ext}`;
  const { error } = await supabaseAdmin.storage
    .from("avatars")
    .upload(path, bytes, { contentType, upsert: true });
  if (error) throw new Error("UPLOAD_FAILED");
  return path;
}
