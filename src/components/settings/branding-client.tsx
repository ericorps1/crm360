"use client";

import { APP_NAME } from "@/lib/branding";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/** Muestra un color del sistema leyendo el token vivo (respeta claro/oscuro). */
function Muestra({
  variable,
  nombre,
  papel,
}: {
  variable: string;
  nombre: string;
  papel: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-md border p-3">
      <span
        className="h-9 w-9 shrink-0 rounded"
        style={{ background: `var(${variable})` }}
        aria-hidden
      />
      <span className="min-w-0">
        <span className="block text-sm font-medium">{nombre}</span>
        <span className="block text-xs text-text-3">{papel}</span>
      </span>
    </div>
  );
}

export function BrandingClient() {
  return (
    <div className="max-w-2xl space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Identidad</CardTitle>
          <CardDescription>
            El nombre y los colores de {APP_NAME} son fijos. No hay nada que
            configurar aquí: se documentan para referencia.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2 sm:grid-cols-2">
            <Muestra
              variable="--accent"
              nombre="Violeta"
              papel="Primario · botones y estados activos"
            />
            <Muestra
              variable="--accent2"
              nombre="Turquesa tenue"
              papel="Secundario · burbujas del chat"
            />
          </div>

          {/* Vista previa con tokens vivos: cambia sola con el modo oscuro. */}
          <div className="rounded-md border bg-subtle p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-sm text-lg font-bold text-white"
                style={{ background: "var(--accent)" }}
              >
                {APP_NAME.charAt(0)}
              </span>
              <span className="min-w-0">
                <span className="block text-lg font-[650] leading-tight">
                  {APP_NAME}
                </span>
                <span className="block text-xs text-text-3">CRM · WhatsApp</span>
              </span>
              <span className="flex-1" />
              <span
                className="rounded-md px-3 py-1.5 text-xs font-medium text-white"
                style={{ background: "var(--accent)" }}
              >
                Primario
              </span>
              <span
                className="rounded-md border px-3 py-1.5 text-xs font-medium"
                style={{
                  background: "var(--bubble-out)",
                  color: "var(--bubble-out-text)",
                  borderColor: "var(--accent2-soft)",
                }}
              >
                Secundario
              </span>
            </div>
            <p className="mt-2.5 text-xs text-text-3">
              Cambia el tema claro/oscuro desde la barra lateral para ver cómo se
              adaptan.
            </p>
          </div>

          <p className="rounded-md border bg-subtle p-3 text-xs text-text-3">
            Lo único configurable del aspecto es el <strong className="text-text-2">
            color de cada etapa</strong> del embudo, en Embudo → Gestionar etapas.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
