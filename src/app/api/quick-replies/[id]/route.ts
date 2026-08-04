import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { scoped } from "@/lib/db/tenant";
import {
  invalidVariables,
  isValidShortcut,
  normalizeShortcut,
} from "@/lib/quick-replies";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

const patchSchema = z.object({
  shortcut: z.string().trim().min(1).max(32).optional(),
  body: z.string().trim().min(1).max(4096).optional(),
  /** Marca un uso; el menú de `#` lo dispara al insertar. */
  used: z.literal(true).optional(),
});

export const PATCH = withAuth(async (session, req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const body = await parseBody(req, patchSchema);
  if (!body.ok) return body.response;

  const set: Record<string, unknown> = { updatedAt: new Date() };

  if (body.data.shortcut !== undefined) {
    const shortcut = normalizeShortcut(body.data.shortcut);
    if (!isValidShortcut(shortcut)) {
      return apiError(
        422,
        "invalid_shortcut",
        "El atajo solo admite minúsculas, números y guiones"
      );
    }
    set.shortcut = shortcut;
  }

  if (body.data.body !== undefined) {
    const invalidas = invalidVariables(body.data.body);
    if (invalidas.length > 0) {
      return apiError(
        422,
        "invalid_variables",
        `Variables desconocidas: ${invalidas.map((v) => `{{${v}}}`).join(", ")}`
      );
    }
    set.body = body.data.body;
  }

  if (body.data.used) {
    set.usageCount = sql`${schema.quickReply.usageCount} + 1`;
  }

  const db = getDb();
  const updated = await db
    .update(schema.quickReply)
    .set(set)
    .where(
      scoped(
        schema.quickReply.organizationId,
        session.organizationId,
        eq(schema.quickReply.id, id)
      )
    )
    .returning();

  if (!updated[0]) {
    return apiError(404, "not_found", "Respuesta rápida no encontrada");
  }
  return Response.json({ quickReply: updated[0] });
});

export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  const db = getDb();
  const deleted = await db
    .delete(schema.quickReply)
    .where(
      scoped(
        schema.quickReply.organizationId,
        session.organizationId,
        eq(schema.quickReply.id, id)
      )
    )
    .returning();

  if (!deleted[0]) {
    return apiError(404, "not_found", "Respuesta rápida no encontrada");
  }
  return Response.json({ deleted: true });
});
