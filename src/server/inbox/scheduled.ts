import { and, asc, eq, lte } from "drizzle-orm";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import { SendError, sendText } from "./send";

/**
 * Mensajes programados.
 *
 * El disparador es de tipo "pull": `dispararVencidos()` busca los pendientes
 * cuya hora ya pasó y los envía. No hay temporizador en memoria, así que un
 * reinicio no pierde nada y funciona igual en un VPS que en serverless.
 *
 * Se invoca desde `POST /api/scheduled/run`, que se puede llamar con un cron
 * del sistema, con un cron de la plataforma de hosting, o a mano.
 */

/** Cuánto se puede programar hacia adelante. Más allá no es realista. */
export const MAX_DIAS_ADELANTE = 90;

/** Tolerancia: un vencido por menos de esto todavía se manda. */
const GRACIA_MS = 5 * 60 * 1000;

export type ScheduledDto = {
  id: string;
  conversationId: string;
  body: string;
  sendAt: string;
  status: "pending" | "sent" | "failed" | "canceled";
  error: string | null;
};

export class ScheduleError extends Error {
  constructor(
    readonly code: "en_pasado" | "muy_lejos" | "no_encontrado" | "ya_procesado",
    message: string
  ) {
    super(message);
    this.name = "ScheduleError";
  }
}

export function scheduleErrorStatus(err: ScheduleError): number {
  switch (err.code) {
    case "no_encontrado":
      return 404;
    case "ya_procesado":
      return 409;
    default:
      return 422;
  }
}

export function serializeScheduled(row: typeof schema.scheduledMessage.$inferSelect): ScheduledDto {
  return {
    id: row.id,
    conversationId: row.conversationId,
    body: row.body,
    sendAt: row.sendAt.toISOString(),
    status: row.status,
    error: row.error,
  };
}

/**
 * Hora por defecto al abrir el programador: mañana a las 9:00 del operador.
 * Se calcula en el navegador —el servidor no conoce su huso— y por eso vive
 * junto a la UI, no aquí. Este valor es solo el respaldo del servidor.
 */
export function manianaTemprano(ahora: Date = new Date()): Date {
  const d = new Date(ahora);
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  return d;
}

export async function programar(input: {
  organizationId: string;
  conversationId: string;
  body: string;
  sendAt: Date;
  createdBy?: string | null;
}): Promise<ScheduledDto> {
  const ahora = new Date();
  if (input.sendAt.getTime() <= ahora.getTime()) {
    throw new ScheduleError("en_pasado", "La fecha y hora deben ser futuras");
  }
  const limite = new Date(ahora.getTime() + MAX_DIAS_ADELANTE * 86400000);
  if (input.sendAt.getTime() > limite.getTime()) {
    throw new ScheduleError(
      "muy_lejos",
      `No se puede programar a más de ${MAX_DIAS_ADELANTE} días`
    );
  }

  const db = getDb();
  const conv = await db
    .select({ id: schema.conversation.id })
    .from(schema.conversation)
    .where(
      scoped(
        schema.conversation.organizationId,
        input.organizationId,
        eq(schema.conversation.id, input.conversationId)
      )
    )
    .limit(1);
  if (!conv[0]) {
    throw new ScheduleError("no_encontrado", "Conversación no encontrada");
  }

  const inserted = await db
    .insert(schema.scheduledMessage)
    .values({
      id: newId("scheduledMessage"),
      organizationId: input.organizationId,
      conversationId: input.conversationId,
      body: input.body,
      sendAt: input.sendAt,
      createdBy: input.createdBy ?? null,
    })
    .returning();

  return serializeScheduled(inserted[0]!);
}

