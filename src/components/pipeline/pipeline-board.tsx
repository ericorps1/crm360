"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { Settings2, Trophy, XCircle } from "lucide-react";
import type { ConversationDto, StageDto } from "@/lib/types";
import { toneClass } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useEvents } from "@/components/use-events";
import { DraggableLead, LeadCard, type BoardLead } from "./lead-card";
import { StageManager } from "./stage-manager";

/**
 * Tablero kanban del embudo: todas las etapas como columnas, arrastre entre
 * ellas. Hacer clic en una tarjeta abre su conversación en la Bandeja.
 *
 * Igual que el kanban original, pero densificado: columnas de 224px (antes
 * 256) y la tarjeta compacta de dos líneas en lugar de la de p-3 con sombra.
 */
export function PipelineBoard({
  onOpenLead,
}: {
  onOpenLead: (lead: BoardLead) => void;
}) {
  const [stages, setStages] = useState<StageDto[]>([]);
  const [leads, setLeads] = useState<BoardLead[]>([]);
  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [activeLead, setActiveLead] = useState<BoardLead | null>(null);
  const [managing, setManaging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const refetch = useCallback(async () => {
    const [board, convs] = await Promise.all([
      fetch("/api/pipeline/board").catch(() => null),
      fetch("/api/conversations").catch(() => null),
    ]);
    if (board?.ok) {
      const d = (await board.json()) as { stages: StageDto[]; leads: BoardLead[] };
      setStages(d.stages);
      setLeads(d.leads);
    }
    if (convs?.ok) {
      const d = (await convs.json()) as { conversations: ConversationDto[] };
      setConversations(d.conversations);
    }
  }, []);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  // SSE con debounce y guarda de arrastre: refetchear a media operación
  // reordenaría las tarjetas bajo el puntero y rompería el drag.
  const activeLeadRef = useRef<BoardLead | null>(null);
  activeLeadRef.current = activeLead;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (activeLeadRef.current) return;
      void refetch();
    }, 500);
  }, [refetch]);
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Única llamada a useEvents en esta pantalla: un solo EventSource.
  useEvents({
    onMessageNew: scheduleRefetch,
    onConversationUpdated: scheduleRefetch,
    onReconnect: scheduleRefetch,
  });

  const { byId, byContactId } = useMemo(() => {
    const porId = new Map<string, ConversationDto>();
    const porContacto = new Map<string, ConversationDto>();
    for (const c of conversations) {
      porId.set(c.id, c);
      porContacto.set(c.contact.id, c);
    }
    return { byId: porId, byContactId: porContacto };
  }, [conversations]);

  const convDe = useCallback(
    (lead: BoardLead): ConversationDto | null =>
      (lead.conversationId ? byId.get(lead.conversationId) : null) ??
      byContactId.get(lead.contact.id) ??
      null,
    [byId, byContactId]
  );

  function onDragStart(event: DragStartEvent) {
    setActiveLead(leads.find((l) => l.id === event.active.id) ?? null);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const leadId = String(event.active.id);
    const overStage = event.over ? String(event.over.id) : null;
    if (!overStage) return;
    const lead = leads.find((l) => l.id === leadId);
    if (!lead || lead.stageId === overStage) return;

    const position = leads.filter((l) => l.stageId === overStage).length;
    // Optimista + persistencia, igual que siempre.
    setLeads((prev) =>
      prev.map((l) => (l.id === leadId ? { ...l, stageId: overStage, position } : l))
    );
    await fetch(`/api/pipeline/leads/${leadId}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ stageId: overStage, position }),
    }).catch(() => null);
    void refetch();
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b px-3 py-1.5">
        <h2 className="text-md font-semibold">Embudo</h2>
        <Button variant="outline" size="sm" onClick={() => setManaging(true)}>
          <Settings2 /> Etapas
        </Button>
      </header>

      <div className="flex-1 overflow-x-auto p-2">
        <DndContext
          sensors={sensors}
          onDragStart={onDragStart}
          onDragEnd={(e) => void onDragEnd(e)}
        >
          <div className="flex h-full gap-2">
            {stages.map((stage) => (
              <StageColumn
                key={stage.id}
                stage={stage}
                leads={leads
                  .filter((l) => l.stageId === stage.id)
                  .sort((a, b) => a.position - b.position)}
                convDe={convDe}
                onOpenLead={onOpenLead}
              />
            ))}
            {stages.length === 0 && (
              <p className="m-auto text-xs text-text-4">Sin etapas configuradas</p>
            )}
          </div>
          <DragOverlay>
            {activeLead ? (
              <LeadCard lead={activeLead} conversation={convDe(activeLead)} overlay />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {managing && (
        <StageManager
          stages={stages}
          onClose={() => setManaging(false)}
          onChanged={() => void refetch()}
        />
      )}
    </div>
  );
}

function StageColumn({
  stage,
  leads,
  convDe,
  onOpenLead,
}: {
  stage: StageDto;
  leads: BoardLead[];
  convDe: (lead: BoardLead) => ConversationDto | null;
  onOpenLead: (lead: BoardLead) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-56 shrink-0 flex-col rounded-md border bg-subtle transition-shadow",
        isOver && "ring-2 ring-primary/60"
      )}
    >
      <div className="flex items-center justify-between gap-2 border-b px-2 py-1.5">
        {/* El nombre de la etapa ES el badge: ahí vive el color del estatus. */}
        <span
          className={cn(
            "badge-etapa min-w-0",
            stage.kind !== "open" && "sin-punto",
            toneClass(stage.tone)
          )}
        >
          {stage.kind === "won" && <Trophy className="h-3 w-3 shrink-0" />}
          {stage.kind === "lost" && <XCircle className="h-3 w-3 shrink-0" />}
          <span className="truncate">{stage.name}</span>
        </span>
        <span className="shrink-0 text-2xs tabular-nums text-text-3">
          {leads.length}
        </span>
      </div>
      <div className="flex-1 space-y-1 overflow-y-auto p-1.5">
        {leads.map((lead) => (
          <DraggableLead
            key={lead.id}
            lead={lead}
            conversation={convDe(lead)}
            selected={false}
            onOpen={() => onOpenLead(lead)}
          />
        ))}
        {leads.length === 0 && (
          <p className="px-2 py-5 text-center text-2xs text-text-4">Sin tarjetas</p>
        )}
      </div>
    </div>
  );
}
