import { BRAND } from "@/lib/brand";

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50 px-4 py-16">
      <div className="mx-auto mb-10 flex max-w-md items-center justify-center gap-2">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-sm font-bold text-white shadow-sm">
          P
        </span>
        <span className="text-lg font-semibold text-slate-900">{BRAND.name}</span>
      </div>
      <div className="mx-auto max-w-md">{children}</div>
    </div>
  );
}
