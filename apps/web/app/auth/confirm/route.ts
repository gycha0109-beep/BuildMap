import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { ensureBuilderContext } from "@/lib/buildmap/account";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;

  if (!tokenHash || !type) {
    return NextResponse.redirect(new URL("/login?error=confirmation-failed", request.url));
  }

  const supabase = await createClient();
  const verified = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });

  if (verified.error) {
    return NextResponse.redirect(new URL("/login?error=confirmation-failed", request.url));
  }

  const currentUser = await supabase.auth.getUser();
  if (!currentUser.data.user) {
    return NextResponse.redirect(new URL("/login?error=confirmation-failed", request.url));
  }

  try {
    await ensureBuilderContext(supabase, currentUser.data.user);
  } catch {
    await supabase.auth.signOut();
    return NextResponse.redirect(new URL("/login?error=profile-bootstrap", request.url));
  }

  return NextResponse.redirect(new URL("/dashboard", request.url));
}
