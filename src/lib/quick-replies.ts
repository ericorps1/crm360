/**
 * Respuestas rápidas: normalización de atajos y sustitución de variables.
 *
 * Dos gramáticas distintas conviven en el CRM y NO deben mezclarse:
 *   · Meta usa variables posicionales — `{{1}}` — resueltas en
 *     `src/server/whatsapp/templates.ts` con `renderBody()`.
 *   · Las respuestas rápidas usan variables con nombre — `{{nombre}}` — que se
 *     resuelven aquí, en el cliente, contra los datos del contacto.
 *
 * Sin red y sin dependencias: se usa mientras el agente teclea.
 */

export const VARIABLES = ["nombre", "nombre_completo", "telefono", "etapa"] as const;
export type VariableName = (typeof VARIABLES)[number];

export type QuickReplyDto = {
  id: string;
  shortcut: string;
  body: string;
  usageCount: number;
};

/** Contexto de sustitución, tomado del contacto y su lead. */
export type RenderContext = {
  nombre?: string | null;
  telefono?: string | null;
  etapa?: string | null;
};

const RE_VARIABLE = /\{\{\s*([a-z_]+)\s*\}\}/gi;

/**
 * Atajo válido: minúsculas, dígitos y guiones. Es lo que se teclea tras `#`,
 * así que no puede llevar espacios ni acentos.
 */
export function normalizeShortcut(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // quita acentos
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 32);
}

export function isValidShortcut(value: string): boolean {
  return /^[a-z0-9][a-z0-9-]{0,31}$/.test(value);
}

/** Variables presentes en el cuerpo, en orden de aparición y sin repetir. */
export function extractVariables(body: string): string[] {
  const encontradas = new Set<string>();
  for (const m of body.matchAll(RE_VARIABLE)) {
    encontradas.add(m[1]!.toLowerCase());
  }
  return [...encontradas];
}

/** Variables escritas que no existen: se avisan al crear la respuesta. */
export function invalidVariables(body: string): string[] {
  return extractVariables(body).filter(
    (v) => !VARIABLES.includes(v as VariableName)
  );
}

/**
 * Sustituye las variables por los datos del contacto.
 *
 * Una variable sin dato se reemplaza por cadena vacía, no se deja el `{{...}}`
 * crudo: es preferible un hueco a que se le envíe "{{nombre}}" a un cliente.
 * Una variable desconocida se deja tal cual, para que se note el error.
 */
export function renderQuickReply(body: string, ctx: RenderContext): string {
  const nombreCompleto = (ctx.nombre ?? "").trim();
  const valores: Record<VariableName, string> = {
    nombre: nombreCompleto.split(/\s+/)[0] ?? "",
    nombre_completo: nombreCompleto,
    telefono: ctx.telefono ? `+${ctx.telefono}` : "",
    etapa: ctx.etapa ?? "",
  };

  return body.replace(RE_VARIABLE, (completa, nombre: string) => {
    const clave = nombre.toLowerCase() as VariableName;
    return VARIABLES.includes(clave) ? valores[clave] : completa;
  });
}
