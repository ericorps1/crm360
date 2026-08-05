"use client";

import { useDraggable } from "@dnd-kit/core";
import type { ConversationDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "@/components/avatar";
import { formatTime, previewText } from "@/components/inbox/helpers";

export type BoardLead = {
  id: string;
  stageId: string;
  position: number;
  lastActivityAt: string | null;
  contact: { id: string; name: string; phone: string | null };
  conversationId: string | null;
};

/**
 * Tarjeta de lead en la columna del embudo.
 *
 * Dos líneas y ~52px de alto: en la vista dividida la columna es angosta y lo
 * que importa es escanear rápido a quién le falta respuesta.
 *
 * `conversation` puede venir en `null`: el tablero y las conversaciones son dos
 * fetches distintos, así que hay un instante en que el lead existe y su
 * conversación todavía no llegó. La tarjeta tiene que verse bien igual.
 */
export function LeadCard({
  lead,
  conversation,
  selected = false,
  overlay = false,
}: {
  lead: BoardLead;
  conversation: ConversationDto | null;
  selected?: boolean;
  overlay?: boolean;
}) {
  const noLeidos = conversation?.unreadCount ?? 0;

  return (
    <div
      className={cn(
        "w-full cursor-grab select-none rounded-sm border px-2 py-1.5 text-left transition-colors",
        selected
          ? "border-brand bg-brand-tint"
          : "border-transparent bg-card hover:bg-accent",
        overlay && "rotate-2 border-border shadow-pop"
      )}
    >
      <div className="flex items-center gap-2">
        <span className="relative shrink-0">
          <ContactAvatar name={lead.contact.name} seed={lead.contact.id} size="sm" />
          {conversation?.windowOpen && (
            <span
              className="absolute -bottom-px -right-px h-2 w-2 rounded-full border-2 border-background bg-success"
              aria-label="ventana abierta"
            />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline justify-between gap-1.5">
            <span
              className={cn(
                "truncate text-sm",
                noLeidos > 0 ? "font-[680]" : "font-medium"
              )}
            >
              {lead.contact.name}
            </span>
            <span
              className={cn(
                "shrink-0 text-2xs tabular-nums",
                noLeidos > 0 ? "font-semibold text-brand" : "text-text-3"
              )}
            >
              {formatTime(conversation?.lastMessageAt ?? lead.lastActivityAt)}
            </span>
          </span>
          <span className="mt-px flex items-center justify-between gap-1.5">
            <span className="truncate text-2xs text-text-3">
              {conversation
                ? previewText(conversation.preview)
                : "Sin conversación"}
            </span>
            {noLeidos > 0 && (
              <span className="pastilla shrink-0 bg-brand text-white">
                {noLeidos}
              </span>
            )}
          </span>
        </span>
      </div>
    </div>
  );
}

/** Envoltorio arrastrable. El drag se suelta sobre una pestaña de etapa. */
export function DraggableLead({
  lead,
  conversation,
  selected,
  onOpen,
}: {
  lead: BoardLead;
  conversation: ConversationDto | null;
  selected: boolean;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: lead.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onOpen();
        }
      }}
      className={cn("outline-none", isDragging && "opacity-40")}
    >
      <LeadCard lead={lead} conversation={conversation} selected={selected} />
    </div>
  );
}
