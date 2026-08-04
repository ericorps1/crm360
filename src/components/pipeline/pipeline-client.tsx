"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Kanban, MessagesSquare } from "lucide-react";
import { cn } from "@/lib/utils";
import { PipelineBoard } from "./pipeline-board";
import { PipelineSplit } from "./pipeline-split";
import type { BoardLead } from "./lead-card";

export type { BoardLead };

type Vista = "board" | "split";
const CLAVE_VISTA = "crm360.pipeline.view";

/**
 * El embudo tiene dos vistas sobre los mismos datos:
 *
 *   · Tablero (por defecto) — el kanban de columnas de siempre, densificado.
 *   · Conversación — una etapa a la vez con el hilo de WhatsApp integrado.
 *
 * Hacer clic en una tarjeta del tablero abre su conversación en la otra vista;
 * el conmutador del encabezado regresa. La preferencia se recuerda.
 */
export function PipelineClient() {
  const router = useRouter();
  const [vista, setVista] = useState<Vista>("board");

  useEffect(() => {
    if (localStorage.getItem(CLAVE_VISTA) === "split") setVista("split");
  }, []);

  const cambiar = useCallback((v: Vista) => {
    setVista(v);
    localStorage.setItem(CLAVE_VISTA, v);
  }, []);

  const abrirLeadEnConversacion = useCallback(
    (lead: BoardLead) => {
      // La vista de conversación lee ?stage= y ?contact= de la URL.
      router.replace(`/pipeline?stage=${lead.stageId}&contact=${lead.contact.id}`, {
        scroll: false,
      });
      cambiar("split");
    },
    [router, cambiar]
  );

  const switcher = <ViewSwitcher vista={vista} onChange={cambiar} />;

  return vista === "board" ? (
    <PipelineBoard viewSwitcher={switcher} onOpenLead={abrirLeadEnConversacion} />
  ) : (
    <PipelineSplit viewSwitcher={switcher} />
  );
}

function ViewSwitcher({
  vista,
  onChange,
}: {
  vista: Vista;
  onChange: (v: Vista) => void;
}) {
  const opciones = [
    { id: "board" as const, icono: Kanban, etiqueta: "Tablero" },
    { id: "split" as const, icono: MessagesSquare, etiqueta: "Conversación" },
  ];
  return (
    <div
      role="group"
      aria-label="Vista del embudo"
      className="flex shrink-0 items-center gap-0.5 rounded-md border bg-subtle p-0.5"
    >
      {opciones.map(({ id, icono: Icono, etiqueta }) => (
        <button
          key={id}
          type="button"
          title={etiqueta}
          aria-label={etiqueta}
          aria-pressed={vista === id}
          onClick={() => onChange(id)}
          className={cn(
            "rounded-sm p-1 transition-colors",
            vista === id
              ? "bg-brand-soft text-brand-text"
              : "text-text-3 hover:bg-accent hover:text-foreground"
          )}
        >
          <Icono className="h-3.5 w-3.5" strokeWidth={1.8} />
        </button>
      ))}
    </div>
  );
}
