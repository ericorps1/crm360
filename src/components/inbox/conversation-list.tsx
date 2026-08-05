"use client";

import { useState } from "react";
import { Search, Sparkles, UserRound } from "lucide-react";
import type { ConversationDto } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ContactAvatar } from "@/components/avatar";
import { Button } from "@/components/ui/button";
import { toneClass } from "@/lib/stage-colors";
import { formatTime, previewText } from "./helpers";

function EmptyState({ onSeeded }: { onSeeded: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [failed, setFailed] = useState(false);

  async function seed() {
    setSeeding(true);
    const res = await fetch("/api/seed/demo", { method: "POST" }).catch(
      () => null
    );
    setSeeding(false);
    if (res?.ok) onSeeded();
    else setFailed(true);
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <p className="text-sm font-medium">Sin conversaciones todavía</p>
      <p className="text-xs text-text-3">
        Cuando alguien escriba a tu número de WhatsApp, su conversación
        aparecerá aquí en tiempo real.
      </p>
      {!failed && (
        <Button
          size="sm"
          variant="outline"
          disabled={seeding}
          onClick={() => void seed()}
        >
          <Sparkles className="h-4 w-4" strokeWidth={1.7} />
          {seeding ? "Cargando demo…" : "Cargar datos de demostración"}
        </Button>
      )}
    </div>
  );
}

export function ConversationList({
  conversations: conversationsProp,
  selectedId,
  onSelect,
  onSeeded,
}: {
  conversations: ConversationDto[] | null;
  selectedId: string | null;
  onSelect: (id: string) => void;
  onSeeded: () => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "unread">("all");

  const loading = conversationsProp === null;
  const conversations = conversationsProp ?? [];
  const q = query.trim().toLowerCase();
  const searched = q
    ? conversations.filter(
        (c) =>
          c.contact.name.toLowerCase().includes(q) ||
          (c.contact.phone ?? "").includes(q) ||
          (c.preview ?? "").toLowerCase().includes(q)
      )
    : conversations;
  const unreadCount = searched.filter((c) => c.unreadCount > 0).length;
  const visible =
    filter === "unread" ? searched.filter((c) => c.unreadCount > 0) : searched;

  return (
    <div className="flex h-full flex-col">
      <header className="border-b px-3 pb-2 pt-2.5">
        <div className="mb-2 flex items-baseline gap-2">
          <h2 className="text-lg font-[650] tracking-tight">Bandeja</h2>
          <span className="text-xs text-text-3">{conversations.length}</span>
        </div>
        <div className="flex items-center gap-2 rounded-md border bg-secondary px-2.5 py-1 transition-colors focus-within:border-brand focus-within:bg-background focus-within:ring-[3px] focus-within:ring-brand-soft">
          <Search className="h-3.5 w-3.5 shrink-0 text-text-3" strokeWidth={1.7} />
          <input
            placeholder="Buscar conversación…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-transparent text-sm outline-none placeholder:text-text-3"
          />
        </div>
      </header>

      <div className="flex gap-1 border-b px-3 py-1.5">
        {(
          [
            { id: "all", label: "Todas", count: searched.length },
            { id: "unread", label: "No leídas", count: unreadCount },
          ] as const
        ).map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
              filter === f.id
                ? "border-brand bg-brand text-white"
                : "bg-background text-text-2 hover:bg-accent"
            )}
          >
            {f.label}
            <span
              className={cn(
                "rounded-full px-1 text-2xs",
                filter === f.id ? "bg-white/20" : "bg-secondary text-text-3"
              )}
            >
              {f.count}
            </span>
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <p className="p-4 text-center text-xs text-text-3">Cargando…</p>
        ) : conversations.length === 0 ? (
          <EmptyState onSeeded={onSeeded} />
        ) : visible.length === 0 ? (
          <p className="p-4 text-center text-xs text-text-3">
            Sin resultados para este filtro.
          </p>
        ) : (
          <ul>
            {visible.map((c) => {
              const unread = c.unreadCount > 0;
              const active = selectedId === c.id;
              return (
                <li key={c.id} className="relative px-1.5 py-px">
                  <button
                    onClick={() => onSelect(c.id)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors",
                      active
                        ? "bg-brand-tint ring-1 ring-brand-soft"
                        : "hover:bg-accent"
                    )}
                  >
                    <span className="relative shrink-0">
                      <ContactAvatar name={c.contact.name} seed={c.contact.id} size="sm" />
                      {c.windowOpen && (
                        <span className="absolute bottom-0 right-0 h-2 w-2 rounded-full border-2 border-background bg-success" />
                      )}
                    </span>
                    {/* Dos líneas, no tres: nombre + etapa arriba, extracto +
                        hora abajo. La etapa va a la derecha del nombre para
                        que todos los badges queden alineados en columna. */}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-1.5">
                        <span
                          className={cn(
                            "truncate text-xs",
                            unread ? "font-[680]" : "font-semibold"
                          )}
                        >
                          {c.contact.name}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          {c.handoffAt && (
                            <UserRound
                              className="h-3 w-3 text-warning-ink"
                              strokeWidth={2}
                              aria-label="Atención humana"
                            />
                          )}
                          {c.stageName && (
                            <span className={cn("badge-etapa", toneClass(c.stageTone))}>
                              {c.stageName}
                            </span>
                          )}
                        </span>
                      </span>
                      <span className="mt-px flex items-center justify-between gap-1.5">
                        <span
                          className={cn(
                            "truncate text-2xs",
                            unread ? "font-medium text-text-2" : "text-text-3"
                          )}
                        >
                          {previewText(c.preview)}
                        </span>
                        <span className="flex shrink-0 items-center gap-1">
                          <span
                            className={cn(
                              "text-2xs tabular-nums",
                              unread ? "font-semibold text-brand" : "text-text-3"
                            )}
                          >
                            {formatTime(c.lastMessageAt)}
                          </span>
                          {unread && (
                            <span className="pastilla bg-brand text-white">
                              {c.unreadCount}
                            </span>
                          )}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
