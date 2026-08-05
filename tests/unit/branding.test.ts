import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAME, BRAND, DARK_BG } from "@/lib/branding";
import { STAGE_TONES, suggestTone, toneClass, toneKey } from "@/lib/stage-colors";

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

/** Luminancia relativa (WCAG). */
function luminancia(h: string): number {
  const c = [1, 3, 5]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((s) => (s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)));
  return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
}

/** Lienzo del modo oscuro, leído del CSS para no fijarlo aquí. */
const FONDO_OSCURO = CSS.slice(CSS.indexOf(':root[data-theme="dark"] {')).match(
  /--bg: (#[0-9a-f]{6})/
)![1]!;

/** Contraste WCAG entre dos hex. */
function contraste(a: string, b: string): number {
  const lum = (h: string) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
      .map((s) => (s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0]! + 0.7152 * c[1]! + 0.0722 * c[2]!;
  };
  const x = lum(a) + 0.05;
  const y = lum(b) + 0.05;
  return x > y ? x / y : y / x;
}

describe("identidad fija", () => {
  it("el nombre es CRM360 y no es configurable", () => {
    expect(APP_NAME).toBe("CRM360");
    // No existe endpoint de escritura ni campo editable de marca.
    const api = readFileSync(
      join(process.cwd(), "src/app/api/settings/branding/route.ts"),
      "utf8"
    );
    expect(api).not.toMatch(/\b(PUT|POST|PATCH|DELETE)\b/);
  });

  it("la pareja de marca es violeta primario y turquesa secundario", () => {
    expect(BRAND.primary).toBe("#6250b5");
    expect(BRAND.secondary).toBe("#2a817a");
  });
});

describe("contraste de la marca", () => {
  it("los colores claros se leen con texto blanco encima", () => {
    expect(contraste(BRAND.primary, "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contraste(BRAND.secondary, "#ffffff")).toBeGreaterThanOrEqual(4.5);
  });

  it("los colores oscuros se leen sobre el fondo negro", () => {
    expect(contraste(BRAND.primaryDark, DARK_BG)).toBeGreaterThanOrEqual(4.5);
    expect(contraste(BRAND.secondaryDark, DARK_BG)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("modo oscuro por capas", () => {
  /** Valor de un token dentro del bloque :root[data-theme="dark"]. */
  function tokenOscuro(nombre: string): string {
    const bloque = CSS.slice(CSS.indexOf(':root[data-theme="dark"] {'));
    return bloque.match(new RegExp(`${nombre}: (#[0-9a-f]{6})`))![1]!;
  }

  it("los cuatro niveles de elevación suben de luminosidad en orden", () => {
    // Se leen del CSS, no se escriben aquí: así el test sobrevive a un cambio
    // de paleta y sigue verificando lo que importa, que es la progresión.
    const niveles = ["--bg", "--bg-subtle", "--bg-panel", "--bg-hover"].map(tokenOscuro);
    for (let i = 1; i < niveles.length; i++) {
      expect(
        luminancia(niveles[i]!),
        `${niveles[i]} no es más claro que ${niveles[i - 1]}`
      ).toBeGreaterThan(luminancia(niveles[i - 1]!));
    }
  });

  it("el texto principal contrasta de sobra con el lienzo", () => {
    expect(contraste(tokenOscuro("--text"), tokenOscuro("--bg"))).toBeGreaterThanOrEqual(7);
  });
});

describe("avatares neutros", () => {
  it("el texto se lee sobre el fondo del avatar, en los dos temas", () => {
    const claro = CSS.slice(CSS.indexOf(":root {"), CSS.indexOf(':root[data-theme="dark"] {'));
    const oscuro = CSS.slice(CSS.indexOf(':root[data-theme="dark"] {'));
    for (const [bloque, tema] of [
      [claro, "claro"],
      [oscuro, "oscuro"],
    ] as const) {
      const bg = bloque.match(/--avatar-bg: (#[0-9a-f]{6})/)![1]!;
      const fg = bloque.match(/--avatar-fg: (#[0-9a-f]{6})/)![1]!;
      expect(contraste(bg, fg), `avatar en ${tema}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("badges de estatus", () => {
  it("son cápsulas sólidas y compactas", () => {
    const badge = CSS.slice(CSS.indexOf(".badge-etapa {"), CSS.indexOf(".badge-etapa::before"));
    // Cápsula: el radio supera el alto, así que las esquinas son semicírculos.
    expect(badge).toContain("border-radius: 999px");
    expect(badge).toContain("height: 16px");
    // El fondo es la tinta plena de la etapa, no una mezcla.
    expect(badge).toContain("background: var(--tono-ink)");
    // Sin borde: un sólido con borde encima es lo que se veía anticuado.
    expect(badge).not.toMatch(/^\s*border:/m);
  });

  it("el texto invertido se lee sobre cada tono, en los dos temas", () => {
    // Un badge sólido vive o muere por esto: si el texto no contrasta contra
    // el fondo de color, el nombre de la etapa se vuelve ilegible.
    // Anclado a inicio de línea: sin esto también casaría dentro de las reglas
    // oscuras, que llevan el mismo `.tono-x {` precedido del selector :root.
    const claro = /^\s*\.tono-(\w+) \{ --tono-ink: (#[0-9a-f]{6}); \}/gm;
    const oscuro = /:root\[data-theme="dark"\] \.tono-(\w+) \{ --tono-ink: (#[0-9a-f]{6}); \}/gm;

    let n = 0;
    for (const m of CSS.matchAll(claro)) {
      expect(contraste(m[2]!, "#ffffff"), `${m[1]} en claro`).toBeGreaterThanOrEqual(4.5);
      n++;
    }
    for (const m of CSS.matchAll(oscuro)) {
      expect(contraste(m[2]!, FONDO_OSCURO), `${m[1]} en oscuro`).toBeGreaterThanOrEqual(4.5);
    }
    expect(n, "no se encontraron tonos claros").toBe(8);
  });

  it("cada tono existe en claro y en oscuro", () => {
    for (const key of Object.keys(STAGE_TONES)) {
      expect(CSS).toContain(`.tono-${key} {`);
      expect(CSS).toContain(`:root[data-theme="dark"] .tono-${key} {`);
    }
  });

  it("el tono sigue el estatus: anclas fijas y avance de frío a cálido", () => {
    expect(suggestTone("won", 3)).toBe("verde");
    expect(suggestTone("lost", 4)).toBe("gris");
    expect(suggestTone("open", 0)).toBe("azul");
    expect(suggestTone("open", 3)).toBe("ambar");
  });

  it("un tono inválido cae a gris sin romper", () => {
    expect(toneKey("inventado")).toBe("gris");
    expect(toneClass(null)).toBe("tono-gris");
  });
});
