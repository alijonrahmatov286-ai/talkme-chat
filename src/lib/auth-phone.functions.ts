import { createServerFn } from "@tanstack/react-start";

export const requestPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string }) => data)
  .handler(async ({ data }) => {
    const helpers = await import("./auth-phone.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = helpers.normalizePhone(data.phone);

    const hourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { count } = await supabaseAdmin
      .from("phone_codes")
      .select("id", { count: "exact", head: true })
      .eq("phone", phone)
      .gte("created_at", hourAgo);
    if ((count ?? 0) >= helpers.MAX_REQUESTS_PER_HOUR) throw new Error("RATE_LIMITED");

    const code = helpers.generateCode();
    await supabaseAdmin.from("phone_codes").insert({
      phone,
      code_hash: helpers.hashCode(phone, code),
      expires_at: new Date(Date.now() + helpers.CODE_TTL_MS).toISOString(),
    });

    // Test mode: no SMS provider connected yet, so the code is returned to the UI.
    return { phone, testCode: code };
  });

export const verifyPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((data: { phone: string; code: string }) => data)
  .handler(async ({ data }) => {
    const helpers = await import("./auth-phone.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const phone = helpers.normalizePhone(data.phone);
    const code = String(data.code ?? "").replace(/\D/g, "");

    const { data: row } = await supabaseAdmin
      .from("phone_codes")
      .select("*")
      .eq("phone", phone)
      .eq("consumed", false)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!row) throw new Error("CODE_NOT_FOUND");
    if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("CODE_EXPIRED");
    if (row.attempts >= helpers.MAX_ATTEMPTS) throw new Error("TOO_MANY_ATTEMPTS");

    if (row.code_hash !== helpers.hashCode(phone, code)) {
      await supabaseAdmin
        .from("phone_codes")
        .update({ attempts: row.attempts + 1 })
        .eq("id", row.id);
      throw new Error("CODE_INVALID");
    }

    await supabaseAdmin.from("phone_codes").update({ consumed: true }).eq("id", row.id);

    const { data: existing } = await supabaseAdmin
      .from("auth_phones")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();

    let userId = existing?.user_id;
    let isNew = false;
    if (!userId) {
      userId = crypto.randomUUID();
      isNew = true;
      await supabaseAdmin.from("auth_phones").insert({ user_id: userId, phone, verified: true });
      await supabaseAdmin.from("profiles").insert({ user_id: userId, phone, display_name: "" });
    } else {
      await supabaseAdmin.from("auth_phones").update({ verified: true }).eq("user_id", userId);
    }

    const profile = await helpers.loadProfile(userId);
    return { token: helpers.signSession(userId), userId, isNew, profile };
  });

export const getMyProfile = createServerFn({ method: "POST" })
  .inputValidator((data: { token: string }) => data)
  .handler(async ({ data }) => {
    const helpers = await import("./auth-phone.server");
    const userId = helpers.verifySession(data.token);
    if (!userId) return { userId: null, profile: null };
    return { userId, profile: await helpers.loadProfile(userId) };
  });

export const saveMyProfile = createServerFn({ method: "POST" })
  .inputValidator(
    (data: {
      token: string;
      displayName: string;
      gender: string;
      age: number;
      avatarDataUrl?: string | null;
    }) => data,
  )
  .handler(async ({ data }) => {
    const helpers = await import("./auth-phone.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const userId = helpers.requireUser(data.token);

    const displayName = String(data.displayName ?? "").trim().slice(0, 32);
    if (displayName.length < 2) throw new Error("NAME_TOO_SHORT");
    const gender = data.gender === "female" ? "female" : "male";
    const age = Math.min(99, Math.max(18, Number(data.age) || 18));

    const patch: {
      display_name: string;
      gender: string;
      age: number;
      last_seen: string;
      avatar_url?: string;
    } = {
      display_name: displayName,
      gender,
      age,
      last_seen: new Date().toISOString(),
    };
    if (data.avatarDataUrl) patch.avatar_url = await helpers.uploadAvatar(userId, data.avatarDataUrl);

    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("user_id", userId);

    if (error) throw new Error("SAVE_FAILED");
    return { profile: await helpers.loadProfile(userId) };
  });

export const getProfilesByIds = createServerFn({ method: "POST" })
  .inputValidator((data: { userIds: string[] }) => data)
  .handler(async ({ data }) => {
    const helpers = await import("./auth-phone.server");
    return { profiles: await helpers.loadProfiles(data.userIds ?? []) };
  });
