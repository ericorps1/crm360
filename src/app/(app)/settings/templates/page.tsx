"use client";

import { useState } from "react";
import { QuickRepliesClient } from "@/components/settings/quick-replies-client";
import { TemplatesClient } from "@/components/settings/templates-client";
import { cn } from "@/lib/utils";

/**
 * Dos cosas distintas que el agente inserta con `#`, en un solo lugar:
 * respuestas rápidas internas (libres, instantáneas) y plantillas de Meta
 * (aprobadas, las únicas válidas fuera de la ventana de 24 h).
 */
export default function TemplatesSettingsPage() {
  const [tab, setTab] = useState<"rapidas" | "meta">("rapidas");

  return (
    <div className="space-y-3">
      <div role="tablist" className="flex gap-1 border-b">
        {(
          [
            { id: "rapidas", label: "Respuestas rápidas" },
            { id: "meta", label: "Plantillas de Meta" },
          ] as const
        ).map((t) => (
          <button
            key={t.id}
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "-mb-px border-b-2 px-2.5 py-1.5 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-brand text-brand-text"
                : "border-transparent text-text-3 hover:text-foreground"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "rapidas" ? <QuickRepliesClient /> : <TemplatesClient />}
    </div>
  );
}
