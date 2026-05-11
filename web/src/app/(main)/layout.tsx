import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { AppShell } from "@/components/AppShell";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const workspaceId = await getActiveWorkspaceId(supabase, cookieStore);
  if (!workspaceId) redirect("/onboarding");

  return <AppShell>{children}</AppShell>;
}
