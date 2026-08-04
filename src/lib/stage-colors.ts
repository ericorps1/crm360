/**
 * Tonos de etapa del embudo.
 *
 * Deliberadamente NO tiñen la columna: solo pintan un badge cuadrado pequeño
 * junto al nombre. Un tablero con columnas de colores compite con el contenido
 * y se ve peor; el badge da la misma información sin ruido.
 *
 * Los colores viven en CSS (clases `.tono-*` en globals.css) y no aquí, para
 * que el modo oscuro los cambie solo. Este archivo solo conoce las claves.
 */

export const STAGE_TONES = {
  violeta: "Violeta",
  turquesa: "Turquesa",
  azul: "Azul",
  verde: "Verde",
  ambar: "Ámbar",
  rosa: "Rosa",
  arena: "Arena",
  gris: "Gris",
} as const;

export type StageToneKey = keyof typeof STAGE_TONES;

export const DEFAULT_TONE: StageToneKey = "gris";

export const TONE_ORDER: StageToneKey[] = [
  "violeta",
  "turquesa",
  "azul",
  "verde",
  "ambar",
  "rosa",
  "arena",
  "gris",
];

export function isToneKey(value: unknown): value is StageToneKey {
  return typeof value === "string" && value in STAGE_TONES;
}

export function toneKey(value: string | null | undefined): StageToneKey {
  return isToneKey(value) ? value : DEFAULT_TONE;
}

export function toneLabel(value: string | null | undefined): string {
  return STAGE_TONES[toneKey(value)];
}

/** Clase CSS del tono; los valores reales se resuelven en globals.css. */
export function toneClass(value: string | null | undefined): string {
  return `tono-${toneKey(value)}`;
}

/**
 * Tono sugerido según el ESTATUS, no al azar: el avance por el embudo se lee
 * de frío a cálido (azul → violeta → turquesa → ámbar → rosa) y las anclas
 * tienen color fijo: verde para ganado, gris para perdido.
 */
export function suggestTone(
  kind: "open" | "won" | "lost",
  position: number
): StageToneKey {
  if (kind === "won") return "verde";
  if (kind === "lost") return "gris";
  const avance: StageToneKey[] = ["azul", "violeta", "turquesa", "ambar", "rosa", "arena"];
  return avance[Math.min(position, avance.length - 1)]!;
}
