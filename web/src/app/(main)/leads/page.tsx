import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { LeadsBoard } from "@/components/LeadsBoard";

export default async function LeadsPage() {
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
    .select("id,stage_id,name,company,email")
    .eq("workspace_id", ws)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Leads</h1>
          <p className="mt-1 text-sm text-slate-600">
            Kanban por etapa. Ao mover, validamos campos obrigatórios e disparamos IA se houver
            gatilho.
          </p>
        </div>
        <Link
          href="/leads/new"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
        >
          Novo lead
        </Link>
      </div>

      <LeadsBoard
        stages={(stages ?? []).map((s) => ({
          id: s.id as string,
          name: s.name as string,
          position: s.position as number,
        }))}
        leads={(leads ?? []).map((l) => ({
          id: l.id as string,
          stage_id: l.stage_id as string,
          name: l.name as string,
          company: l.company as string,
          email: l.email as string,
        }))}
      />
    </div>
  );
}
