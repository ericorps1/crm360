"use client";

import { useRef } from "react";
import { useDroppable } from "@dnd-kit/core";
import { ChevronLeft, ChevronRight, Trophy, XCircle } from "lucide-react";
import type { StageDto } from "@/lib/types";
import { toneClass } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

/** Prefijo de los droppables. Distingue una pestaña de cualquier otro id. */
export const TAB_DROP_PREFIX = "tab:";

/**
 * Pestañas de etapa del embudo.
 *
 * Al pasar de kanban a vista dividida se pierde la panorámica de "cuántos leads
 * hay en cada etapa"; el contador de cada pestaña es lo que la recupera.
 *
 * Cada pestaña es además zona de suelte: se arrastra una tarjeta desde la
 * columna y se deja caer aquí para mover el lead de etapa.
 */
export function StageTabs({
  stages,
  counts,
  activeStageId,
  onSelect,
  droppable = false,
}: {
  stages: StageDto[];
  counts: Record<string, number>;
  activeStageId: string | null;
  onSelect: (stageId: string) => void;
  droppable?: boolean;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const index = stages.findIndex((s) => s.id === activeStageId);

  function mover(delta: -1 | 1) {
    const destino = stages[index + delta];
    if (destino) onSelect(destino.id);
  }

  return (
    <div className="flex min-w-0 flex-1 items-center gap-1">
      <button
        type="button"
        aria-label="Etapa anterior"
        disabled={index <= 0}
        onClick={() => mover(-1)}
        className="shrink-0 rounded-sm p-0.5 text-text-3 hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft className="h-4 w-4" strokeWidth={1.8} />
      </button>

      <div
        ref={listRef}
        role="tablist"
        aria-label="Etapas del embudo"
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto"
        onKeyDown={(e) => {
          if (e.key === "ArrowLeft") {
            e.preventDefault();
            mover(-1);
          } else if (e.key === "ArrowRight") {
            e.preventDefault();
            mover(1);
          }
        }}
      >
        {stages.map((stage) => (
          <StageTab
            key={stage.id}
            stage={stage}
            count={counts[stage.id] ?? 0}
            active={stage.id === activeStageId}
            onSelect={onSelect}
            droppable={droppable}
          />
        ))}
      </div>

      <button
        type="button"
        aria-label="Etapa siguiente"
        disabled={index < 0 || index >= stages.length - 1}
        onClick={() => mover(1)}
        className="shrink-0 rounded-sm p-0.5 text-text-3 hover:bg-accent hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight className="h-4 w-4" strokeWidth={1.8} />
      </button>
    </div>
  );
}

function StageTab({
  stage,
  count,
  active,
  onSelect,
  droppable,
}: {
  stage: StageDto;
  count: number;
  active: boolean;
  onSelect: (stageId: string) => void;
  droppable: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${TAB_DROP_PREFIX}${stage.id}`,
    disabled: !droppable,
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      role="tab"
      aria-selected={active}
      tabIndex={active ? 0 : -1}
      onClick={() => onSelect(stage.id)}
      className={cn(
        "badge-etapa shrink-0 transition-all",
        stage.kind !== "open" && "sin-punto",
        toneClass(stage.tone),
        active ? "ring-1 ring-brand" : "opacity-60 hover:opacity-100",
        // Al arrastrar encima, la pestaña se marca como destino válido.
        isOver && "ring-2 ring-brand ring-offset-1 ring-offset-background"
      )}
    >
      {stage.kind === "won" && <Trophy className="h-3 w-3 shrink-0" />}
      {stage.kind === "lost" && <XCircle className="h-3 w-3 shrink-0" />}
      <span className="max-w-[120px] truncate">{stage.name}</span>
      <span className="tabular-nums opacity-70">{count}</span>
    </button>
  );
}
