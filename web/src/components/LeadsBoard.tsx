"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { createClient } from "@/lib/supabase/client";

type Stage = {
  id: string;
  name: string;
  position: number;
};

type Lead = {
  id: string;
  stage_id: string;
  name: string;
  company: string;
  email: string;
};

function LeadCard({ lead }: { lead: Lead }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: lead.id,
    data: { lead },
  });
  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div ref={setNodeRef} style={style} className={isDragging ? "opacity-60" : ""}>
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300 hover:shadow">
        <div className="flex items-start justify-between gap-2">
          <Link
            href={`/leads/${lead.id}`}
            className="flex-1 text-sm font-semibold text-slate-900 hover:text-blue-600"
            onPointerDown={(e) => e.stopPropagation()}
          >
            {lead.name || "Sem nome"}
          </Link>
          <button
            type="button"
            className="cursor-grab rounded px-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
            aria-label="Arrastar"
            {...listeners}
            {...attributes}
          >
            ⋮⋮
          </button>
        </div>
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{lead.company}</p>
      </div>
    </div>
  );
}

function StageColumn({
  stage,
  leads,
}: {
  stage: Stage;
  leads: Lead[];
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div className="flex w-72 shrink-0 flex-col rounded-2xl border border-slate-200 bg-slate-100/80 shadow-sm">
      <div className="border-b border-slate-200/80 bg-white/60 px-3 py-2.5 text-sm font-semibold text-slate-800">
        {stage.name}
        <span className="ml-2 font-normal text-slate-400">({leads.length})</span>
      </div>
      <div
        ref={setNodeRef}
        className={`flex min-h-[220px] flex-col gap-2 p-2 ${isOver ? "rounded-b-2xl ring-2 ring-blue-400/50 ring-inset" : ""}`}
      >
        {leads.map((l) => (
          <LeadCard key={l.id} lead={l} />
        ))}
      </div>
    </div>
  );
}

export function LeadsBoard({
  stages,
  leads,
}: {
  stages: Stage[];
  leads: Lead[];
}) {
  const router = useRouter();
  const [local, setLocal] = useState<Lead[]>(leads);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const byStage = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const s of stages) m.set(s.id, []);
    for (const l of local) {
      const arr = m.get(l.stage_id) ?? [];
      arr.push(l);
      m.set(l.stage_id, arr);
    }
    return m;
  }, [local, stages]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  return (
    <div className="space-y-4">
      {msg && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          {msg}
        </div>
      )}
      <DndContext
        sensors={sensors}
        onDragEnd={(e: DragEndEvent) => {
          setMsg(null);
          const leadId = String(e.active.id);
          const overId = e.over?.id ? String(e.over.id) : null;
          if (!overId) return;
          const lead = local.find((l) => l.id === leadId);
          if (!lead || lead.stage_id === overId) return;

          start(async () => {
            const supabase = createClient();
            const { data, error } = await supabase.rpc("move_lead_to_stage", {
              p_lead_id: leadId,
              p_stage_id: overId,
            });
            if (error) {
              setMsg(error.message);
              return;
            }
            const payload = data as { ok?: boolean; missing?: string[]; error?: string };
            if (!payload?.ok) {
              if (payload?.missing?.length) {
                setMsg(`Preencha antes de mover: ${payload.missing.join(", ")}`);
              } else {
                setMsg(payload?.error ?? "Não foi possível mover o lead.");
              }
              return;
            }

            setLocal((prev) =>
              prev.map((l) => (l.id === leadId ? { ...l, stage_id: overId } : l)),
            );

            const { error: fnErr } = await supabase.functions.invoke(
              "generate-lead-messages",
              { body: { leadId, mode: "triggers" } },
            );
            if (fnErr) {
              setMsg(
                `Lead movido. Geração automática: ${fnErr.message} (verifique o segredo GEMINI_API_KEY).`,
              );
            }
            router.refresh();
          });
        }}
      >
        <div className="flex gap-3 overflow-x-auto pb-4">
          {stages.map((s) => (
            <StageColumn key={s.id} stage={s} leads={byStage.get(s.id) ?? []} />
          ))}
        </div>
      </DndContext>
      <p className="text-xs text-slate-500">Arraste pelo ícone ⋮⋮ para mover entre colunas.</p>
      {pending && <p className="text-sm text-slate-500">Salvando…</p>}
    </div>
  );
}
