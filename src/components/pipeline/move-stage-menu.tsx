"use client";

import { useState } from "react";
import { Check, ChevronDown, Trophy, XCircle } from "lucide-react";
import type { StageDto } from "@/lib/types";
import { toneClass } from "@/lib/stage-colors";
import { cn } from "@/lib/utils";

/**
 * Menú "Mover a…" en el encabezado de la conversación.
 *
 * No es un extra del arrastre: el tablero usa `PointerSensor` sin
 * `KeyboardSensor`, así que arrastrar solo funciona con puntero. Este menú es
 * el camino accesible y el único que sirve en pantalla táctil.
 */
export function MoveStageMenu({
  stages,
  currentStageId,
  onMove,
}: {
  stages: StageDto[];
  currentStageId: string | null;
  onMove: (stageId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const actual = stages.find((s) => s.id === currentStageId) ?? null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className={cn(
          "badge-etapa transition-opacity hover:opacity-80",
          actual ? toneClass(actual.tone) : "tono-gris"
        )}
      >
        {actual?.kind === "won" && <Trophy className="h-3 w-3 shrink-0" />}
        {actual?.kind === "lost" && <XCircle className="h-3 w-3 shrink-0" />}
        <span className="max-w-[110px] truncate">
          {actual?.name ?? "Sin etapa"}
        </span>
        <ChevronDown className="h-3 w-3 shrink-0 opacity-70" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setOpen(false)} />
          <ul
            role="listbox"
            className="absolute right-0 top-6 z-30 max-h-[280px] w-48 overflow-y-auto rounded-md border bg-card p-1 shadow-pop"
          >
            {stages.map((s) => {
              const activa = s.id === currentStageId;
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={activa}
                    onClick={() => {
                      if (!activa) onMove(s.id);
                      setOpen(false);
                    }}
                    className="flex w-full items-center gap-1.5 rounded-sm px-1.5 py-1 text-left hover:bg-accent"
                  >
                    <span
                      className={cn(
                        "badge-etapa min-w-0 flex-1",
                        toneClass(s.tone)
                      )}
                    >
                      {s.kind === "won" && <Trophy className="h-3 w-3 shrink-0" />}
                      {s.kind === "lost" && <XCircle className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{s.name}</span>
                    </span>
                    {activa && (
                      <Check className="h-3 w-3 shrink-0 text-brand" strokeWidth={2.5} />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