export async function cancelar(
  organizationId: string,
  id: string
): Promise<ScheduledDto> {
  const db = getDb();
  const filas = await db
    .select()
    .from(schema.scheduledMessage)
    .where(
      scoped(
        schema.scheduledMessage.organizationId,
        organizationId,
        eq(schema.scheduledMessage.id, id)
      )
    )
    .limit(1);
  const fila = filas[0];
  if (!fila) throw new ScheduleError("no_encontrado", "Programación no encontrada");
  if (fila.status !== "pending") {
    throw new ScheduleError(
      "ya_procesado",
      "Solo se pueden cancelar los que siguen pendientes"
    );
  }

  const updated = await db
    .update(schema.scheduledMessage)
    .set({ status: "canceled", updatedAt: new Date() })
    .where(eq(schema.scheduledMessage.id, id))
    .returning();
  return serializeScheduled(updated[0]!);
}

export async function listarDeConversacion(
  organizationId: string,
  conversationId: string
): Promise<ScheduledDto[]> {
  const db = getDb();
  const filas = await db
    .select()
    .from(schema.scheduledMessage)
    .where(
      scoped(
        schema.scheduledMessage.organizationId,
        organizationId,
        eq(schema.scheduledMessage.conversationId, conversationId),
        eq(schema.scheduledMessage.status, "pending")
      )
    )
    .orderBy(asc(schema.scheduledMessage.sendAt));
  return filas.map(serializeScheduled);
}

/**
 * Envía los pendientes cuya hora ya pasó.
 *
 * Cada uno se marca ANTES de intentar el envío, para que dos corridas
 * simultáneas del disparador no manden el mismo mensaje dos veces. Si el envío
 * falla, se registra el motivo y NO se reintenta: un mensaje programado que
 * llega tarde por reintentos automáticos suele ser peor que uno que no llega.
 *
 * El caso más común de fallo es la ventana de 24 h cerrada; `sendText` ya lo
 * valida y devuelve `window_closed`.
 */
export async function dispararVencidos(limite = 50): Promise<{
  enviados: number;
  fallidos: number;
  detalles: { id: string; status: string; error?: string }[];
}> {
  const db = getDb();
  const corte = new Date(Date.now() + GRACIA_MS);

  const vencidos = await db
    .select()
    .from(schema.scheduledMessage)
    .where(
      and(
        eq(schema.scheduledMessage.status, "pending"),
        lte(schema.scheduledMessage.sendAt, corte)
      )
    )
    .orderBy(asc(schema.scheduledMessage.sendAt))
    .limit(limite);

  const detalles: { id: string; status: string; error?: string }[] = [];
  let enviados = 0;
  let fallidos = 0;

  for (const fila of vencidos) {
    // Reclamo optimista: si otra corrida ya lo tomó, el UPDATE no afecta filas
    // y este ciclo lo salta. Es la guarda contra el envío duplicado.
    const reclamado = await db
      .update(schema.scheduledMessage)
      .set({ status: "sent", updatedAt: new Date() })
      .where(
        and(
          eq(schema.scheduledMessage.id, fila.id),
          eq(schema.scheduledMessage.status, "pending")
        )
      )
      .returning({ id: schema.scheduledMessage.id });
    if (!reclamado[0]) continue;

    try {
      const res = await sendText({
        conversationId: fila.conversationId,
        organizationId: fila.organizationId,
        text: fila.body,
      });
      await db
        .update(schema.scheduledMessage)
        .set({ sentMessageId: res.messageId, updatedAt: new Date() })
        .where(eq(schema.scheduledMessage.id, fila.id));
      enviados++;
      detalles.push({ id: fila.id, status: "sent" });
    } catch (e) {
      const mensaje =
        e instanceof SendError ? e.message : "Error inesperado al enviar";
      await db
        .update(schema.scheduledMessage)
        .set({ status: "failed", error: mensaje, updatedAt: new Date() })
        .where(eq(schema.scheduledMessage.id, fila.id));
      fallidos++;
      detalles.push({ id: fila.id, status: "failed", error: mensaje });
    }
  }

  return { enviados, fallidos, detalles };
}
