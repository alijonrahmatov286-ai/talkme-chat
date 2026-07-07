import { supabase } from "@/integrations/supabase/client";

// Upload a Blob/File to a private bucket. Returns the storage path.
export async function uploadToBucket(
  bucket: "avatars" | "chat-media",
  path: string,
  data: Blob,
  contentType?: string,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(path, data, {
    upsert: true,
    contentType: contentType ?? data.type ?? "application/octet-stream",
    cacheControl: "3600",
  });
  if (error) throw error;
  return path;
}

// In-memory signed URL cache. Signed URLs are valid for 24h.
const cache = new Map<string, { url: string; exp: number }>();

export async function getSignedUrl(
  bucket: "avatars" | "chat-media",
  path: string,
): Promise<string | null> {
  const key = `${bucket}:${path}`;
  const now = Date.now();
  const hit = cache.get(key);
  if (hit && hit.exp > now + 60_000) return hit.url;
  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60 * 24);
  if (error || !data) return null;
  cache.set(key, { url: data.signedUrl, exp: now + 60 * 60 * 24 * 1000 });
  return data.signedUrl;
}
