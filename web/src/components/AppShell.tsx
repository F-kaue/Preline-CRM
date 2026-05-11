import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { getActiveWorkspaceId } from "@/lib/workspace";
import { setActiveWorkspace } from "@/app/actions/workspace";
import { WorkspaceSwitcher } from "@/components/WorkspaceSwitcher";
import { BRAND } from "@/lib/brand";

const nav = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/leads", label: "Leads" },
  { href: "/campaigns", label: "Campanhas" },
  { href: "/settings", label: "Configurações" },
] as const;

export async function AppShell({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const cookieStore = await cookies();
  const workspaceId = await getActiveWorkspaceId(supabase, cookieStore);

  const { data: memberRows } = await supabase
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", user!.id);

  const ids = [...new Set((memberRows ?? []).map((r) => r.workspace_id as string))];

  let list: { id: string; name: string }[] = [];
  if (ids.length > 0) {
    const { data: wsRows } = await supabase
      .from("workspaces")
      .select("id,name")
      .in("id", ids);
    list =
      wsRows?.map((w) => ({ id: w.id as string, name: (w.name as string) ?? "" })) ??
      [];
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-3.5">
          <div className="flex flex-wrap items-center gap-8">
            <Link href="/dashboard" className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white shadow-sm">
                P
              </span>
              <span className="text-base font-semibold tracking-tight text-slate-900">
                {BRAND.name}
              </span>
            </Link>
            <nav className="flex flex-wrap gap-1">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-100 hover:text-slate-900"
                >
                  {item.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm">
            {workspaceId && list.length > 0 && (
              <WorkspaceSwitcher
                workspaces={list}
                activeId={workspaceId}
                setWorkspace={setActiveWorkspace}
              />
            )}
            <span className="hidden max-w-[200px] truncate text-slate-500 sm:inline" title={user?.email}>
              {user?.email}
            </span>
            <form action="/auth/signout" method="post">
              <button
                type="submit"
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50"
              >
                Sair
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-10">{children}</main>
    </div>
  );
}
