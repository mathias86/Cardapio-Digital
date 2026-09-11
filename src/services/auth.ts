import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { InternalProfile } from "@/types/auth";

export async function getCurrentInternalProfile(): Promise<InternalProfile | null> {
  const supabase = await createSupabaseServerClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id,name,role,active")
    .eq("id", authData.user.id)
    .maybeSingle<InternalProfile>();

  return data?.active ? data : null;
}
