import { Suspense } from "react";
import { LoginForm } from "@/components/LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4 text-sm text-zinc-500">
          Carregando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
