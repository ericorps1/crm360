"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ConversationDto, MessageDto } from "@/lib/types";
import { useEvents } from "@/components/use-events";

/**
 * Motor de conversaciones: carga, selección, envío y sincronización en vivo.
 *
 * Lo comparten la Bandeja y el Embudo, que son dos disposiciones distintas
 * sobre exactamente la misma lógica. Antes vivía dentro de `InboxClient`.
 *
 * ⚠️ `useEvents` se llama AQUÍ y solo aquí. Cada llamada abre su propio
 * `EventSource`; si una pantalla lo invocara por su cuenta habría dos
 * conexiones SSE y dos suscriptores del bus por pestaña. Por eso los efectos
 * propios de cada pantalla entran por `onExternalChange`, nunca por un
 * segundo `useEvents`.
 */

export type ExternalChangeReason = "message" | "conversation" | "reconnect";

export type ConversationWorkspace = {
  conversations: ConversationDto[] | null;
  byId: Map<string, ConversationDto>;
  byContactId: Map<string, ConversationDto>;
  selectedId: string | null;
  selected: ConversationDto | null;
  messages: MessageDto[];
  /** Contador que `ContactPanel` consume como `refreshKey`. */
  detailRev: number;
  select: (conversationId: string | null) => void;
  sendText: (text: string) => Promise<string | null>;
  patchConversation: (patch: {
    aiEnabled?: boolean;
    reactivate?: boolean;
  }) => Promise<void>;
  refetchConversations: () => Promise<void>;
  refetchMessages: (conversationId: string) => Promise<void>;
};

export function useConversationWorkspace(options?: {
  /** Efecto lateral por evento SSE, para que el embudo refresque su tablero. */
  onExternalChange?: (reason: ExternalChangeReason) => void;
}): ConversationWorkspace {
  const [conversations, setConversations] = useState<ConversationDto[] | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [detailRev, setDetailRev] = useState(0);

  const selectedIdRef = useRef<string | null>(null);
  selectedIdRef.current = selectedId;

  // Mismo patrón que `handlersRef` en useEvents: se reasigna en cada render
  // para que los handlers vean siempre la versión actual sin memoizar.
  const optionsRef = useRef(options);
  optionsRef.current = options;
  const notify = useCallback((reason: ExternalChangeReason) => {
    optionsRef.current?.onExternalChange?.(reason);
  }, []);

  const refetchConversations = useCallback(async () => {
    const res = await fetch("/api/conversations").catch(() => null);
    if (!res?.ok) return;
    const data = (await res.json()) as { conversations: ConversationDto[] };
    setConversations(data.conversations);
  }, []);

  const refetchMessages = useCallback(async (conversationId: string) => {
    const res = await fetch(`/api/conversations/${conversationId}/messages`).catch(
      () => null
    );
    if (!res?.ok) return;
    const data = (await res.json()) as { messages: MessageDto[] };
    if (selectedIdRef.current === conversationId) setMessages(data.messages);
  }, []);

  useEffect(() => {
    void refetchConversations();
  }, [refetchConversations]);

  /** `null` deselecciona: el embudo lo usa al cambiar a una etapa vacía. */
  const select = useCallback(
    (id: string | null) => {
      setSelectedId(id);
      setMessages([]);
      if (!id) return;
      void refetchMessages(id);
      void fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ markRead: true }),
      });
    },
    [refetchMessages]
  );

  useEvents({
    onMessageNew: ({ conversationId, message }) => {
      if (selectedIdRef.current === conversationId) {
        const m = message as MessageDto;
        setMessages((prev) =>
          prev.some((x) => x.id === m.id) ? prev : [...prev, m]
        );
        void fetch(`/api/conversations/${conversationId}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ markRead: true }),
        });
      }
      void refetchConversations();
      // Un entrante nuevo puede crear/mover el lead: refresca el panel.
      setDetailRev((v) => v + 1);
      notify("message");
    },
    onMessageStatus: ({ conversationId, messageId, status }) => {
      if (selectedIdRef.current !== conversationId) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === messageId ? { ...m, status: status as MessageDto["status"] } : m
        )
      );
    },
    onConversationUpdated: () => {
      void refetchConversations();
      // El agente movió de etapa o cambió el handoff: refresca el panel en vivo.
      setDetailRev((v) => v + 1);
      notify("conversation");
    },
    onReconnect: () => {
      // Catch-up tras reconexión (contrato sse.md): refetch completo.
      void refetchConversations();
      if (selectedIdRef.current) void refetchMessages(selectedIdRef.current);
      setDetailRev((v) => v + 1);
      notify("reconnect");
    },
  });

  const sendText = useCallback(
    async (text: string): Promise<string | null> => {
      const id = selectedIdRef.current;
      if (!id) return "Sin conversación seleccionada";
      const res = await fetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      }).catch(() => null);
      if (!res) return "Sin conexión con el servidor";
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as {
          error?: { message?: string };
        } | null;
        return data?.error?.message ?? "No se pudo enviar el mensaje";
      }
      if (selectedIdRef.current) void refetchMessages(selectedIdRef.current);
      void refetchConversations();
      return null;
    },
    [refetchMessages, refetchConversations]
  );

  const patchConversation = useCallback(
    async (patch: { aiEnabled?: boolean; reactivate?: boolean }) => {
      const id = selectedIdRef.current;
      if (!id) return;
      await fetch(`/api/conversations/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(patch),
      }).catch(() => null);
      void refetchConversations();
    },
    [refetchConversations]
  );

  const { byId, byContactId } = useMemo(() => {
    const porId = new Map<string, ConversationDto>();
    const porContacto = new Map<string, ConversationDto>();
    for (const c of conversations ?? []) {
      porId.set(c.id, c);
      porContacto.set(c.contact.id, c);
    }
    return { byId: porId, byContactId: porContacto };
  }, [conversations]);

  const selected = selectedId ? (byId.get(selectedId) ?? null) : null;

  return {
    conversations,
    byId,
    byContactId,
    selectedId,
    selected,
    messages,
    detailRev,
    select,
    sendText,
    patchConversation,
    refetchConversations,
    refetchMessages,
  };
}
