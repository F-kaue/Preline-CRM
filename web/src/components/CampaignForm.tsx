"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Stage = { id: string; name: string };

export function CampaignForm({
  workspaceId,
  stages,
  initial,
}: {
  workspaceId: string;
  stages: Stage[];
  initial?: {
    id: string;
    name: string;
    context: string;
    generation_prompt: string;
    trigger_stage_id: string | null;
    is_active: boolean;
  };
}) {
  const router = useRouter();
  const editing = Boolean(initial);
  const [name, setName] = useState(initial?.name ?? "");
  const [context, setContext] = useState(initial?.context ?? "");
  const [generationPrompt, setGenerationPrompt] = useState(initial?.generation_prompt ?? "");
  const [triggerStageId, setTriggerStageId] = useState<string>(
    initial?.trigger_stage_id ?? "",
  );
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <form
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const supabase = createClient();
          const row = {
            workspace_id: workspaceId,
            name: name.trim(),
            context,
            generation_prompt: generationPrompt,
            trigger_stage_id: triggerStageId || null,
            is_active: isActive,
          };
          let error = null as { message: string } | null;
          let newId = initial?.id ?? "";
          if (editing) {
            const r = await supabase
              .from("campaigns")
              .update(row)
              .eq("id", initial!.id)
              .select("id")
              .single();
            error = r.error;
            newId = r.data?.id as string;
          } else {
            const r = await supabase.from("campaigns").insert(row).select("id").single();
            error = r.error;
            newId = r.data?.id as string;
          }
          if (error) {
            setErr(error.message);
            return;
          }
          router.replace(`/campaigns/${newId}`);
          router.refresh();
        });
      }}
    >
      <label className="block text-sm font-medium">
        Nome
        <input
          required
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Contexto (oferta, produto, empresa, período)
        <textarea
          required
          rows={6}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={context}
          onChange={(e) => setContext(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Prompt de geração (persona, tom, formato, campos do lead a usar)
        <textarea
          required
          rows={6}
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={generationPrompt}
          onChange={(e) => setGenerationPrompt(e.target.value)}
        />
      </label>
      <label className="block text-sm font-medium">
        Etapa gatilho (opcional — gera sugestões ao entrar/criar lead nesta etapa)
        <select
          className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
          value={triggerStageId}
          onChange={(e) => setTriggerStageId(e.target.value)}
        >
          <option value="">Nenhuma</option>
          {stages.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
        />
        Campanha ativa
      </label>
      {err && <p className="text-sm text-red-600">{err}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Salvando…" : editing ? "Atualizar" : "Criar campanha"}
      </button>
    </form>
  );
}
