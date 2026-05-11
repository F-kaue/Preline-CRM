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
    .select("id,name,stage_key")
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
    <div className="mx-auto max-w-3xl space-y-8 pb-12">
      <div>
        <Link
          href="/leads"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-600 transition hover:text-blue-600"
        >
          <span aria-hidden>←</span> Voltar aos leads
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-900">Novo lead</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
          Cadastre a pessoa e o contexto comercial. Ao salvar, o lead entra na etapa{" "}
          <span className="font-medium text-slate-800">{stage.name as string}</span> do funil e a IA
          pode gerar sugestões de mensagem com base nos dados e gatilhos do workspace.
        </p>
      </div>
      <NewLeadForm
        workspaceId={ws}
        defaultStageId={stage.id as string}
        defaultStageName={(stage.name as string) ?? "Base"}
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
