"use server";

import { redirect } from "next/navigation";
import { ensureBuilderContext, ensureUserProfile } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return null;
  const next = value.trim();
  if (!next.startsWith("/p/") || next.startsWith("//")) return null;
  return next;
}

function loginPath(params: { error?: string; message?: string; next?: string | null }) {
  const search = new URLSearchParams();
  if (params.error) search.set("error", params.error);
  if (params.message) search.set("message", params.message);
  if (params.next) search.set("next", params.next);
  const query = search.toString();
  return query ? `/login?${query}` : "/login";
}

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = safeNextPath(formData.get("next"));

  if (!email || !password) {
    redirect(loginPath({ error: "missing-fields", next }));
  }

  return { email, password, next };
}

async function ensureAccountForDestination(
  supabase: Awaited<ReturnType<typeof createClient>>,
  user: NonNullable<Awaited<ReturnType<typeof supabase.auth.getUser>>["data"]["user"]>,
  next: string | null,
) {
  if (next?.startsWith("/p/")) {
    await ensureUserProfile(supabase, user);
    return;
  }
  await ensureBuilderContext(supabase, user);
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient();
  const { email, password, next } = credentials(formData);

  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) {
    if (result.error?.code === "email_not_confirmed") {
      redirect(loginPath({ error: "email-not-confirmed", next }));
    }
    redirect(loginPath({ error: "invalid-credentials", next }));
  }

  try {
    await ensureAccountForDestination(supabase, result.data.user, next);
  } catch {
    await supabase.auth.signOut();
    redirect(loginPath({ error: "profile-bootstrap", next }));
  }

  redirect(next ?? "/dashboard");
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();
  const { email, password, next } = credentials(formData);

  if (password.length < 8) {
    redirect(loginPath({ error: "password-length", next }));
  }

  const result = await supabase.auth.signUp({ email, password });
  if (result.error) {
    if (result.error.code === "over_email_send_rate_limit") {
      redirect(loginPath({ error: "email-rate-limit", next }));
    }
    redirect(loginPath({ error: "signup-failed", next }));
  }

  if (result.data.session && result.data.user) {
    try {
      await ensureAccountForDestination(supabase, result.data.user, next);
    } catch {
      redirect(loginPath({ error: "profile-bootstrap", next }));
    }
    redirect(next ?? "/dashboard");
  }

  redirect(loginPath({ message: "check-email", next }));
}
