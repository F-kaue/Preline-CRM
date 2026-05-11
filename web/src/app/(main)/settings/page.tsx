import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { SettingsPanel } from "@/components/SettingsPanel";

export default async function SettingsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const ws = await getActiveWorkspaceId(supabase, cookieStore);
  if (!ws) return null;

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id,name")
    .eq("workspace_id", ws)
    .order("position", { ascending: true });

  const { data: customFields } = await supabase
    .from("custom_field_definitions")
    .select("id,label,field_key")
    .eq("workspace_id", ws)
    .order("created_at", { ascending: true });

  const stageIds = (stages ?? []).map((s) => s.id as string);
  let requirements: {
    id: string;
    stage_id: string;
    field_kind: string;
    standard_field: string | null;
    custom_field_id: string | null;
  }[] = [];

  if (stageIds.length > 0) {
    const { data: reqRows } = await supabase
      .from("stage_required_fields")
      .select("id,stage_id,field_kind,standard_field,custom_field_id")
      .in("stage_id", stageIds);
    requirements =
      (reqRows ?? []).map((r) => ({
        id: r.id as string,
        stage_id: r.stage_id as string,
        field_kind: r.field_kind as string,
        standard_field: (r.standard_field as string | null) ?? null,
        custom_field_id: (r.custom_field_id as string | null) ?? null,
      })) ?? [];
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          Campos personalizados, regras de etapa e novos workspaces.
        </p>
      </div>
      <SettingsPanel
        workspaceId={ws}
        stages={(stages ?? []).map((s) => ({ id: s.id as string, name: s.name as string }))}
        customFields={(customFields ?? []).map((c) => ({
          id: c.id as string,
          label: c.label as string,
          field_key: c.field_key as string,
        }))}
        requirements={requirements}
      />
    </div>
  );
}
