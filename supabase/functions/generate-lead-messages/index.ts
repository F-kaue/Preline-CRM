import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

type Mode = "manual" | "triggers";

interface GeminiPart {
  text?: string;
}

interface GeminiCandidate {
  content?: { parts?: GeminiPart[] };
  finishReason?: string;
}

interface GeminiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: { blockReason?: string };
  error?: { message?: string; code?: number };
}

function stripJsonFence(text: string): string {
  let t = text.trim();
  const m = /^```(?:json)?\s*\n?([\s\S]*?)\n?```$/im.exec(t);
  if (m) t = m[1].trim();
  return t;
}

function parseMessagesJson(raw: string): string[] {
  const text = stripJsonFence(raw);
  let parsed: { messages?: unknown };
  try {
    parsed = JSON.parse(text) as { messages?: unknown };
  } catch {
    throw new Error("Resposta da IA não é JSON válido.");
  }
  const msgs = Array.isArray(parsed.messages)
    ? parsed.messages.filter((m): m is string => typeof m === "string" && m.trim())
    : [];
  if (msgs.length === 0) {
    throw new Error(
      'A IA deve retornar JSON: { "messages": ["...", "...", "..."] }',
    );
  }
  return msgs.slice(0, 5);
}

async function callGemini(systemAndUser: string): Promise<string[]> {
  const key = Deno.env.get("GEMINI_API_KEY");
  if (!key) {
    throw new Error(
      "GEMINI_API_KEY não configurada no projeto Supabase (Secrets).",
    );
  }
  // gemini-2.0-* está deprecated na API; 2.5-flash é o substituto estável.
  const model = Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: systemAndUser }] }],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: "application/json",
      },
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`Gemini erro ${res.status}: ${t.slice(0, 800)}`);
  }

  const data = (await res.json()) as GeminiResponse;
  if (data.error?.message) {
    throw new Error(`Gemini: ${data.error.message}`);
  }
  const block = data.promptFeedback?.blockReason;
  if (block) {
    throw new Error(`Gemini bloqueou o prompt (${block}).`);
  }

  const text =
    data.candidates?.[0]?.content?.parts?.map((p) => p.text ?? "").join("") ??
    "";
  if (!text.trim()) {
    const fr = data.candidates?.[0]?.finishReason;
    throw new Error(
      fr
        ? `Resposta vazia da IA (finishReason: ${fr}).`
        : "Resposta vazia da IA (sem candidates).",
    );
  }

  return parseMessagesJson(text);
}

function buildPrompt(params: {
  campaignName: string;
  context: string;
  generationPrompt: string;
  leadBlock: string;
}): string {
  return [
    "Você gera mensagens de abordagem para SDR (pré-vendas), em português do Brasil.",
    'Responda APENAS com JSON no formato: { "messages": ["variação1", "variação2", "variação3"] }.',
    "Sem markdown, sem comentários fora do JSON.",
    "",
    `Campanha: ${params.campaignName}`,
    "Contexto da campanha / oferta:",
    params.context || "(não informado)",
    "",
    "Instruções de geração (persona, tom, formato, tamanho, uso dos campos):",
    params.generationPrompt || "(não informado)",
    "",
    "Dados do lead (use para personalizar; não invente fatos não listados):",
    params.leadBlock,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: cors });
  }

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) {
      return new Response(JSON.stringify({ error: "Authorization obrigatório" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const sb = createClient(supabaseUrl, supabaseAnon, {
      global: { headers: { Authorization: auth } },
    });

    const { data: ures, error: uerr } = await sb.auth.getUser();
    if (uerr || !ures.user) {
      return new Response(JSON.stringify({ error: "Sessão inválida" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const body = (await req.json()) as {
      leadId?: string;
      campaignId?: string;
      mode?: Mode;
    };
    const leadId = body.leadId;
    const mode: Mode = body.mode ?? "manual";
    if (!leadId) {
      return new Response(JSON.stringify({ error: "leadId obrigatório" }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: lead, error: lerr } = await sb
      .from("leads")
      .select(
        "id, workspace_id, stage_id, name, email, phone, company, job_title, lead_source, notes",
      )
      .eq("id", leadId)
      .single();
    if (lerr || !lead) {
      return new Response(JSON.stringify({ error: "Lead não encontrado" }), {
        status: 404,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data: cdefs } = await sb
      .from("custom_field_definitions")
      .select("id, label, field_key")
      .eq("workspace_id", lead.workspace_id);

    const { data: cvals } = await sb
      .from("lead_custom_values")
      .select("custom_field_id, value")
      .eq("lead_id", leadId);

    const customLines: string[] = [];
    const cmap = new Map((cdefs ?? []).map((c) => [c.id, c]));
    for (const row of cvals ?? []) {
      const d = cmap.get(row.custom_field_id);
      if (d) customLines.push(`${d.label} (${d.field_key}): ${row.value}`);
    }

    const leadBlock = [
      `Nome: ${lead.name}`,
      `Email: ${lead.email}`,
      `Telefone: ${lead.phone}`,
      `Empresa: ${lead.company}`,
      `Cargo: ${lead.job_title}`,
      `Origem: ${lead.lead_source}`,
      `Observações: ${lead.notes}`,
      customLines.length ? `Campos personalizados:\n${customLines.join("\n")}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    let campaignIds: string[] = [];
    if (mode === "manual") {
      const cid = body.campaignId;
      if (!cid) {
        return new Response(
          JSON.stringify({ error: "campaignId obrigatório no modo manual" }),
          { status: 400, headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
      campaignIds = [cid];
    } else {
      const { data: camps, error: cerr } = await sb
        .from("campaigns")
        .select("id")
        .eq("workspace_id", lead.workspace_id)
        .eq("is_active", true)
        .eq("trigger_stage_id", lead.stage_id);
      if (cerr) throw cerr;
      campaignIds = (camps ?? []).map((c) => c.id);
      if (campaignIds.length === 0) {
        return new Response(
          JSON.stringify({
            ok: true,
            generated: [],
            note: "Nenhuma campanha com gatilho nesta etapa.",
          }),
          { headers: { ...cors, "Content-Type": "application/json" } },
        );
      }
    }

    const batchId = crypto.randomUUID();
    const out: { campaignId: string; messages: string[] }[] = [];

    for (const campaignId of campaignIds) {
      const { data: camp, error: cerr2 } = await sb
        .from("campaigns")
        .select("id, name, context, generation_prompt, workspace_id")
        .eq("id", campaignId)
        .single();
      if (cerr2 || !camp) continue;
      if (camp.workspace_id !== lead.workspace_id) continue;

      const prompt = buildPrompt({
        campaignName: camp.name,
        context: camp.context,
        generationPrompt: camp.generation_prompt,
        leadBlock,
      });

      const messages = await callGemini(prompt);

      const rows = messages.map((m, i) => ({
        lead_id: leadId,
        campaign_id: campaignId,
        body: m,
        variant_index: i,
        batch_id: batchId,
      }));

      const { error: insErr } = await sb.from("lead_message_suggestions").insert(rows);
      if (insErr) throw insErr;

      await sb.from("lead_activities").insert({
        workspace_id: lead.workspace_id,
        lead_id: leadId,
        actor_id: ures.user.id,
        action: "message_generated",
        metadata: {
          campaign_id: campaignId,
          batch_id: batchId,
          variants: messages.length,
          mode,
        },
      });

      out.push({ campaignId, messages });
    }

    return new Response(JSON.stringify({ ok: true, batchId, results: out }), {
      headers: { ...cors, "Content-Type": "application/json" },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, "Content-Type": "application/json" },
    });
  }
});
