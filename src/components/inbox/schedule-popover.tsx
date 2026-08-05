"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

export type ScheduledDto = {
  id: string;
  conversationId: string;
  body: string;
  sendAt: string;
  status: "pending" | "sent" | "failed" | "canceled";
  error: string | null;
};

/**
 * Valores por defecto: mañana a las 9:00 **en la hora del operador**.
 *
 * Se calcula en el navegador a propósito. El servidor no conoce el huso de
 * quien programa, así que "mañana temprano" solo tiene sentido aquí; lo que
 * viaja al servidor es un ISO con desfase, ya sin ambigüedad.
 */
export function manianaTemprano(ahora: Date = new Date()): Date {
  const d = new Date(ahora);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

const dosDigitos = (n: number) => String(n).padStart(2, "0");

/** Fecha local en el formato que exige <input type="date">. */
function aValorFecha(d: Date): string {
  return `${d.getFullYear()}-${dosDigitos(d.getMonth() + 1)}-${dosDigitos(d.getDate())}`;
}
function aValorHora(d: Date): string {
  return `${dosDigitos(d.getHours())}:${dosDigitos(d.getMinutes())}`;
}

/** Combina los dos campos en una fecha local; `null` si están incompletos. */
export function combinar(fecha: string, hora: string): Date | null {
  if (!fecha || !hora) return null;
  const [a, m, d] = fecha.split("-").map(Number);
  const [h, min] = hora.split(":").map(Number);
  if ([a, m, d, h, min].some((n) => Number.isNaN(n))) return null;
  return new Date(a!, m! - 1, d!, h!, min!, 0, 0);
}

export function formatearCuando(iso: string): string {
  const d = new Date(iso);
  const hoy = new Date();
  const maniana = new Date(hoy);
  maniana.setDate(hoy.getDate() + 1);
  const mismoDia = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const hora = d.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
  if (mismoDia(d, hoy)) return `hoy ${hora}`;
  if (mismoDia(d, maniana)) return `mañana ${hora}`;
  return `${d.toLocaleDateString("es-MX", { day: "numeric", month: "short" })} ${hora}`;
}

export function SchedulePopover({
  conversationId,
  texto,
  pendientes,
  onProgramado,
  onCancelado,
  onCerrar,
}: {
  conversationId: string;
  texto: string;
  pendientes: ScheduledDto[];
  onProgramado: () => void;
  onCancelado: () => void;
  onCerrar: () => void;
}) {
  const porDefecto = useMemo(() => manianaTemprano(), []);
  const [fecha, setFecha] = useState(() => aValorFecha(porDefecto));
  const [hora, setHora] = useState(() => aValorHora(porDefecto));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function alTeclado(e: KeyboardEvent) {
      if (e.key === "Escape") onCerrar();
    }
    window.addEventListener("keydown", alTeclado);
    return () => window.removeEventListener("keydown", alTeclado);
  }, [onCerrar]);

  const cuando = combinar(fecha, hora);
  const enPasado = cuando !== null && cuando.getTime() <= Date.now();
  const puedeGuardar = texto.trim().length > 0 && cuando !== null && !enPasado;

  async function programar() {
    if (!cuando || !puedeGuardar) return;
    setGuardando(true);
    setError(null);
    const res = await fetch("/api/scheduled", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversationId,
        body: texto.trim(),
        sendAt: cuando.toISOString(),
      }),
    }).catch(() => null);
    setGuardando(false);
    if (!res?.ok) {
      const data = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(data?.error?.message ?? "No se pudo programar");
      return;
    }
    onProgramado();
  }

  async function cancelar(id: string) {
    await fetch(`/api/scheduled/${id}`, { method: "DELETE" }).catch(() => null);
    onCancelado();
  }

  return (
    <>
      <div className="fixed inset-0 z-20" onClick={onCerrar} />
      <div className="absolute bottom-full right-0 z-30 mb-1.5 w-[290px] rounded-md border bg-card p-2.5 shadow-pop">
        <div className="mb-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-xs font-semibold">
            <CalendarClock className="h-3.5 w-3.5 text-brand" strokeWidth={2} />
            Programar envío
          </span>
          <button
            onClick={onCerrar}
            aria-label="Cerrar"
            className="rounded-sm p-0.5 text-text-3 hover:bg-accent hover:text-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="flex gap-1.5">
          <input
            type="date"
            value={fecha}
            min={aValorFecha(new Date())}
            onChange={(e) => setFecha(e.target.value)}
            className="h-[var(--control-h)] flex-1 rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand-soft"
          />
          <input
            type="time"
            value={hora}
            onChange={(e) => setHora(e.target.value)}
            className="h-[var(--control-h)] w-[92px] rounded-md border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-brand focus-visible:ring-[3px] focus-visible:ring-brand-soft"
          />
        </div>

        <p className="mt-1.5 text-2xs text-text-3">
          {enPasado
            ? "Esa hora ya pasó."
            : cuando
              ? `Se enviará ${formatearCuando(cuando.toISOString())}.`
              : "Elige fecha y hora."}
        </p>

        {!texto.trim() && (
          <p className="mt-1 text-2xs text-warning-ink">
            Escribe el mensaje antes de programarlo.
          </p>
        )}
        {error && <p className="mt-1 text-2xs text-destructive">{error}</p>}

        <Button
          size="sm"
          className="mt-2 w-full"
          disabled={!puedeGuardar || guardando}
          onClick={() => void programar()}
        >
          {guardando ? "Programando…" : "Programar"}
        </Button>

        {pendientes.length > 0 && (
          <div className="mt-2.5 border-t pt-2">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wider text-text-4">
              Programados ({pendientes.length})
            </p>
            <ul className="max-h-[120px] space-y-1 overflow-y-auto">
              {pendientes.map((p) => (
                <li
                  key={p.id}
                  className="flex items-start gap-1.5 rounded-sm bg-subtle px-1.5 py-1"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-2xs font-medium text-brand">
                      {formatearCuando(p.sendAt)}
                    </span>
                    <span className="block truncate text-2xs text-text-3">
                      {p.body}
                    </span>
                  </span>
                  <button
                    onClick={() => void cancelar(p.id)}
                    aria-label="Cancelar envío programado"
                    className={cn(
                      "shrink-0 rounded-sm p-0.5 text-text-3",
                      "hover:bg-danger-surface hover:text-danger-ink"
                    )}
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </>
  );
}
