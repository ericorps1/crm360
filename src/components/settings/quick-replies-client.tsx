"use client";

import { useEffect, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import {
  invalidVariables,
  normalizeShortcut,
  renderQuickReply,
  VARIABLES,
  type QuickReplyDto,
} from "@/lib/quick-replies";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** Contacto ficticio para la vista previa de variables. */
const EJEMPLO = {
  nombre: "María Fernanda López",
  telefono: "5215512345678",
  etapa: "Interesado",
};

export function QuickRepliesClient() {
  const [items, setItems] = useState<QuickReplyDto[] | null>(null);
  const [shortcut, setShortcut] = useState("");
  const [body, setBody] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refetch() {
    const res = await fetch("/api/quick-replies").catch(() => null);
    if (!res?.ok) return setItems([]);
    const d = (await res.json()) as { quickReplies: QuickReplyDto[] };
    setItems(d.quickReplies);
  }

  useEffect(() => {
    void refetch();
  }, []);

  async function crear() {
    setSaving(true);
    setError(null);
    const res = await fetch("/api/quick-replies", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ shortcut, body }),
    }).catch(() => null);
    setSaving(false);
    if (!res?.ok) {
      const d = (await res?.json().catch(() => null)) as {
        error?: { message?: string };
      } | null;
      setError(d?.error?.message ?? "No se pudo guardar");
      return;
    }
    setShortcut("");
    setBody("");
    void refetch();
  }

  async function eliminar(id: string) {
    await fetch(`/api/quick-replies/${id}`, { method: "DELETE" }).catch(() => null);
    void refetch();
  }

  const atajoNormalizado = normalizeShortcut(shortcut);
  const invalidas = invalidVariables(body);
  const puedeGuardar =
    atajoNormalizado.length > 0 && body.trim().length > 0 && invalidas.length === 0;

  return (
    <div className="max-w-2xl space-y-3">
      <div className="rounded-md border p-[var(--pane-pad)]">
        <p className="text-sm text-text-2">
          Fragmentos de texto que se insertan escribiendo{" "}
          <code className="rounded-[3px] border bg-subtle px-1 text-xs">#atajo</code>{" "}
          en el compositor. Son internas: no necesitan aprobación de Meta, pero
          solo funcionan dentro de la ventana de 24 horas.
        </p>
        <p className="mt-2 flex flex-wrap items-center gap-1 text-xs text-text-3">
          Variables:
          {VARIABLES.map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setBody((b) => `${b}{{${v}}}`)}
              className="rounded-[3px] border bg-subtle px-1 font-mono text-2xs hover:bg-accent"
              title="Insertar en el cuerpo"
            >
              {`{{${v}}}`}
            </button>
          ))}
        </p>
      </div>

      <div className="space-y-2 rounded-md border p-[var(--pane-pad)]">
        <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
          <div className="space-y-1">
            <Label htmlFor="qr-shortcut">Atajo</Label>
            <Input
              id="qr-shortcut"
              value={shortcut}
              placeholder="saludo-inicial"
              onChange={(e) => setShortcut(e.target.value)}
            />
            {shortcut && atajoNormalizado !== shortcut.trim().toLowerCase() && (
              <p className="text-2xs text-text-3">
                Se guardará como <b>#{atajoNormalizado}</b>
              </p>
            )}
          </div>
          <div className="space-y-1">
            <Label htmlFor="qr-body">Mensaje</Label>
            <Textarea
              id="qr-body"
              rows={3}
              value={body}
              placeholder="¡Hola {{nombre}}! ¿En qué te puedo ayudar?"
              onChange={(e) => setBody(e.target.value)}
            />
          </div>
        </div>

        {body.trim() && (
          <div className="rounded-md border bg-subtle p-2">
            <p className="mb-1 text-2xs font-semibold uppercase tracking-wide text-text-4">
              Vista previa
            </p>
            <p className="whitespace-pre-wrap text-sm text-text-2">
              {renderQuickReply(body, EJEMPLO)}
            </p>
          </div>
        )}

        {invalidas.length > 0 && (
          <p className="text-xs text-destructive">
            Variables desconocidas: {invalidas.map((v) => `{{${v}}}`).join(", ")}
          </p>
        )}
        {error && <p className="text-xs text-destructive">{error}</p>}

        <Button disabled={!puedeGuardar || saving} onClick={() => void crear()}>
          <Plus /> {saving ? "Guardando…" : "Guardar respuesta"}
        </Button>
      </div>

      <div className="rounded-md border">
        {items === null ? (
          <p className="p-4 text-center text-xs text-text-3">Cargando…</p>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-xs text-text-3">
            Todavía no hay respuestas rápidas.
          </p>
        ) : (
          <ul className="divide-y">
            {items.map((q) => (
              <li key={q.id} className="flex items-start gap-2 p-2.5">
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5">
                    <code className="rounded-[3px] border bg-subtle px-1 text-xs font-medium">
                      #{q.shortcut}
                    </code>
                    <span className="text-2xs text-text-4">
                      {q.usageCount} {q.usageCount === 1 ? "uso" : "usos"}
                    </span>
                  </span>
                  <span className="mt-0.5 block whitespace-pre-wrap text-sm text-text-2">
                    {q.body}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Eliminar #${q.shortcut}`}
                  onClick={() => void eliminar(q.id)}
                >
                  <Trash2 />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
