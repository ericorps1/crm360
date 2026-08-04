"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { PanelRight } from "lucide-react";
import { cn } from "@/lib/utils";
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

  return (
    <div className="flex h-full">
      <section className="w-[300px] shrink-0 overflow-hidden border-r">
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
          !panelOpen && (
            <button
              onClick={() => togglePanel(true)}
              aria-label="Mostrar detalles"
              className="rounded-sm border p-1 text-text-3 hover:bg-accent hover:text-foreground"
            >
              <PanelRight className="h-[15px] w-[15px]" strokeWidth={1.7} />
            </button>
          )
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
