import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { NewLeadForm } from "@/components/NewLeadForm";

export default async function NewLeadPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const ws = await getActiveWorkspaceId(supabase, cookieStore);
  if (!ws) redirect("/onboarding");

  const { data: stage } = await supabase
    .from("pipeline_stages")
    .select("id")
    .eq("workspace_id", ws)
    .eq("stage_key", "base")
    .single();

  const { data: fields } = await supabase
    .from("custom_field_definitions")
    .select("id,label,field_key")
    .eq("workspace_id", ws)
    .order("created_at", { ascending: true });

  if (!stage?.id) {
    return <p className="text-sm text-red-600">Etapa inicial não encontrada.</p>;
  }

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div>
        <Link href="/leads" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Voltar
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">Novo lead</h1>
      </div>
      <NewLeadForm
        workspaceId={ws}
        defaultStageId={stage.id as string}
        customFields={
          (fields ?? []).map((f) => ({
            id: f.id as string,
            label: f.label as string,
            field_key: f.field_key as string,
          }))
        }
      />
    </div>
  );
}
