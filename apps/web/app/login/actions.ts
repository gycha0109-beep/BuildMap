"use server";

import { redirect } from "next/navigation";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

function credentials(formData: FormData) {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    redirect("/login?error=missing-fields");
  }

  return { email, password };
}

export async function signInAction(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = credentials(formData);

  const result = await supabase.auth.signInWithPassword({ email, password });
  if (result.error || !result.data.user) {
    if (result.error?.code === "email_not_confirmed") {
      redirect("/login?error=email-not-confirmed");
    }
    redirect("/login?error=invalid-credentials");
  }

  try {
    await ensureBuilderContext(supabase, result.data.user);
  } catch {
    await supabase.auth.signOut();
    redirect("/login?error=profile-bootstrap");
  }

  redirect("/dashboard");
}

export async function signUpAction(formData: FormData) {
  const supabase = await createClient();
  const { email, password } = credentials(formData);

  if (password.length < 8) {
    redirect("/login?error=password-length");
  }

  const result = await supabase.auth.signUp({ email, password });
  if (result.error) {
    if (result.error.code === "over_email_send_rate_limit") {
      redirect("/login?error=email-rate-limit");
    }
    redirect("/login?error=signup-failed");
  }

  if (result.data.session && result.data.user) {
    try {
      await ensureBuilderContext(supabase, result.data.user);
    } catch {
      redirect("/login?error=profile-bootstrap");
    }
    redirect("/dashboard");
  }

  redirect("/login?message=check-email");
}
