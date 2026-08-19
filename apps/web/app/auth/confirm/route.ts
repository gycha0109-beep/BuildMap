import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ensureBuilderContext, ensureUserProfile } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

function safeNextPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/p/") || value.startsWith("//")) {
    return null;
  }
  return value;
}

function loginUrl(request: NextRequest, error: string, next: string | null) {
  const url = new URL("/login", request.url);
  url.searchParams.set("error", error);
  if (next) url.searchParams.set("next", next);
  return url;
}

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const queryNext = safeNextPath(request.nextUrl.searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(loginUrl(request, "confirmation-failed", queryNext));
  }

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (verified.error) {
    return NextResponse.redirect(loginUrl(request, "confirmation-failed", queryNext));
  }

  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return NextResponse.redirect(loginUrl(request, "confirmation-failed", queryNext));
  }

  const metadataNext =
    currentUser.data.user.user_metadata?.buildmap_signup_intent === "scout"
      ? safeNextPath(currentUser.data.user.user_metadata?.buildmap_return_path)
      : null;
  const next = queryNext ?? metadataNext;

  try {
    if (next) {
      await ensureUserProfile(supabase, currentUser.data.user);
    } else {
      await ensureBuilderContext(supabase, currentUser.data.user);
    }
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(loginUrl(request, "profile-bootstrap", next));
  }

  return NextResponse.redirect(new URL(next ?? "/dashboard", request.url));
}
