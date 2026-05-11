import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { LeadDetailPanel } from "@/components/LeadDetailPanel";

export default async function LeadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const cookieStore = await cookies();
  const ws = await getActiveWorkspaceId(supabase, cookieStore);
  if (!ws) notFound();

  const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .eq("workspace_id", ws)
    .single();

  if (error || !lead) notFound();

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id,name,position,stage_key")
    .eq("workspace_id", ws)
    .order("position", { ascending: true });

  const { data: campaigns } = await supabase
    .from("campaigns")
    .select("id,name,is_active,trigger_stage_id")
    .eq("workspace_id", ws)
    .eq("is_active", true)
    .order("created_at", { ascending: false });

  const { data: suggestions } = await supabase
    .from("lead_message_suggestions")
    .select("id,body,variant_index,batch_id,created_at,campaign_id")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(60);

  const campaignNameById = new Map(
    (campaigns ?? []).map((c) => [c.id as string, c.name as string]),
  );

  const { data: activities } = await supabase
    .from("lead_activities")
    .select("*")
    .eq("lead_id", id)
    .order("created_at", { ascending: false })
    .limit(40);

  const { data: fieldDefs } = await supabase
    .from("custom_field_definitions")
    .select("id,label,field_key")
    .eq("workspace_id", ws);

  const { data: fieldVals } = await supabase
    .from("lead_custom_values")
    .select("custom_field_id,value")
    .eq("lead_id", id);

  return (
    <div className="space-y-8">
      <div>
        <Link href="/leads" className="text-sm text-zinc-600 hover:underline dark:text-zinc-400">
          ← Leads
        </Link>
        <h1 className="mt-2 text-2xl font-semibold">{lead.name as string}</h1>
        <p className="text-sm text-zinc-500">{lead.company as string}</p>
      </div>

      <LeadDetailPanel
        workspaceId={ws}
        lead={{
          id: lead.id as string,
          name: lead.name as string,
          email: lead.email as string,
          phone: lead.phone as string,
          company: lead.company as string,
          job_title: lead.job_title as string,
          lead_source: lead.lead_source as string,
          notes: lead.notes as string,
          stage_id: lead.stage_id as string,
        }}
        stages={(stages ?? []).map((s) => ({
          id: s.id as string,
          name: s.name as string,
          stage_key: s.stage_key as string,
        }))}
        campaigns={(campaigns ?? []).map((c) => ({
          id: c.id as string,
          name: c.name as string,
        }))}
        suggestions={(suggestions ?? []).map((s) => ({
          id: s.id as string,
          body: s.body as string,
          variant_index: s.variant_index as number,
          batch_id: s.batch_id as string,
          created_at: s.created_at as string,
          campaign_id: s.campaign_id as string,
          campaign_name: campaignNameById.get(s.campaign_id as string) ?? "Campanha",
        }))}
        activities={(activities ?? []).map((a) => ({
          id: a.id as string,
          action: a.action as string,
          metadata: a.metadata as Record<string, unknown>,
          created_at: a.created_at as string,
        }))}
        customFields={(fieldDefs ?? []).map((d) => ({
          id: d.id as string,
          label: d.label as string,
          value:
            (fieldVals ?? []).find((v) => v.custom_field_id === d.id)?.value ??
            "",
        }))}
      />
    </div>
  );
}
