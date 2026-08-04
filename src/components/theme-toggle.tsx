"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";

export type Tema = "light" | "dark" | "system";

const CLAVE = "crm360.theme";

/** Aplica el tema al <html>. "system" quita el atributo y deja mandar al SO. */
export function aplicarTema(tema: Tema) {
  const raiz = document.documentElement;
  if (tema === "system") raiz.removeAttribute("data-theme");
  else raiz.setAttribute("data-theme", tema);
}

/**
 * Script que corre ANTES del primer pintado: sin esto la página aparece en
 * claro y salta a oscuro (el "flash blanco"). Va inline en el <head>.
 */
export const SCRIPT_ANTI_PARPADEO = `(function(){try{var t=localStorage.getItem(${JSON.stringify(
  CLAVE
)});if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t)}}catch(e){}})();`;

const OPCIONES: { valor: Tema; icono: typeof Sun; etiqueta: string }[] = [
  { valor: "light", icono: Sun, etiqueta: "Claro" },
  { valor: "dark", icono: Moon, etiqueta: "Oscuro" },
  { valor: "system", icono: Monitor, etiqueta: "Sistema" },
];

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [tema, setTema] = useState<Tema>("system");
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    const guardado = localStorage.getItem(CLAVE) as Tema | null;
    if (guardado === "dark" || guardado === "light") setTema(guardado);
    setMontado(true);
  }, []);

  function elegir(nuevo: Tema) {
    setTema(nuevo);
    aplicarTema(nuevo);
    if (nuevo === "system") localStorage.removeItem(CLAVE);
    else localStorage.setItem(CLAVE, nuevo);
  }

  // Antes de montar no sabemos el tema real: se renderiza neutro para no
  // provocar un desajuste de hidratación.
  return (
    <div
      className={cn(
        "flex items-center gap-0.5 rounded-md border border-border bg-subtle p-0.5",
        compact && "scale-95"
      )}
      role="group"
      aria-label="Tema de la interfaz"
    >
      {OPCIONES.map(({ valor, icono: Icono, etiqueta }) => {
        const activo = montado && tema === valor;
        return (
          <button
            key={valor}
            type="button"
            title={etiqueta}
            aria-label={etiqueta}
            aria-pressed={activo}
            onClick={() => elegir(valor)}
            className={cn(
              "rounded p-1.5 transition-colors",
              activo
                ? "bg-brand-soft text-brand-text"
                : "text-text-3 hover:bg-accent hover:text-foreground"
            )}
          >
            <Icono className="h-3.5 w-3.5" />
          </button>
        );
      })}
    </div>
  );
}
