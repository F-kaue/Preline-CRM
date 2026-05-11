"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createWorkspace } from "@/app/actions/workspace";

export function OnboardingForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold text-slate-900">Criar workspace</h1>
      <p className="mt-2 text-sm text-slate-600">
        O workspace isola leads, funil e campanhas. Você pode criar outros depois em Configurações.
      </p>
      <form
        className="mt-6 flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(null);
          start(async () => {
            const r = await createWorkspace(name);
            if (!r.ok) {
              setErr(r.error ?? "Erro");
              return;
            }
            router.replace("/dashboard");
          });
        }}
      >
        <label className="text-sm font-medium text-slate-700">
          Nome da empresa / equipe
          <input
            className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex: Acme Pré-Vendas"
            required
          />
        </label>
        {err && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Criando…" : "Continuar para o painel"}
        </button>
      </form>
    </div>
  );
}
