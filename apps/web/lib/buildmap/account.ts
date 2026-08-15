import type { User } from "@supabase/supabase-js";
import type { createClient } from "@/lib/supabase/server";

type ServerSupabaseClient = Awaited<ReturnType<typeof createClient>>;

export type BuilderContext = {
  userProfileId: string;
  builderProfileId: string;
};

function defaultDisplayName(user: User) {
  const emailName = user.email?.split("@")[0]?.trim();
  return emailName || "Builder";
}

export async function ensureBuilderContext(
  supabase: ServerSupabaseClient,
  user: User,
): Promise<BuilderContext> {
  const existingUserProfile = await supabase
    .from("user_profiles")
    .select("id")
    .eq("auth_user_id", user.id)
    .maybeSingle();

  if (existingUserProfile.error) {
    throw existingUserProfile.error;
  }

  let userProfileId = existingUserProfile.data?.id;

  if (!userProfileId) {
    const inserted = await supabase
      .from("user_profiles")
      .insert({
        auth_user_id: user.id,
        display_name: defaultDisplayName(user),
      })
      .select("id")
      .single();

    if (inserted.error) {
      throw inserted.error;
    }
    userProfileId = inserted.data.id;
  }

  const existingBuilderProfile = await supabase
    .from("builder_profiles")
    .select("id")
    .eq("user_profile_id", userProfileId)
    .maybeSingle();

  if (existingBuilderProfile.error) {
    throw existingBuilderProfile.error;
  }

  let builderProfileId = existingBuilderProfile.data?.id;

  if (!builderProfileId) {
    const inserted = await supabase
      .from("builder_profiles")
      .insert({
        user_profile_id: userProfileId,
        public_display_name: defaultDisplayName(user),
        is_public: false,
      })
      .select("id")
      .single();

    if (inserted.error) {
      throw inserted.error;
    }
    builderProfileId = inserted.data.id;
  }

  return { userProfileId, builderProfileId };
}
