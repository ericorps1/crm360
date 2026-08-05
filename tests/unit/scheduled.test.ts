import { describe, expect, it } from "vitest";
import {
  combinar,
  formatearCuando,
  manianaTemprano,
} from "@/components/inbox/schedule-popover";

describe("valor por defecto del programador", () => {
  it("es mañana a las 9:00 en hora local", () => {
    const ahora = new Date(2026, 7, 5, 14, 37, 12); // 5 ago, 14:37
    const d = manianaTemprano(ahora);
    expect(d.getDate()).toBe(6);
    expect(d.getMonth()).toBe(7);
    expect(d.getHours()).toBe(9);
    expect(d.getMinutes()).toBe(0);
    expect(d.getSeconds()).toBe(0);
  });

  it("cruza bien el fin de mes", () => {
    const d = manianaTemprano(new Date(2026, 7, 31, 23, 50));
    expect(d.getMonth()).toBe(8); // septiembre
    expect(d.getDate()).toBe(1);
    expect(d.getHours()).toBe(9);
  });

  it("cruza bien el fin de año", () => {
    const d = manianaTemprano(new Date(2026, 11, 31, 20, 0));
    expect(d.getFullYear()).toBe(2027);
    expect(d.getMonth()).toBe(0);
    expect(d.getDate()).toBe(1);
  });

  it("siempre cae en el futuro", () => {
    for (const h of [0, 8, 9, 10, 23]) {
      const ahora = new Date(2026, 7, 5, h, 30);
      expect(manianaTemprano(ahora).getTime()).toBeGreaterThan(ahora.getTime());
    }
  });
});

describe("combinar fecha y hora", () => {
  it("arma la fecha en hora local, no en UTC", () => {
    const d = combinar("2026-08-06", "09:00")!;
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(7);
    expect(d.getDate()).toBe(6);
    expect(d.getHours()).toBe(9);
  });

  it("devuelve null si falta alguno", () => {
    expect(combinar("", "09:00")).toBeNull();
    expect(combinar("2026-08-06", "")).toBeNull();
  });

  it("devuelve null con basura", () => {
    expect(combinar("no-es-fecha", "09:00")).toBeNull();
  });
});

describe("cómo se lee el momento programado", () => {
  it("dice 'mañana' cuando corresponde", () => {
    expect(formatearCuando(manianaTemprano().toISOString())).toMatch(/^mañana /);
  });

  it("dice 'hoy' para más tarde el mismo día", () => {
    const enDosHoras = new Date(Date.now() + 2 * 3600_000);
    expect(formatearCuando(enDosHoras.toISOString())).toMatch(/^hoy /);
  });

  it("usa la fecha para más adelante", () => {
    const enDiezDias = new Date(Date.now() + 10 * 86400_000);
    const texto = formatearCuando(enDiezDias.toISOString());
    expect(texto).not.toMatch(/^(hoy|mañana) /);
  });
});
