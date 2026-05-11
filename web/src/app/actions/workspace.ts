"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { workspaceCookieName } from "@/lib/workspace";
import { createClient } from "@/lib/supabase/server";

export async function setActiveWorkspace(workspaceId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };

  const { data } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (!data) return { ok: false as const, error: "Workspace inválido" };

  const jar = await cookies();
  jar.set(workspaceCookieName(), workspaceId, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  revalidatePath("/", "layout");
  return { ok: true as const };
}

export async function createWorkspace(name: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, error: "Não autenticado" };

  const trimmed = name.trim();
  if (!trimmed) return { ok: false as const, error: "Nome obrigatório" };

  const { data, error } = await supabase
    .from("workspaces")
    .insert({ name: trimmed, created_by: user.id })
    .select("id")
    .single();

  if (error) return { ok: false as const, error: error.message };

  const jar = await cookies();
  jar.set(workspaceCookieName(), data.id, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    httpOnly: true,
  });
  revalidatePath("/", "layout");
  return { ok: true as const, workspaceId: data.id as string };
}
