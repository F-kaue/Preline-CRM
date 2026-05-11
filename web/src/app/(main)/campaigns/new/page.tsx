import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { CampaignForm } from "@/components/CampaignForm";

export default async function NewCampaignPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const ws = await getActiveWorkspaceId(supabase, cookieStore);
  if (!ws) redirect("/onboarding");

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id,name")
    .eq("workspace_id", ws)
    .order("position", { ascending: true });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link href="/campaigns" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Campanhas
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Nova campanha</h1>
      </div>
      <CampaignForm
        workspaceId={ws}
        stages={(stages ?? []).map((s) => ({
          id: s.id as string,
          name: s.name as string,
        }))}
      />
    </div>
  );
}
