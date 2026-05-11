import { FunctionsHttpError } from "@supabase/supabase-js";

/** Lê `{ error: string }` do corpo quando a Edge Function devolve 4xx/5xx. */
export async function formatFunctionsInvokeError(err: unknown): Promise<string> {
  if (err instanceof FunctionsHttpError) {
    const res = err.context as Response;
    try {
      const j = (await res.clone().json()) as { error?: unknown };
      if (typeof j?.error === "string" && j.error.trim()) return j.error;
    } catch {
      /* ignore */
    }
  }
  if (err instanceof Error) return err.message;
  return String(err);
}
