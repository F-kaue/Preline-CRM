import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { OnboardingForm } from "@/components/OnboardingForm";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const cookieStore = await cookies();
  const workspaceId = await getActiveWorkspaceId(supabase, cookieStore);
  if (workspaceId) redirect("/dashboard");

  const { data: members } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user.id)
    .limit(1);

  if (members && members.length > 0) {
    redirect("/dashboard");
  }

  return <OnboardingForm />;
}
