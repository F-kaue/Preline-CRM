import Link from "next/link";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { getActiveWorkspaceId } from "@/lib/workspace";

export default async function CampaignsPage() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  const ws = await getActiveWorkspaceId(supabase, cookieStore);
  if (!ws) return null;

  const { data: rows } = await supabase
    .from("campaigns")
    .select("id,name,is_active,trigger_stage_id")
    .eq("workspace_id", ws)
    .order("created_at", { ascending: false });

  const { data: stages } = await supabase
    .from("pipeline_stages")
    .select("id,name")
    .eq("workspace_id", ws);

  const stageName = new Map((stages ?? []).map((s) => [s.id as string, s.name as string]));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Campanhas</h1>
          <p className="text-sm text-zinc-600 dark:text-zinc-400">
            Contexto + prompt para a IA; etapa gatilho para geração automática.
          </p>
        </div>
        <Link
          href="/campaigns/new"
          className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
        >
          Nova campanha
        </Link>
      </div>

      <ul className="divide-y divide-zinc-200 rounded-xl border border-zinc-200 bg-white dark:divide-zinc-800 dark:border-zinc-800 dark:bg-zinc-900">
        {(rows ?? []).length === 0 && (
          <li className="px-4 py-6 text-sm text-zinc-500">Nenhuma campanha ainda.</li>
        )}
        {(rows ?? []).map((c) => {
          const tid = c.trigger_stage_id as string | null;
          const tname = tid ? stageName.get(tid) : null;
          return (
            <li key={c.id as string} className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
              <div>
                <Link
                  href={`/campaigns/${c.id}`}
                  className="font-medium hover:underline"
                >
                  {c.name as string}
                </Link>
                <p className="text-xs text-zinc-500">
                  {(c.is_active as boolean) ? "Ativa" : "Inativa"}
                  {tname ? ` · Gatilho: ${tname}` : ""}
                </p>
              </div>
              <Link
                href={`/campaigns/${c.id}`}
                className="text-sm text-zinc-600 underline dark:text-zinc-400"
              >
                Editar
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
