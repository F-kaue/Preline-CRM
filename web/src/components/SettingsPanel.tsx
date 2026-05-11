"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createWorkspace } from "@/app/actions/workspace";

const STANDARD = [
  { key: "name", label: "Nome" },
  { key: "email", label: "E-mail" },
  { key: "phone", label: "Telefone" },
  { key: "company", label: "Empresa" },
  { key: "job_title", label: "Cargo" },
  { key: "lead_source", label: "Origem" },
  { key: "notes", label: "Observações" },
] as const;

type Stage = { id: string; name: string };
type CF = { id: string; label: string; field_key: string };
type Req = {
  id: string;
  stage_id: string;
  field_kind: string;
  standard_field: string | null;
  custom_field_id: string | null;
};

export function SettingsPanel({
  workspaceId,
  stages,
  customFields: initialCf,
  requirements: initialReq,
}: {
  workspaceId: string;
  stages: Stage[];
  customFields: CF[];
  requirements: Req[];
}) {
  const router = useRouter();
  const [customFields, setCustomFields] = useState(initialCf);
  const [requirements, setRequirements] = useState(initialReq);
  const [label, setLabel] = useState("");
  const [stageId, setStageId] = useState(stages[0]?.id ?? "");
  const [stdKey, setStdKey] = useState<(typeof STANDARD)[number]["key"]>("name");
  const [custId, setCustId] = useState("");
  const [newWsName, setNewWsName] = useState("");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function slugify(s: string) {
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_")
      .replace(/[^a-z0-9_]/g, "");
  }

  return (
    <div className="space-y-10">
      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Novo workspace</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Multi-workspace: crie outra empresa e troque pelo menu superior.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Nome do novo workspace"
            value={newWsName}
            onChange={(e) => setNewWsName(e.target.value)}
          />
          <button
            type="button"
            disabled={pending}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => {
              start(async () => {
                setMsg(null);
                const r = await createWorkspace(newWsName);
                if (!r.ok) {
                  setMsg(r.error ?? "Erro");
                  return;
                }
                setNewWsName("");
                setMsg("Workspace criado. Selecione-o no menu.");
                router.refresh();
              });
            }}
          >
            Criar
          </button>
        </div>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Campos personalizados</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <input
            className="min-w-[200px] flex-1 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Rótulo (ex: Segmento)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
          />
          <button
            type="button"
            disabled={pending || !label.trim()}
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => {
              start(async () => {
                setMsg(null);
                const key = slugify(label) || `campo_${Date.now()}`;
                const supabase = createClient();
                const { data, error } = await supabase
                  .from("custom_field_definitions")
                  .insert({
                    workspace_id: workspaceId,
                    label: label.trim(),
                    field_key: key,
                  })
                  .select("id,label,field_key")
                  .single();
                if (error) {
                  setMsg(error.message);
                  return;
                }
                setCustomFields((prev) => [
                  ...prev,
                  {
                    id: data.id as string,
                    label: data.label as string,
                    field_key: data.field_key as string,
                  },
                ]);
                setLabel("");
                router.refresh();
              });
            }}
          >
            Adicionar
          </button>
        </div>
        <ul className="mt-4 space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          {customFields.map((c) => (
            <li key={c.id}>
              {c.label} <code className="text-xs">({c.field_key})</code>
            </li>
          ))}
          {customFields.length === 0 && <li>Nenhum campo extra.</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-lg font-medium">Campos obrigatórios por etapa</h2>
        <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
          Ao mover no Kanban, a RPC bloqueia se faltar dado.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Etapa
            <select
              className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={stageId}
              onChange={(e) => setStageId(e.target.value)}
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            Campo padrão
            <select
              className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={stdKey}
              onChange={(e) =>
                setStdKey(e.target.value as (typeof STANDARD)[number]["key"])
              }
            >
              {STANDARD.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => {
              start(async () => {
                setMsg(null);
                const supabase = createClient();
                const { data, error } = await supabase
                  .from("stage_required_fields")
                  .insert({
                    stage_id: stageId,
                    field_kind: "standard",
                    standard_field: stdKey,
                    custom_field_id: null,
                  })
                  .select("id,stage_id,field_kind,standard_field,custom_field_id")
                  .single();
                if (error) {
                  setMsg(error.message);
                  return;
                }
                setRequirements((prev) => [...prev, data as Req]);
                router.refresh();
              });
            }}
          >
            Exigir campo padrão
          </button>
        </div>
        <div className="mt-4 flex flex-wrap items-end gap-3">
          <label className="text-sm">
            Campo personalizado
            <select
              className="mt-1 rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
              value={custId}
              onChange={(e) => setCustId(e.target.value)}
            >
              <option value="">Selecione…</option>
              {customFields.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={!custId}
            className="rounded-md bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            onClick={() => {
              start(async () => {
                setMsg(null);
                const supabase = createClient();
                const { data, error } = await supabase
                  .from("stage_required_fields")
                  .insert({
                    stage_id: stageId,
                    field_kind: "custom",
                    standard_field: null,
                    custom_field_id: custId,
                  })
                  .select("id,stage_id,field_kind,standard_field,custom_field_id")
                  .single();
                if (error) {
                  setMsg(error.message);
                  return;
                }
                setRequirements((prev) => [...prev, data as Req]);
                router.refresh();
              });
            }}
          >
            Exigir campo personalizado
          </button>
        </div>

        <ul className="mt-6 space-y-2 text-sm">
          {requirements.map((r) => {
            const st = stages.find((s) => s.id === r.stage_id)?.name ?? r.stage_id;
            const label =
              r.field_kind === "standard"
                ? STANDARD.find((x) => x.key === r.standard_field)?.label ??
                  r.standard_field
                : customFields.find((c) => c.id === r.custom_field_id)?.label ??
                  "Personalizado";
            return (
              <li
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-md border border-zinc-100 px-2 py-1 dark:border-zinc-800"
              >
                <span>
                  <strong>{st}</strong>: {label}
                </span>
                <button
                  type="button"
                  className="text-xs text-red-600 underline"
                  onClick={() => {
                    start(async () => {
                      const supabase = createClient();
                      await supabase.from("stage_required_fields").delete().eq("id", r.id);
                      setRequirements((prev) => prev.filter((x) => x.id !== r.id));
                      router.refresh();
                    });
                  }}
                >
                  remover
                </button>
              </li>
            );
          })}
          {requirements.length === 0 && (
            <li className="text-zinc-500">Nenhuma regra configurada.</li>
          )}
        </ul>
      </section>

      {msg && (
        <p className="rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {msg}
        </p>
      )}
    </div>
  );
}
