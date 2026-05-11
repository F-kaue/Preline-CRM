import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const COOKIE = "crm_workspace_id";

export async function getActiveWorkspaceId(
  supabase: SupabaseClient,
  cookieStore: Awaited<ReturnType<typeof cookies>>,
): Promise<string | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: rows } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .order("created_at", { ascending: true });

  const ids = (rows ?? []).map((r) => r.workspace_id as string);
  if (ids.length === 0) return null;

  const fromCookie = cookieStore.get(COOKIE)?.value;
  if (fromCookie && ids.includes(fromCookie)) return fromCookie;

  return ids[0] ?? null;
}

export function workspaceCookieName() {
  return COOKIE;
}
