import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { CampaignForm } from "@/components/CampaignForm";

export default async function EditCampaignPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const ws = await getActiveWorkspaceId(supabase, cookieStore);
  if (!ws) redirect("/onboarding");

  const { data: camp, error } = await supabase
    .from("campaigns")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ws)
    .single();

  if (error || !camp) notFound();

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
        <h1 className="mt-2 text-2xl font-semibold">Editar campanha</h1>
      </div>
      <CampaignForm
        workspaceId={ws}
        stages={(stages ?? []).map((s) => ({
          id: s.id as string,
          name: s.name as string,
        }))}
        initial={{
          id: camp.id as string,
          name: camp.name as string,
          context: camp.context as string,
          generation_prompt: camp.generation_prompt as string,
          trigger_stage_id: (camp.trigger_stage_id as string | null) ?? null,
          is_active: camp.is_active as boolean,
        }}
      />
    </div>
  );
}
