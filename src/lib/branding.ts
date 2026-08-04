/**
 * Identidad de CRM360. Todo fijo, nada configurable.
 *
 * El nombre y la pareja de colores son constantes del producto. Los valores
 * reales viven en `globals.css` como tokens (--accent* y --accent2*), con su
 * variante para modo oscuro; aquí solo se declaran para poder mostrarlos en
 * pantalla y verificarlos en pruebas.
 */

export const APP_NAME = "CRM360" as const;

export const BRAND = {
  /** Primario: botones, enlaces, estados activos. */
  primary: "#6250b5",
  primaryDark: "#8d7fc9",
  /** Secundario: burbujas del chat y acentos de apoyo. */
  secondary: "#2a817a",
  secondaryDark: "#4fa39c",
} as const;

/** Fondo del modo oscuro; referencia para verificar contraste. */
export const DARK_BG = "#0a0a0c" as const;
