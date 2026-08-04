import { describe, expect, it } from "vitest";
import {
  extractVariables,
  invalidVariables,
  isValidShortcut,
  normalizeShortcut,
  renderQuickReply,
  VARIABLES,
} from "@/lib/quick-replies";

const CONTACTO = {
  nombre: "María Fernanda López",
  telefono: "5215512345678",
  etapa: "Interesado",
};

describe("atajos", () => {
  it("normaliza espacios, mayúsculas y acentos", () => {
    expect(normalizeShortcut("Saludo Buenos DÍAS")).toBe("saludo-buenos-dias");
    expect(normalizeShortcut("  cotización  ")).toBe("cotizacion");
    expect(normalizeShortcut("a---b")).toBe("a-b");
    expect(normalizeShortcut("-borde-")).toBe("borde");
  });

  it("acepta lo normalizado y rechaza lo que no se puede teclear tras #", () => {
    expect(isValidShortcut("saludo-inicial")).toBe(true);
    expect(isValidShortcut("con espacio")).toBe(false);
    expect(isValidShortcut("Mayúscula")).toBe(false);
    expect(isValidShortcut("-empieza-con-guion")).toBe(false);
    expect(isValidShortcut("")).toBe(false);
  });
});

describe("variables", () => {
  it("las detecta sin repetir y en orden de aparición", () => {
    expect(extractVariables("Hola {{nombre}}, {{nombre}} de {{etapa}}")).toEqual([
      "nombre",
      "etapa",
    ]);
    expect(extractVariables("sin variables")).toEqual([]);
  });

  it("señala solo las que no existen", () => {
    expect(invalidVariables("Hola {{nombre}}")).toEqual([]);
    expect(invalidVariables("Hola {{apellido}} y {{rfc}}")).toEqual([
      "apellido",
      "rfc",
    ]);
  });

  it("todas las variables declaradas se resuelven", () => {
    for (const v of VARIABLES) {
      const salida = renderQuickReply(`[{{${v}}}]`, CONTACTO);
      expect(salida).not.toContain("{{");
    }
  });
});

describe("sustitución", () => {
  it("nombre usa solo el primero; nombre_completo el entero", () => {
    expect(renderQuickReply("Hola {{nombre}}", CONTACTO)).toBe("Hola María");
    expect(renderQuickReply("{{nombre_completo}}", CONTACTO)).toBe(
      "María Fernanda López"
    );
  });

  it("el teléfono sale con prefijo internacional", () => {
    expect(renderQuickReply("{{telefono}}", CONTACTO)).toBe("+5215512345678");
  });

  it("tolera espacios dentro de las llaves y no distingue mayúsculas", () => {
    expect(renderQuickReply("{{  nombre  }}", CONTACTO)).toBe("María");
    expect(renderQuickReply("{{NOMBRE}}", CONTACTO)).toBe("María");
  });

  it("un dato faltante deja hueco, nunca el {{...}} crudo", () => {
    // Mandarle "{{nombre}}" a un cliente real es peor que un espacio vacío.
    expect(renderQuickReply("Hola {{nombre}}!", { nombre: null })).toBe("Hola !");
    expect(renderQuickReply("{{telefono}}", {})).toBe("");
  });

  it("una variable desconocida se deja intacta para que se note el error", () => {
    expect(renderQuickReply("Hola {{apellido}}", CONTACTO)).toBe("Hola {{apellido}}");
  });

  it("no toca las variables posicionales de Meta", () => {
    // Meta usa {{1}}; esa gramática la resuelve renderBody() del servidor.
    expect(renderQuickReply("Hola {{1}}", CONTACTO)).toBe("Hola {{1}}");
  });
});
