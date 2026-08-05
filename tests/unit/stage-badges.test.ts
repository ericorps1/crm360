import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { STAGE_TONES, toneClass, toneKey } from "@/lib/stage-colors";

const raiz = process.cwd();
const leer = (ruta: string) => readFileSync(join(raiz, ruta), "utf8");

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

/**
 * El nombre de una etapa NUNCA se pinta como texto suelto: siempre va dentro
 * de un `.badge-etapa` con el tono de la etapa. Estos casos congelan los siete
 * sitios donde aparece, para que un cambio futuro no lo deshaga en silencio.
 */
const SITIOS: { archivo: string; sitio: string; marcador: string }[] = [
  {
    archivo: "src/components/pipeline/pipeline-board.tsx",
    sitio: "encabezado de la columna del kanban",
    marcador: "{stage.name}",
  },
  {
    archivo: "src/components/pipeline/move-stage-menu.tsx",
    sitio: "disparador del selector de etapa",
    marcador: '{actual?.name ?? "Sin etapa"}',
  },
  {
    archivo: "src/components/pipeline/move-stage-menu.tsx",
    sitio: "opciones del desplegable",
    marcador: "{s.name}",
  },
  {
    archivo: "src/components/pipeline/stage-manager.tsx",
    sitio: "aviso de etapa con tarjetas",
    marcador: "{deleting.name}",
  },
  {
    archivo: "src/components/inbox/contact-panel.tsx",
    sitio: "stepper de etapas del panel",
    marcador: "{s.name}",
  },
  {
    archivo: "src/components/inbox/conversation-list.tsx",
    sitio: "fila de la lista de conversaciones",
    marcador: "{c.stageName}",
  },
];

/**
 * Sitios donde el nombre se RENDERIZA, no donde se describe.
 *
 * Se buscan solo las líneas cuyo contenido es exactamente el marcador: así es
 * como queda un hijo de texto JSX tras el formateador. Quedan fuera los usos
 * que no pintan nada visible —`aria-label={\`Mover a ${s.name}\`}` o
 * `defaultValue={s.name}`— que contienen la misma cadena y darían un falso
 * positivo.
 */
const NO_RENDERIZA = /aria-label|defaultValue|title=|placeholder|\$\{/;

function lineasDeRender(contenido: string, marcador: string): number[] {
  return contenido
    .split("\n")
    .map((linea, i) =>
      linea.includes(marcador) && !NO_RENDERIZA.test(linea) ? i : -1
    )
    .filter((i) => i !== -1);
}

/** Un nombre está "en badge" si hay `badge-etapa` en las líneas previas. */
function enBadge(contenido: string, indice: number, ventana = 13): boolean {
  return contenido
    .split("\n")
    .slice(Math.max(0, indice - ventana), indice + 1)
    .join("\n")
    .includes("badge-etapa");
}

describe("el nombre de la etapa siempre va en badge", () => {
  for (const { archivo, sitio, marcador } of SITIOS) {
    it(sitio, () => {
      const contenido = leer(archivo);
      const lineas = lineasDeRender(contenido, marcador);
      expect(
        lineas.length,
        `${archivo}: no se encontró ${marcador} como texto renderizado`
      ).toBeGreaterThan(0);
      // TODAS las apariciones visibles deben ir en badge, no solo la primera.
      for (const i of lineas) {
        expect(enBadge(contenido, i), `${archivo}:${i + 1} fuera de badge`).toBe(true);
      }
    });
  }

  it("ningún badge de etapa se pinta sin su tono", () => {
    // `badge-etapa` sin `toneClass(...)` heredaría el tono del ancestro, o
    // ninguno: el badge saldría gris aunque la etapa tenga color.
    for (const archivo of new Set(SITIOS.map((s) => s.archivo))) {
      const contenido = leer(archivo);
      const usos = contenido.match(/badge-etapa[\s\S]{0,180}?\)/g) ?? [];
      for (const uso of usos) {
        expect(uso, `${archivo}: badge-etapa sin toneClass`).toMatch(/toneClass|tono-/);
      }
    }
  });
});

describe("el catálogo de tonos", () => {
  it("cubre los ocho colores y cae a gris con basura", () => {
    expect(Object.keys(STAGE_TONES)).toHaveLength(8);
    expect(toneKey("no-existe")).toBe("gris");
    expect(toneClass(null)).toBe("tono-gris");
  });

  it("cada tono tiene su clase definida en el CSS, en claro y en oscuro", () => {
    const css = leer("src/app/globals.css");
    for (const clave of Object.keys(STAGE_TONES)) {
      expect(css).toContain(`.tono-${clave} {`);
      expect(css).toContain(`:root[data-theme="dark"] .tono-${clave} {`);
    }
  });

  it("los tonos viven FUERA de @layer components, o Tailwind los purga", () => {
    // `toneClass()` arma el nombre con plantilla, así que Tailwind nunca ve
    // estas clases en el código. Dentro de un @layer las elimina del bundle y
    // los badges salen sin color; fuera, siempre se emiten.
    const css = leer("src/app/globals.css");
    // La directiva real, no la mención en un comentario.
    const inicioLayer = css.indexOf("@layer components {");
    if (inicioLayer === -1) return; // no hay layer de componentes: nada que revisar
    const finLayer = css.indexOf("\n}", inicioLayer);
    const dentro = css.slice(inicioLayer, finLayer);
    for (const clave of Object.keys(STAGE_TONES)) {
      expect(dentro, `.tono-${clave} está dentro de @layer y se purgaría`).not.toContain(
        `.tono-${clave} {`
      );
    }
    expect(dentro).not.toContain(".badge-etapa {");
  });

  it("los tonos claros se distinguen del fondo blanco", () => {
    // El bug original: superficies a 1.12–1.16 de contraste, indistinguibles
    // del blanco. El badge existía pero no se veía.
    const css = leer("src/app/globals.css");
    for (const clave of Object.keys(STAGE_TONES)) {
      const i = css.indexOf(`.tono-${clave} { --tono-surface:`);
      expect(i, `sin regla clara para ${clave}`).toBeGreaterThan(-1);
      const superficie = css.slice(i, i + 120).match(/#[0-9a-f]{6}/)![0];
      expect(
        contraste(superficie, "#ffffff"),
        `${clave}: la superficie no se distingue del blanco`
      ).toBeGreaterThan(1.16);
    }
  });
});
