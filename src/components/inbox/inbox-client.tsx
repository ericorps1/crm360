"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PanelRight } from "lucide-react";
import type { StageDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { MoveStageMenu } from "@/components/pipeline/move-stage-menu";
import { ConversationList } from "./conversation-list";
import { ContactPanel } from "./contact-panel";
import { ConversationPane } from "./conversation-pane";
import { useConversationWorkspace } from "./use-conversation-workspace";

export function InboxClient() {
  const ws = useConversationWorkspace();
  const [panelOpen, setPanelOpen] = useState(true);

  useEffect(() => {
    setPanelOpen(localStorage.getItem("crm360.panelOpen") !== "false");
  }, []);
  const togglePanel = useCallback((open: boolean) => {
    setPanelOpen(open);
    localStorage.setItem("crm360.panelOpen", String(open));
  }, []);

  // Enlace directo desde Contactos/Embudo: /inbox?contact=<id>
  const searchParams = useSearchParams();
  const contactParam = searchParams.get("contact");
  const yaAplicado = useRef(false);
  useEffect(() => {
    if (!contactParam || yaAplicado.current) return;
    const match = ws.byContactId.get(contactParam);
    if (match) {
      yaAplicado.current = true;
      ws.select(match.id);
    }
  }, [contactParam, ws]);

  const { selected, refetchConversations, refetchMessages, selectedId } = ws;

  // Estatus del lead de la conversación abierta, para el selector del
  // encabezado. Las etapas se cargan una vez; el lead, al cambiar de
  // conversación y con cada evento en vivo (detailRev).
  const [stages, setStages] = useState<StageDto[]>([]);
  const [leadInfo, setLeadInfo] = useState<{
    leadId: string;
    stageId: string | null;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/pipeline/stages")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { stages?: StageDto[] } | null) => {
        if (!cancelled && d?.stages) setStages(d.stages);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const contactId = selected?.contact.id ?? null;
  useEffect(() => {
    if (!contactId) {
      setLeadInfo(null);
      return;
    }
    let cancelled = false;
    fetch(`/api/contacts/${contactId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (d: { stage?: { id: string } | null; lead?: { id: string } | null } | null) => {
          if (cancelled) return;
          setLeadInfo(
            d?.lead ? { leadId: d.lead.id, stageId: d.stage?.id ?? null } : null
          );
        }
      )
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [contactId, ws.detailRev]);

  const moverEtapa = useCallback(
    async (stageId: string) => {
      if (!leadInfo) return;
      // Optimista: el badge cambia de inmediato; SSE confirma después.
      setLeadInfo({ ...leadInfo, stageId });
      await fetch(`/api/pipeline/leads/${leadInfo.leadId}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ stageId, position: 0 }),
      }).catch(() => null);
      void refetchConversations();
    },
    [leadInfo, refetchConversations]
  );

  return (
    <div className="flex h-full">
      <section className="w-[280px] shrink-0 overflow-hidden border-r">
        <ConversationList
          conversations={ws.conversations}
          selectedId={selectedId}
          onSelect={ws.select}
          onSeeded={() => void refetchConversations()}
        />
      </section>

      <ConversationPane
        conversation={selected}
        messages={ws.messages}
        onSend={ws.sendText}
        onSent={() => {
          if (selectedId) void refetchMessages(selectedId);
          void refetchConversations();
        }}
        headerRight={
          <>
            {leadInfo && (
              <MoveStageMenu
                stages={stages}
                currentStageId={leadInfo.stageId}
                onMove={(stageId) => void moverEtapa(stageId)}
              />
            )}
            {!panelOpen && (
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

      <section
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
      </section>
    </div>
  );
}
