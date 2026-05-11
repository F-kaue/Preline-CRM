"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { BRAND } from "@/lib/brand";
import { AuthShell } from "@/components/AuthShell";

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") ?? "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <AuthShell
      title="Entrar"
      subtitle={`Acesse o ${BRAND.short} com sua conta.`}
      footer={
        <>
          Não tem conta?{" "}
          <Link href="/register" className="font-medium text-blue-600 hover:text-blue-700">
            Criar conta
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
            const { error } = await supabase.auth.signInWithPassword({
              email,
              password,
            });
            if (error) {
              setErr(error.message);
              return;
            }
            router.replace(next);
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
          Senha
          <input
            type="password"
            autoComplete="current-password"
            className="focus-ring mt-1.5 w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-slate-900 shadow-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
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
          {pending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </AuthShell>
  );
}
