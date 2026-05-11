"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { formatFunctionsInvokeError } from "@/lib/edge-function-error";

type CF = { id: string; label: string; field_key: string };

const SOURCE_PRESETS = [
  "LinkedIn",
  "Site / formulário",
  "Indicação",
  "Evento / feira",
  "Outbound (prospecção)",
  "Inbound / marketing",
] as const;

function IconUser({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 12a4 4 0 1 0-4-4 4 4 0 0 0 4 4Zm0 2c-4.33 0-8 2.17-8 5v1h16v-1c0-2.83-3.67-5-8-5Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconBuilding({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4 21V8l8-4 8 4v13h-5v-6H9v6H4Zm7 0v-4h2v4h-2Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconRadar({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8Zm0-14a6 6 0 1 0 6 6h-2a4 4 0 1 1-4-4V6Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

function IconSpark({ className }: { className?: string }) {
  return (
    <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="m12 3 1.3 4.3L18 9l-4.7 1.3L12 15l-1.3-4.7L6 9l4.7-1.7L12 3Zm6 8.5 1.2 3.8 3.8 1.2-3.8 1.2L18 21l-1.2-3.8L13 16l3.8-1.2L18 12.5Z"
        fill="currentColor"
        opacity="0.9"
      />
    </svg>
  );
}

const inputClass =
  "focus-ring mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400 transition hover:border-slate-300";

export function NewLeadForm({
  workspaceId,
  defaultStageId,
  defaultStageName,
  customFields,
}: {
  workspaceId: string;
  defaultStageId: string;
  defaultStageName: string;
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
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
      onSubmit={(e) => {
        e.preventDefault();
        setErr(null);
        const trimmedName = name.trim();
        if (!trimmedName) {
          setErr("Informe pelo menos o nome do lead.");
          return;
        }
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
              name: trimmedName,
              email: email.trim(),
              phone: phone.trim(),
              company: company.trim(),
              job_title: jobTitle.trim(),
              lead_source: leadSource.trim(),
              notes: notes.trim(),
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

          const { error: fnErr } = await supabase.functions.invoke("generate-lead-messages", {
            body: { leadId, mode: "triggers" },
          });
          if (fnErr) {
            sessionStorage.setItem("preline_fn_warn", await formatFunctionsInvokeError(fnErr));
          }

          router.replace(`/leads/${leadId}`);
          router.refresh();
        });
      }}
    >
      <div className="border-b border-slate-100 bg-gradient-to-br from-slate-50/90 to-white px-6 py-5 sm:px-8">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-800">
            Funil · {defaultStageName}
          </span>
          <span className="text-xs text-slate-500">
            Etapa inicial após criar o cadastro — você move no Kanban depois.
          </span>
        </div>
      </div>

      <div className="space-y-10 px-6 py-8 sm:px-8">
        <section aria-labelledby="section-contact">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
              <IconUser className="h-5 w-5" />
            </span>
            <div>
              <h2 id="section-contact" className="text-base font-semibold text-slate-900">
                Pessoa e contato
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Quem é o decisor ou contato principal? E-mail e telefone ajudam no outreach.
              </p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="sm:col-span-2 text-sm font-medium text-slate-700">
              Nome completo <span className="text-red-600">*</span>
              <input
                className={inputClass}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Marina Silva"
                autoComplete="name"
                required
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              E-mail
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nome@empresa.com"
                autoComplete="email"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Telefone / WhatsApp
              <input
                type="tel"
                className={inputClass}
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+55 11 99999-0000"
                autoComplete="tel"
              />
            </label>
          </div>
        </section>

        <section aria-labelledby="section-company">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
              <IconBuilding className="h-5 w-5" />
            </span>
            <div>
              <h2 id="section-company" className="text-base font-semibold text-slate-900">
                Empresa e cargo
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                Contexto B2B para personalizar abordagem e mensagens geradas pela IA.
              </p>
            </div>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <label className="text-sm font-medium text-slate-700">
              Empresa
              <input
                className={inputClass}
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Razão social ou marca"
                autoComplete="organization"
              />
            </label>
            <label className="text-sm font-medium text-slate-700">
              Cargo / função
              <input
                className={inputClass}
                value={jobTitle}
                onChange={(e) => setJobTitle(e.target.value)}
                placeholder="Ex: Head de Vendas, SDR, Founder"
                autoComplete="organization-title"
              />
            </label>
          </div>
        </section>

        <section aria-labelledby="section-source">
          <div className="mb-4 flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <IconRadar className="h-5 w-5" />
            </span>
            <div>
              <h2 id="section-source" className="text-base font-semibold text-slate-900">
                Origem e contexto
              </h2>
              <p className="mt-0.5 text-sm text-slate-600">
                De onde veio o lead? Use atalhos ou descreva livremente para relatórios e priorização.
              </p>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Atalhos de origem
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {SOURCE_PRESETS.map((label) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setLeadSource(label)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                      leadSource === label
                        ? "border-blue-600 bg-blue-600 text-white shadow-sm"
                        : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <label className="block text-sm font-medium text-slate-700">
              Origem do lead (texto livre)
              <input
                className={inputClass}
                value={leadSource}
                onChange={(e) => setLeadSource(e.target.value)}
                placeholder="Ex: Campanha Q1 — SDR outbound"
                list="lead-source-hints"
              />
              <datalist id="lead-source-hints">
                {SOURCE_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Observações e próximos passos
              <textarea
                className={`${inputClass} min-h-[108px] resize-y`}
                rows={4}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Resumo da conversa, dores mencionadas, horário preferido para contato, links úteis…"
              />
              <span className="mt-1 block text-xs text-slate-500">
                {notes.length} caracteres — quanto mais contexto, melhor para sugestões de mensagem.
              </span>
            </label>
          </div>
        </section>

        {customFields.length > 0 && (
          <section aria-labelledby="section-custom">
            <div className="mb-4 flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700">
                <IconSpark className="h-5 w-5" />
              </span>
              <div>
                <h2 id="section-custom" className="text-base font-semibold text-slate-900">
                  Campos personalizados
                </h2>
                <p className="mt-0.5 text-sm text-slate-600">
                  Definidos nas configurações do workspace — aparecem na ficha do lead.
                </p>
              </div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              {customFields.map((f) => (
                <label key={f.id} className="text-sm font-medium text-slate-700">
                  {f.label}
                  <input
                    className={inputClass}
                    value={custom[f.id] ?? ""}
                    onChange={(e) =>
                      setCustom((prev) => ({ ...prev, [f.id]: e.target.value }))
                    }
                    placeholder={`${f.label}`}
                  />
                </label>
              ))}
            </div>
          </section>
        )}
      </div>

      <div className="flex flex-col gap-4 border-t border-slate-100 bg-slate-50/80 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
        {err && (
          <p className="order-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800 sm:order-1">
            {err}
          </p>
        )}
        <div className="order-1 flex flex-wrap items-center gap-3 sm:order-2 sm:ml-auto">
          <p className="hidden text-xs text-slate-500 sm:block">
            Após salvar, você verá a ficha com histórico e sugestões de IA.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="focus-ring inline-flex min-w-[160px] items-center justify-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-60"
          >
            {pending ? "Criando lead…" : "Criar lead"}
          </button>
        </div>
      </div>
    </form>
  );
}
