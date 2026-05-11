import Link from "next/link";
import { BRAND } from "@/lib/brand";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-[42%] flex-col justify-between bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 p-10 text-white lg:flex">
        <div>
          <Link href="/" className="inline-flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10 text-lg font-bold backdrop-blur">
              P
            </span>
            <span className="text-lg font-semibold tracking-tight">{BRAND.name}</span>
          </Link>
          <p className="mt-10 max-w-sm text-sm leading-relaxed text-slate-300">
            {BRAND.tagline}. Funil visual, campanhas com contexto e mensagens personalizadas com IA —
            pronto para equipes de pré-vendas.
          </p>
        </div>
        <p className="text-xs text-slate-500">
          © {new Date().getFullYear()} {BRAND.name} · Prova técnica
        </p>
      </div>

      <div className="flex flex-1 flex-col justify-center px-4 py-12 sm:px-8">
        <div className="mx-auto w-full max-w-[400px]">
          <div className="mb-8 lg:hidden">
            <Link href="/" className="inline-flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
                P
              </span>
              <span className="font-semibold text-slate-900">{BRAND.name}</span>
            </Link>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
          <div className="mt-8">{children}</div>
          <div className="mt-8 text-center text-sm text-slate-600">{footer}</div>
        </div>
      </div>
    </div>
  );
}
