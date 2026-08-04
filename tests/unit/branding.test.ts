import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { APP_NAME, BRAND, DARK_BG } from "@/lib/branding";
import { STAGE_TONES, suggestTone, toneClass, toneKey } from "@/lib/stage-colors";

const CSS = readFileSync(join(process.cwd(), "src/app/globals.css"), "utf8");

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

describe("modo oscuro en negro por capas", () => {
  it("define los cuatro niveles de elevación y suben de luminosidad", () => {
    const niveles = ["#0a0a0c", "#101013", "#16161a", "#1e1e23"];
    for (const n of niveles) expect(CSS).toContain(n);
    // Cada capa debe ser más clara que la anterior para leerse como elevación.
    const lum = (h: string) => parseInt(h.slice(1, 3), 16);
    for (let i = 1; i < niveles.length; i++) {
      expect(lum(niveles[i]!)).toBeGreaterThan(lum(niveles[i - 1]!));
    }
  });

  it("el texto principal contrasta de sobra con el lienzo", () => {
    expect(contraste("#f4f4f6", DARK_BG)).toBeGreaterThanOrEqual(7);
  });
});

describe("avatares neutros", () => {
  it("son gris en claro y negro en oscuro, nunca de color", () => {
    expect(CSS).toContain("--avatar-bg: #6c6c75");
    expect(CSS).toContain("--avatar-bg: #1c1c21");
    // El texto debe leerse en ambos.
    expect(contraste("#6c6c75", "#ffffff")).toBeGreaterThanOrEqual(4.5);
    expect(contraste("#1c1c21", "#d2d2da")).toBeGreaterThanOrEqual(4.5);
  });
});

describe("badges de estatus", () => {
  it("son rectangulares, no píldoras", () => {
    const badge = CSS.slice(CSS.indexOf(".badge-etapa {"), CSS.indexOf(".badge-etapa::before"));
    expect(badge).toContain("border-radius: 2px");
    expect(badge).not.toContain("border-radius: 999px");
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
