"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Trash2 } from "lucide-react";
import type { StageDto } from "@/lib/types";
import {
  STAGE_TONES,
  TONE_ORDER,
  toneClass,
  toneLabel,
  type StageToneKey,
} from "@/lib/stage-colors";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Selector de tono: se abre al hacer clic en el punto de color.
 * Ocho opciones fijas, sin hex libre, para que el tablero no se desarme.
 */
function TonePicker({
  stage,
  onPick,
}: {
  stage: StageDto;
  onPick: (tone: StageToneKey) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        aria-label={`Color de la etapa: ${toneLabel(stage.tone)}`}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-md border transition-transform hover:scale-105",
          toneClass(stage.tone)
        )}
        style={{
          background: "color-mix(in oklab, var(--tono-ink) 14%, transparent)",
          borderColor: "color-mix(in oklab, var(--tono-ink) 30%, transparent)",
        }}
      >
        <span className="cuadro-etapa" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-9 z-20 grid w-40 grid-cols-4 gap-1.5 rounded-md border bg-card p-2 shadow-pop">
            {TONE_ORDER.map((key) => {
              const activo = key === stage.tone;
              return (
                <button
                  key={key}
                  type="button"
                  title={STAGE_TONES[key]}
                  aria-label={STAGE_TONES[key]}
                  onClick={() => {
                    onPick(key);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded border transition-transform hover:scale-110",
                    toneClass(key),
                    activo && "ring-2 ring-offset-1 ring-offset-card"
                  )}
                  style={{
                    background: "color-mix(in oklab, var(--tono-ink) 14%, transparent)",
                    borderColor: "color-mix(in oklab, var(--tono-ink) 30%, transparent)",
                    ...(activo ? { boxShadow: "inset 0 0 0 1px var(--tono-ink)" } : {}),
                  }}
                >
                  <span className="cuadro-etapa" />
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

/** Gestión de etapas: renombrar, reordenar, agregar, eliminar (con reasignación). */
export function StageManager({
  stages,
  onClose,
  onChanged,
}: {
  stages: StageDto[];
  onClose: () => void;
  onChanged: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [deleting, setDeleting] = useState<StageDto | null>(null);
  const [moveTo, setMoveTo] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function rename(stage: StageDto, name: string) {
    if (!name.trim() || name === stage.name) return;
    await fetch(`/api/pipeline/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: name.trim() }),
    }).catch(() => null);
    onChanged();
  }

  async function move(stage: StageDto, dir: -1 | 1) {
    const sorted = [...stages].sort((a, b) => a.position - b.position);
    const idx = sorted.findIndex((s) => s.id === stage.id);
    const swap = sorted[idx + dir];
    if (!swap) return;
    await Promise.all([
      fetch(`/api/pipeline/stages/${stage.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ position: swap.position }),
      }),
      fetch(`/api/pipeline/stages/${swap.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ position: stage.position }),
      }),
    ]).catch(() => null);
    onChanged();
  }

  async function add() {
    if (!newName.trim()) return;
    await fetch("/api/pipeline/stages", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: newName.trim() }),
    }).catch(() => null);
    setNewName("");
    onChanged();
  }

  async function setTone(stage: StageDto, tone: StageToneKey) {
    if (tone === stage.tone) return;
    await fetch(`/api/pipeline/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ tone }),
    }).catch(() => null);
    onChanged();
  }

  async function remove(stage: StageDto, moveToId: string | null) {
    setError(null);
    const url = moveToId
      ? `/api/pipeline/stages/${stage.id}?moveTo=${moveToId}`
      : `/api/pipeline/stages/${stage.id}`;
    const res = await fetch(url, { method: "DELETE" }).catch(() => null);
    if (!res) return;
    if (res.status === 409) {
      const data = (await res.json().catch(() => null)) as {
        error?: { code?: string; message?: string };
      } | null;
      if (data?.error?.code === "stage_has_leads") {
        setDeleting(stage);
        return;
      }
      setError(data?.error?.message ?? "No se pudo eliminar");
      return;
    }
    setDeleting(null);
    setMoveTo("");
    onChanged();
  }

  const sorted = [...stages].sort((a, b) => a.position - b.position);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-lg border bg-card p-3 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 font-semibold">Etapas del embudo</h3>
        <ul className="space-y-2">
          {sorted.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2">
              <TonePicker stage={s} onPick={(t) => void setTone(s, t)} />
              <Input
                defaultValue={s.name}
                onBlur={(e) => void rename(s, e.target.value)}
                className="flex-1"
              />
              {s.kind !== "open" ? (
                <Badge variant={s.kind === "won" ? "success" : "secondary"}>
                  {s.kind === "won" ? "ganado" : "perdido"}
                </Badge>
              ) : (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Eliminar etapa"
                  onClick={() => void remove(s, null)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
              <Button
                variant="ghost"
                size="icon"
                disabled={i === 0}
                aria-label="Subir"
                onClick={() => void move(s, -1)}
              >
                <ArrowUp className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                disabled={i === sorted.length - 1}
                aria-label="Bajar"
                onClick={() => void move(s, 1)}
              >
                <ArrowDown className="h-4 w-4" />
              </Button>
            </li>
          ))}
        </ul>

        {deleting && (
          <div className="mt-4 rounded-md border border-warning-line bg-warning-surface p-3">
            <p className="flex flex-wrap items-center gap-1 text-sm text-warning-ink">
              <span className={cn("badge-etapa", toneClass(deleting.tone))}>
                {deleting.name}
              </span>
              tiene tarjetas. Elige a dónde moverlas:
            </p>
            {/* Botones y no un <select>: un <option> no admite badge, y el
                nombre de una etapa siempre se muestra con su color. */}
            <div className="mt-2 flex flex-wrap gap-1">
              {sorted
                .filter((s) => s.id !== deleting.id)
                .map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={moveTo === s.id}
                    onClick={() => setMoveTo(s.id)}
                    className={cn(
                      "badge-etapa transition-opacity",
                      toneClass(s.tone),
                      moveTo === s.id
                        ? "ring-1 ring-brand"
                        : "opacity-70 hover:opacity-100"
                    )}
                  >
                    {s.name}
                  </button>
                ))}
            </div>
            <Button
              variant="destructive"
              size="sm"
              className="mt-2"
              disabled={!moveTo}
              onClick={() => void remove(deleting, moveTo)}
            >
              Mover y eliminar
            </Button>
          </div>
        )}

        {error && <p className="mt-3 text-sm text-destructive">{error}</p>}

        <div className="mt-4 flex gap-2 border-t pt-4">
          <Input
            placeholder="Nueva etapa…"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void add();
            }}
          />
          <Button onClick={() => void add()} disabled={!newName.trim()}>
            Agregar
          </Button>
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="ghost" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
