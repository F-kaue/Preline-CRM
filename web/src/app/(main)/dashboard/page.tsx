import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const ws = await getActiveWorkspaceId(supabase, cookieStore);
  if (!ws) return null;

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id,name,position")
    .eq("workspace_id", ws)
    .order("position", { ascending: true });

  const { data: leads } = await supabase
    .from("leads")
    .select("id,stage_id")
    .eq("workspace_id", ws);

  const { count: activeCampaigns } = await supabase
    .from("campaigns")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", ws)
    .eq("is_active", true);

  let sentCount = 0;
  const leadIds = (leads ?? []).map((l) => l.id as string);
  if (leadIds.length > 0) {
    const { count } = await supabase
      .from("sent_messages")
      .select("id", { count: "exact", head: true })
      .in("lead_id", leadIds);
    sentCount = count ?? 0;
  }

  const total = leads?.length ?? 0;
  const byStage = new Map<string, number>();
  for (const s of stages ?? []) byStage.set(s.id as string, 0);
  for (const l of leads ?? []) {
    const sid = l.stage_id as string;
    byStage.set(sid, (byStage.get(sid) ?? 0) + 1);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600">
          Visão geral do funil e cadastros do workspace.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Total de leads</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">{total}</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Campanhas ativas</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {activeCampaigns ?? 0}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-medium text-slate-500">Mensagens enviadas (simulado)</p>
          <p className="mt-2 text-3xl font-semibold tabular-nums text-slate-900">
            {sentCount ?? 0}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-slate-900">Leads por etapa</h2>
          <Link
            href="/leads"
            className="text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Abrir Kanban →
          </Link>
        </div>
        <ul className="mt-4 divide-y divide-slate-100">
          {(stages ?? []).map((s) => (
            <li key={s.id as string} className="flex justify-between py-3 text-sm">
              <span className="text-slate-700">{s.name as string}</span>
              <span className="font-semibold tabular-nums text-slate-900">
                {byStage.get(s.id as string) ?? 0}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
