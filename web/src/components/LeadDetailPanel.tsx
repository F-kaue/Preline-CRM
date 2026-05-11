"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Lead = {
  id: string;
  name: string;
  email: string;
  phone: string;
  company: string;
  job_title: string;
  lead_source: string;
  notes: string;
  stage_id: string;
};

type Stage = { id: string; name: string; stage_key: string };
type Campaign = { id: string; name: string };
type Suggestion = {
  id: string;
  body: string;
  variant_index: number;
  batch_id: string;
  created_at: string;
  campaign_id: string;
  campaign_name: string;
};
type Activity = {
  id: string;
  action: string;
  metadata: Record<string, unknown>;
  created_at: string;
};
type CF = { id: string; label: string; value: string };

export function LeadDetailPanel({
  workspaceId,
  lead: initial,
  stages,
  campaigns,
  suggestions: initialSuggestions,
  activities: initialActivities,
  customFields: initialCf,
}: {
  workspaceId: string;
  lead: Lead;
  stages: Stage[];
  campaigns: Campaign[];
  suggestions: Suggestion[];
  activities: Activity[];
  customFields: CF[];
}) {
  const router = useRouter();
  const [lead, setLead] = useState(initial);
  const [customFields, setCustomFields] = useState(initialCf);
  const [suggestions, setSuggestions] = useState(initialSuggestions);
  const [activities, setActivities] = useState(initialActivities);
  const [campaignId, setCampaignId] = useState(campaigns[0]?.id ?? "");
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    setLead(initial);
    setCustomFields(initialCf);
    setSuggestions(initialSuggestions);
    setActivities(initialActivities);
  }, [initial, initialCf, initialSuggestions, initialActivities]);

  const grouped = useMemo(() => {
    const m = new Map<string, Suggestion[]>();
    for (const s of suggestions) {
      const k = `${s.campaign_id}:${s.batch_id}`;
      const arr = m.get(k) ?? [];
      arr.push(s);
      m.set(k, arr);
    }
    return [...m.entries()].slice(0, 12);
  }, [suggestions]);

  async function saveLead() {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("leads")
      .update({
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        job_title: lead.job_title,
        lead_source: lead.lead_source,
        notes: lead.notes,
      })
      .eq("id", lead.id);

    if (error) {
      setMsg(error.message);
      return;
    }

    for (const cf of customFields) {
      await supabase.from("lead_custom_values").upsert(
        {
          lead_id: lead.id,
          custom_field_id: cf.id,
          value: cf.value,
        },
        { onConflict: "lead_id,custom_field_id" },
      );
    }

    await supabase.from("lead_activities").insert({
      workspace_id: workspaceId,
      lead_id: lead.id,
      actor_id: user.id,
      action: "lead_updated",
      metadata: {},
    });

    setMsg("Salvo.");
    router.refresh();
  }

  function changeStage(nextId: string) {
    if (nextId === lead.stage_id) return;
    start(async () => {
      setMsg(null);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("move_lead_to_stage", {
        p_lead_id: lead.id,
        p_stage_id: nextId,
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      const payload = data as { ok?: boolean; missing?: string[] };
      if (!payload?.ok) {
        setMsg(`Campos faltando: ${(payload.missing ?? []).join(", ")}`);
        return;
      }
      setLead((l) => ({ ...l, stage_id: nextId }));
      const { data: fnData, error: fnErr } = await supabase.functions.invoke(
        "generate-lead-messages",
        { body: { leadId: lead.id, mode: "triggers" } },
      );
      if (fnErr) setMsg(`Movido. IA: ${fnErr.message}`);
      else if (fnData && typeof fnData === "object" && "results" in fnData) {
        setMsg("Etapa atualizada. Sugestões geradas se houver gatilho.");
      }
      router.refresh();
    });
  }

  function generate() {
    if (!campaignId) {
      setMsg("Selecione uma campanha.");
      return;
    }
    start(async () => {
      setMsg(null);
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("generate-lead-messages", {
        body: { leadId: lead.id, campaignId, mode: "manual" },
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      const results = (data as { results?: { messages: string[]; campaignId: string }[] })
        ?.results;
      if (results?.length) {
        const added: Suggestion[] = [];
        const camp = campaigns.find((c) => c.id === campaignId);
        for (const r of results) {
          r.messages.forEach((body, i) => {
            added.push({
              id: crypto.randomUUID(),
              body,
              variant_index: i,
              batch_id: (data as { batchId?: string }).batchId ?? "",
              created_at: new Date().toISOString(),
              campaign_id: r.campaignId,
              campaign_name: camp?.name ?? "",
            });
          });
        }
        setSuggestions((prev) => [...added, ...prev]);
      }
      setMsg("Novas sugestões geradas.");
      router.refresh();
    });
  }

  function sendSimulated(body: string, cid: string) {
    start(async () => {
      setMsg(null);
      const supabase = createClient();
      const { data, error } = await supabase.rpc("simulate_send_message", {
        p_lead_id: lead.id,
        p_body: body,
        p_campaign_id: cid || null,
      });
      if (error) {
        setMsg(error.message);
        return;
      }
      const payload = data as { ok?: boolean; stage_id?: string };
      if (!payload?.ok) {
        setMsg("Não foi possível simular envio.");
        return;
      }
      if (payload.stage_id) setLead((l) => ({ ...l, stage_id: payload.stage_id! }));
      setMsg('Mensagem "enviada" (simulado). Lead em Tentando Contato.');
      router.refresh();
    });
  }

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">Dados do lead</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="text-sm sm:col-span-2">
              Nome
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={lead.name}
                onChange={(e) => setLead({ ...lead, name: e.target.value })}
              />
            </label>
            <label className="text-sm">
              E-mail
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={lead.email}
                onChange={(e) => setLead({ ...lead, email: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Telefone
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={lead.phone}
                onChange={(e) => setLead({ ...lead, phone: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Empresa
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={lead.company}
                onChange={(e) => setLead({ ...lead, company: e.target.value })}
              />
            </label>
            <label className="text-sm">
              Cargo
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={lead.job_title}
                onChange={(e) => setLead({ ...lead, job_title: e.target.value })}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Origem
              <input
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={lead.lead_source}
                onChange={(e) => setLead({ ...lead, lead_source: e.target.value })}
              />
            </label>
            <label className="text-sm sm:col-span-2">
              Observações
              <textarea
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                rows={3}
                value={lead.notes}
                onChange={(e) => setLead({ ...lead, notes: e.target.value })}
              />
            </label>
          </div>

          {customFields.length > 0 && (
            <div className="mt-4 grid gap-3 border-t border-zinc-100 pt-4 dark:border-zinc-800 sm:grid-cols-2">
              {customFields.map((cf, idx) => (
                <label key={cf.id} className="text-sm">
                  {cf.label}
                  <input
                    className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                    value={cf.value}
                    onChange={(e) => {
                      const v = e.target.value;
                      setCustomFields((prev) => {
                        const n = [...prev];
                        n[idx] = { ...n[idx], value: v };
                        return n;
                      });
                    }}
                  />
                </label>
              ))}
            </div>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            <label className="text-sm">
              Etapa
              <select
                className="mt-1 w-full rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={lead.stage_id}
                onChange={(e) => changeStage(e.target.value)}
              >
                {stages.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={() => saveLead()}
              disabled={pending}
              className="self-end rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Salvar alterações
            </button>
          </div>
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">Histórico</h2>
          <ul className="mt-3 max-h-64 space-y-2 overflow-auto text-sm text-zinc-600 dark:text-zinc-400">
            {activities.map((a) => (
              <li key={a.id} className="rounded-md border border-zinc-100 px-2 py-1 dark:border-zinc-800">
                <span className="font-medium text-zinc-800 dark:text-zinc-200">{a.action}</span>{" "}
                — {new Date(a.created_at).toLocaleString()}
              </li>
            ))}
            {activities.length === 0 && <li>Nenhuma atividade ainda.</li>}
          </ul>
        </section>
      </div>

      <div className="space-y-6">
        <section className="rounded-xl border border-zinc-200 bg-white p-6 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-lg font-medium">Mensagens com IA</h2>
          <div className="mt-4 flex flex-wrap items-end gap-3">
            <label className="text-sm">
              Campanha
              <select
                className="mt-1 min-w-[200px] rounded-md border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-950"
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              disabled={pending || !campaignId}
              onClick={generate}
              className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900"
            >
              Gerar / regenerar
            </button>
          </div>
          {campaigns.length === 0 && (
            <p className="mt-2 text-sm text-zinc-500">Crie uma campanha ativa primeiro.</p>
          )}

          <div className="mt-6 space-y-4">
            {grouped.map(([key, rows]) => (
              <div key={key} className="rounded-lg border border-zinc-100 p-3 dark:border-zinc-800">
                <p className="text-xs font-medium text-zinc-500">
                  {rows[0]?.campaign_name} · {new Date(rows[0]?.created_at).toLocaleString()}
                </p>
                <ul className="mt-2 space-y-2">
                  {rows
                    .sort((a, b) => a.variant_index - b.variant_index)
                    .map((s) => (
                      <li key={s.id} className="rounded-md bg-zinc-50 p-3 text-sm dark:bg-zinc-950/50">
                        <p className="whitespace-pre-wrap">{s.body}</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            className="rounded border border-zinc-300 px-2 py-1 text-xs dark:border-zinc-700"
                            onClick={() => navigator.clipboard.writeText(s.body)}
                          >
                            Copiar
                          </button>
                          <button
                            type="button"
                            className="rounded bg-zinc-900 px-2 py-1 text-xs text-white dark:bg-zinc-100 dark:text-zinc-900"
                            onClick={() => sendSimulated(s.body, s.campaign_id)}
                          >
                            Enviar (simulado)
                          </button>
                        </div>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
            {grouped.length === 0 && (
              <p className="text-sm text-zinc-500">Nenhuma sugestão ainda. Gere ou use gatilho por etapa.</p>
            )}
          </div>
        </section>
      </div>

      {msg && (
        <p className="lg:col-span-2 rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm dark:border-zinc-800 dark:bg-zinc-900">
          {msg}
        </p>
      )}
    </div>
  );
}
