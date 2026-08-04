"use client";

import type { ReactNode } from "react";
import type { ConversationDto, MessageDto } from "@/lib/types";
import { formatPhone } from "@/lib/utils";
import { ContactAvatar } from "@/components/avatar";
import { MessageThread } from "./message-thread";
import { Composer } from "./composer";

/**
 * Conversación completa: encabezado + hilo + compositor.
 *
 * La usan la Bandeja y el Embudo. Lo que cambia entre pantallas entra por
 * `headerRight` (botones del encabezado) y `emptyState` (qué mostrar sin
 * conversación seleccionada).
 *
 * ⚠️ `min-h-0` en el contenedor del hilo es obligatorio: `MessageThread` es
 * `flex-1 overflow-y-auto`, y sin eso crece hasta empujar el compositor fuera
 * de la pantalla.
 */
export function ConversationPane({
  conversation,
  messages,
  onSend,
  onSent,
  headerRight,
  emptyState,
}: {
  conversation: ConversationDto | null;
  messages: MessageDto[];
  onSend: (text: string) => Promise<string | null>;
  onSent: () => void;
  headerRight?: ReactNode;
  emptyState?: ReactNode;
}) {
  if (!conversation) {
    return (
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center bg-chat px-6 text-center text-sm text-text-3">
        {emptyState ?? "Elige una conversación para ver el hilo"}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-2 border-b bg-background px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <ContactAvatar
            name={conversation.contact.name}
            seed={conversation.contact.id}
            size="md"
          />
          <div className="min-w-0">
            <p className="truncate text-md font-[650] leading-tight">
              {conversation.contact.name}
            </p>
            <p
              className={
                conversation.windowOpen
                  ? "text-2xs font-medium text-success"
                  : "text-2xs text-text-3"
              }
            >
              {conversation.windowOpen
                ? "ventana abierta"
                : formatPhone(conversation.contact.phone)}
            </p>
          </div>
        </div>
        {headerRight ? (
          <div className="flex shrink-0 items-center gap-1">{headerRight}</div>
        ) : null}
      </header>

      <MessageThread messages={messages} />

      <Composer conversation={conversation} onSend={onSend} onSent={onSent} />
    </div>
  );
}
