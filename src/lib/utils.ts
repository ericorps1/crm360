import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Iniciales (máx 2) para el avatar de un contacto. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return (first + second).toUpperCase() || "?";
}


/**
 * Índice de color estable por contacto (1..8). El color real vive en las
 * variables --avatar-N que genera el tema, así los avatares siempre
 * pertenecen al juego de colores elegido y cambian con el modo oscuro.
 */
export function avatarIndex(seed: string): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  }
  return (hash % 8) + 1;
}

export function formatPhone(phone: string | null | undefined): string {
  // 003: contactos BSUID pueden no tener teléfono.
  return phone ? `+${phone}` : "Sin teléfono";
}
