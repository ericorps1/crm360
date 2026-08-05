"use client";

import { useRouter } from "next/navigation";
import { PipelineBoard } from "./pipeline-board";
import type { BoardLead } from "./lead-card";

export type { BoardLead };

/**
 * El embudo es el tablero kanban, sin vistas alternas: columnas por etapa y
 * arrastre entre ellas. Hacer clic en una tarjeta abre su conversación en la
 * Bandeja, que es donde se conversa.
 */
export function PipelineClient() {
  const router = useRouter();
  return (
    <PipelineBoard
      onOpenLead={(lead) => router.push(`/inbox?contact=${lead.contact.id}`)}
    />
  );
}
