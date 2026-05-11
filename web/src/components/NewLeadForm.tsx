"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type CF = { id: string; label: string; field_key: string };

export function NewLeadForm({
  workspaceId,
  defaultStageId,
  customFields,
}: {
  workspaceId: string;
  defaultStageId: string;
  customFields: CF[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [leadSource, setLeadSource] = useState("");
  const [notes, setNotes] = useState("");
  const [custom, setCustom] = useState<Record<string, string>>({});

  return (
    <form
      className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        start(async () => {
          const supabase = createClient();
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (!user) {
            setErr("Sessão expirada.");
            return;
          }

          const { data: lead, error: le } = await supabase
            .from("leads")
            .insert({
              workspace_id: workspaceId,
              stage_id: defaultStageId,
              name,
              email,
              phone,
              company,
              job_title: jobTitle,
              lead_source: leadSource,
              notes,
            })
            .select("id")
            .single();

          if (le || !lead) {
            setErr(le?.message ?? "Erro ao criar lead");
            return;
          }

          const leadId = lead.id as string;

          const rows = customFields
            .map((f) => ({
              lead_id: leadId,
              custom_field_id: f.id,
              value: custom[f.id] ?? "",
            }))
            .filter((r) => r.value.trim() !== "");

          if (rows.length > 0) {
            const { error: ce } = await supabase.from("lead_custom_values").insert(rows);
            if (ce) {
              setErr(ce.message);
              return;
            }
          }

          await supabase.from("lead_activities").insert({
            workspace_id: workspaceId,
            lead_id: leadId,
            actor_id: user.id,
            action: "lead_created",
            metadata: {},
          });

          await supabase.functions.invoke("generate-lead-messages", {
            body: { leadId, mode: "triggers" },
          });

          router.replace(`/leads/${leadId}`);
          router.refresh();
        });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="text-sm font-medium sm:col-span-2">
          Nome
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          E-mail
          <input
            type="email"
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Telefone
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Empresa
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={company}
            onChange={(e) => setCompany(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium">
          Cargo
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Origem do lead
          <input
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            value={leadSource}
            onChange={(e) => setLeadSource(e.target.value)}
          />
        </label>
        <label className="text-sm font-medium sm:col-span-2">
          Observações
          <textarea
            className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </label>
      </div>

      {customFields.length > 0 && (
        <div className="space-y-3 border-t border-zinc-100 pt-4 dark:border-zinc-800">
          <p className="text-sm font-medium">Campos personalizados</p>
          <div className="grid gap-3 sm:grid-cols-2">
            {customFields.map((f) => (
              <label key={f.id} className="text-sm">
                {f.label}
                <input
                  className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                  value={custom[f.id] ?? ""}
                  onChange={(e) =>
                    setCustom((prev) => ({ ...prev, [f.id]: e.target.value }))
                  }
                />
              </label>
            ))}
          </div>
        </div>
      )}

      {err && <p className="text-sm text-red-600">{err}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Salvando…" : "Criar lead"}
      </button>
    </form>
  );
}
