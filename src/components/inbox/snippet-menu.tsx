"use client";

import { useEffect, useRef } from "react";
import { FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Menú que se abre al teclear `#` en el compositor.
 *
 * Unifica las dos cosas que el agente puede insertar, para que no tenga que
 * pensar en cuál toca:
 *   · `quick` — respuesta rápida interna. Pega texto en el compositor, editable
 *     antes de enviar. Solo sirve DENTRO de la ventana de 24 h.
 *   · `meta`  — plantilla aprobada por Meta. No pega texto: se envía como
 *     plantilla, que es lo único que Meta acepta fuera de la ventana.
 */

export type SnippetItem =
  | {
      kind: "quick";
      id: string;
      label: string;
      body: string;
      preview: string;
    }
  | {
      kind: "meta";
      id: string;
      label: string;
      body: string;
      preview: string;
      needsVariable: boolean;
    };

export function SnippetMenu({
  items,
  activeIndex,
  windowOpen,
  onPick,
  onHover,
}: {
  items: SnippetItem[];
  activeIndex: number;
  windowOpen: boolean;
  onPick: (item: SnippetItem) => void;
  onHover: (index: number) => void;
}) {
  const listRef = useRef<HTMLUListElement>(null);

  // Mantiene visible el elemento activo al navegar con las flechas.
  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLElement>(
      `[data-index="${activeIndex}"]`
    );
    el?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  return (
    <div className="absolute bottom-full left-0 right-0 z-30 mb-1.5 overflow-hidden rounded-md border bg-card shadow-pop">
      {!windowOpen && (
        <p className="border-b bg-warning-surface px-2.5 py-1.5 text-2xs text-warning-ink">
          Ventana de 24 h cerrada: solo plantillas aprobadas por Meta.
        </p>
      )}

      {items.length === 0 ? (
        <p className="px-2.5 py-3 text-center text-xs text-text-3">
          Sin coincidencias
        </p>
      ) : (
        <ul ref={listRef} role="listbox" className="max-h-[220px] overflow-y-auto p-1">
          {items.map((item, i) => {
            const activo = i === activeIndex;
            return (
              <li key={`${item.kind}:${item.id}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={activo}
                  data-index={i}
                  onMouseEnter={() => onHover(i)}
                  // onMouseDown, no onClick: el click roba el foco del textarea
                  // y el menú se cerraría antes de insertar nada.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onPick(item);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 rounded-sm px-1.5 py-1 text-left transition-colors",
                    activo ? "bg-brand-tint" : "hover:bg-accent"
                  )}
                >
                  {item.kind === "quick" ? (
                    <Zap
                      className="mt-px h-3 w-3 shrink-0 text-brand"
                      strokeWidth={2}
                    />
                  ) : (
                    <FileText
                      className="mt-px h-3 w-3 shrink-0 text-text-3"
                      strokeWidth={2}
                    />
                  )}
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-medium">
                        {item.label}
                      </span>
                      {item.kind === "meta" && (
                        <span className="shrink-0 rounded-[3px] border px-1 text-2xs text-text-3">
                          Meta
                        </span>
                      )}
                    </span>
                    <span className="block truncate text-2xs text-text-3">
                      {item.preview}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <p className="border-t px-2.5 py-1 text-2xs text-text-4">
        ↑↓ navegar · ↵ insertar · esc salir
      </p>
    </div>
  );
}
