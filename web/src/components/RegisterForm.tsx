"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "@/components/AuthShell";

export function RegisterForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <AuthShell
      title="Criar conta"
      subtitle="Em poucos segundos você cria o workspace e começa a usar o funil."
      footer={
        <>
          Já tem conta?{" "}
          <Link href="/login" className="font-medium text-blue-600 hover:text-blue-700">
            Entrar
          </Link>
        </>
      }
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          setErr(null);
          start(async () => {
            const supabase = createClient();
            const { error } = await supabase.auth.signUp({ email, password });
            if (error) {
              setErr(error.message);
              return;
            }
            router.replace("/onboarding");
            router.refresh();
          });
        }}
      >
        <label className="text-sm font-medium text-slate-700">
          E-mail
          <input
            type="email"
            autoComplete="email"
            className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm placeholder:text-slate-400"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="seu@email.com"
            required
          />
        </label>
        <label className="text-sm font-medium text-slate-700">
          Senha (mín. 6 caracteres)
          <input
            type="password"
            autoComplete="new-password"
            className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            placeholder="••••••••"
            required
          />
        </label>
        {err && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{err}</p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
        >
          {pending ? "Criando…" : "Cadastrar e continuar"}
        </button>
      </form>
    </AuthShell>
  );
}
