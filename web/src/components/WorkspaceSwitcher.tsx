"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";

type Ws = { id: string; name: string };

export function WorkspaceSwitcher({
  workspaces,
  activeId,
  setWorkspace,
}: {
  workspaces: Ws[];
  activeId: string;
  setWorkspace: (id: string) => Promise<{ ok: boolean; error?: string }>;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
      Workspace
      <select
        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-medium text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
        value={activeId}
        disabled={pending}
        onChange={(e) => {
          const id = e.target.value;
          start(async () => {
            await setWorkspace(id);
            router.refresh();
          });
        }}
      >
        {workspaces.map((w) => (
          <option key={w.id} value={w.id}>
            {w.name}
          </option>
        ))}
      </select>
    </label>
  );
}
