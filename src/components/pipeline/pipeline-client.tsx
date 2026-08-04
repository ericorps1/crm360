"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { MessageSquareText, PanelRight, Settings2 } from "lucide-react";
import type { ConversationDto, StageDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { ContactPanel } from "@/components/inbox/contact-panel";
import { ConversationPane } from "@/components/inbox/conversation-pane";
import { useConversationWorkspace } from "@/components/inbox/use-conversation-workspace";
import { DraggableLead, LeadCard, type BoardLead } from "./lead-card";
import { MoveStageMenu } from "./move-stage-menu";
import { StageManager } from "./stage-manager";
import { StageTabs, TAB_DROP_PREFIX } from "./stage-tabs";

export type { BoardLead };

export function PipelineClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [stages, setStages] = useState<StageDto[]>([]);
  const [leads, setLeads] = useState<BoardLead[]>([]);
  const [activeStageId, setActiveStageId] = useState<string | null>(null);
  const [activeLead, setActiveLead] = useState<BoardLead | null>(null);
  const [managing, setManaging] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } })
  );

  const refetchBoard = useCallback(async () => {
    const res = await fetch("/api/pipeline/board").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { stages: StageDto[]; leads: BoardLead[] };
    setStages(data.stages);
    setLeads(data.leads);
  }, []);

  // Refetch del tablero con debounce y guarda de arrastre: una corrida del
  // Laboratorio dispara ráfagas de message.new, y reordenar la lista bajo el
  // puntero rompería el drag en curso.
  const activeLeadRef = useRef<BoardLead | null>(null);
  activeLeadRef.current = activeLead;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleBoardRefetch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (activeLeadRef.current) return;
      void refetchBoard();
    }, 500);
  }, [refetchBoard]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const ws = useConversationWorkspace({ onExternalChange: scheduleBoardRefetch });
  const { byId, byContactId, select, selectedId, selected } = ws;

  useEffect(() => {
    void refetchBoard();
  }, [refetchBoard]);

  useEffect(() => {
    setPanelOpen(localStorage.getItem("crm360.panelOpen") !== "false");
  }, []);
  const togglePanel = useCallback((open: boolean) => {
    setPanelOpen(open);
    localStorage.setItem("crm360.panelOpen", String(open));
  }, []);

  /** La conversación de un lead: por id, y si no llegó, por contacto. */
  const convDe = useCallback(
    (lead: BoardLead): ConversationDto | null =>
      (lead.conversationId ? byId.get(lead.conversationId) : null) ??
      byContactId.get(lead.contact.id) ??
      null,
    [byId, byContactId]
  );

  const counts = useMemo(() => {
    const n: Record<string, number> = {};
    for (const l of leads) n[l.stageId] = (n[l.stageId] ?? 0) + 1;
    return n;
  }, [leads]);

  // Etapa activa: la de la URL, si no la primera. Si la etapa activa desaparece
  // (la borraron en StageManager), salta a la primera.
  const stageParam = searchParams.get("stage");
  useEffect(() => {
    if (stages.length === 0) return;
    const valida =
      (activeStageId && stages.some((s) => s.id === activeStageId)) ||
      (stageParam && stages.some((s) => s.id === stageParam));
    if (valida) {
      if (!activeStageId && stageParam) setActiveStageId(stageParam);
      return;
    }
    setActiveStageId(stages[0]!.id);
  }, [stages, activeStageId, stageParam]);

  const stageLeads = useMemo(
    () =>
      leads
        .filter((l) => l.stageId === activeStageId)
        .sort((a, b) => a.position - b.position),
    [leads, activeStageId]
  );

  const sincronizarUrl = useCallback(
    (stageId: string | null, contactId: string | null) => {
      const p = new URLSearchParams();
      if (stageId) p.set("stage", stageId);
      if (contactId) p.set("contact", contactId);
      router.replace(`/pipeline${p.toString() ? `?${p}` : ""}`, { scroll: false });
    },
    [router]
  );

  const abrirLead = useCallback(
    (lead: BoardLead) => {
      select(convDe(lead)?.id ?? null);
      sincronizarUrl(lead.stageId, lead.contact.id);
    },
    [convDe, select, sincronizarUrl]
  );

  /** El lead que corresponde a la conversación abierta. */
  const leadSeleccionado = useMemo(
    () => leads.find((l) => convDe(l)?.id === selectedId) ?? null,
    [leads, convDe, selectedId]
  );

  const irAEtapa = useCallback(
    (stageId: string) => {
      setActiveStageId(stageId);
      const enEtapa = leads
        .filter((l) => l.stageId === stageId)
        .sort((a, b) => a.position - b.position);
      // Si el lead abierto vive en la etapa nueva, se conserva.
      if (enEtapa.some((l) => convDe(l)?.id === selectedId)) {
        sincronizarUrl(stageId, selected?.contact.id ?? null);
        return;
      }
      const primero = enEtapa.find((l) => convDe(l));
      select(primero ? (convDe(primero)?.id ?? null) : null);
      sincronizarUrl(stageId, primero?.contact.id ?? null);
    },
    [leads, convDe, selectedId, selected, select, sincronizarUrl]
  );

  const moverLead = useCallback(
    async (leadId: string, stageId: string) => {
      const lead = leads.find((l) => l.id === leadId);
      if (!lead || lead.stageId === stageId) return;
      const position = leads.filter((l) => l.stageId === stageId).length;

      setLeads((prev) =>
        prev.map((l) => (l.id === leadId ? { ...l, stageId, position } : l))
      );
      // Al mover el lead abierto, seguirlo a su etapa nueva: es lo que espera
      // quien acaba de calificar a alguien mientras lee su hilo.
      if (leadSeleccionado?.id === leadId) {
        setActiveStageId(stageId);
        sincronizarUrl(stageId, lead.contact.id);
      }

      await fetch(`/api/pipeline/leads/${leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stageId, position }),
      }).catch(() => null);
      void refetchBoard();
    },
    [leads, leadSeleccionado, refetchBoard, sincronizarUrl]
  );

  function onDragStart(event: DragStartEvent) {
    setActiveLead(leads.find((l) => l.id === event.active.id) ?? null);
  }

  async function onDragEnd(event: DragEndEvent) {
    setActiveLead(null);
    const destino = event.over ? String(event.over.id) : null;
    if (!destino?.startsWith(TAB_DROP_PREFIX)) return;
    await moverLead(String(event.active.id), destino.slice(TAB_DROP_PREFIX.length));
  }

  const etapaActiva = stages.find((s) => s.id === activeStageId) ?? null;

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={(e) => void onDragEnd(e)}
    >
      <div className="flex h-full flex-col">
        <header className="flex shrink-0 items-center gap-2 border-b px-3 py-1.5">
          <h2 className="shrink-0 text-md font-semibold">Embudo</h2>
          <StageTabs
            stages={stages}
            counts={counts}
            activeStageId={activeStageId}
            onSelect={irAEtapa}
            droppable
          />
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={() => setManaging(true)}
          >
            <Settings2 /> Etapas
          </Button>
        </header>

        {/* min-h-0: sin esto el hilo crece y empuja el compositor fuera. */}
        <div className="flex min-h-0 flex-1">
          <aside className="flex w-[228px] shrink-0 flex-col border-r bg-subtle">
            <div className="min-h-0 flex-1 space-y-px overflow-y-auto p-1.5">
              {stageLeads.map((lead) => (
                <DraggableLead
                  key={lead.id}
                  lead={lead}
                  conversation={convDe(lead)}
                  selected={leadSeleccionado?.id === lead.id}
                  onOpen={() => abrirLead(lead)}
                />
              ))}
              {stageLeads.length === 0 && (
                <p className="px-2 py-6 text-center text-xs text-text-4">
                  {etapaActiva
                    ? "Sin leads en esta etapa"
                    : "Sin etapas configuradas"}
                </p>
              )}
            </div>
          </aside>

          <ConversationPane
            conversation={selected}
            messages={ws.messages}
            onSend={ws.sendText}
            onSent={() => {
              if (selectedId) void ws.refetchMessages(selectedId);
              void ws.refetchConversations();
            }}
            emptyState={
              leadSeleccionado && !selected
                ? "Este lead todavía no tiene conversación de WhatsApp."
                : "Elige un lead de la columna para ver su conversación"
            }
            headerRight={
              <>
                {leadSeleccionado && (
                  <MoveStageMenu
                    stages={stages}
                    currentStageId={leadSeleccionado.stageId}
                    onMove={(stageId) => void moverLead(leadSeleccionado.id, stageId)}
                  />
                )}
                {selected && (
                  <Link
                    href={`/inbox?contact=${selected.contact.id}`}
                    aria-label="Abrir en la bandeja"
                    title="Abrir en la bandeja"
                    className="rounded-sm border p-1 text-text-3 hover:bg-accent hover:text-foreground"
                  >
                    <MessageSquareText className="h-[15px] w-[15px]" strokeWidth={1.7} />
                  </Link>
                )}
                {!panelOpen && selected && (
                  <button
                    onClick={() => togglePanel(true)}
                    aria-label="Mostrar detalles"
                    className="rounded-sm border p-1 text-text-3 hover:bg-accent hover:text-foreground"
                  >
                    <PanelRight className="h-[15px] w-[15px]" strokeWidth={1.7} />
                  </button>
                )}
              </>
            }
          />

          <aside
            className={cn(
              "shrink-0 overflow-hidden border-l transition-[width] duration-[220ms]",
              panelOpen && selected ? "w-[280px]" : "w-0 border-l-0"
            )}
          >
            {selected && (
              <div className="h-full w-[280px]">
                <ContactPanel
                  conversation={selected}
                  refreshKey={ws.detailRev}
                  onPatchConversation={ws.patchConversation}
                  onClose={() => togglePanel(false)}
                />
              </div>
            )}
          </aside>
        </div>

        {managing && (
          <StageManager
            stages={stages}
            onClose={() => setManaging(false)}
            onChanged={() => void refetchBoard()}
          />
        )}
      </div>

      <DragOverlay>
        {activeLead ? (
          <LeadCard lead={activeLead} conversation={convDe(activeLead)} overlay />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
