import { asc, desc } from "drizzle-orm";
import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import { getDb, schema } from "@/lib/db";
import { newId } from "@/lib/db/ids";
import { scoped } from "@/lib/db/tenant";
import {
  invalidVariables,
  isValidShortcut,
  normalizeShortcut,
} from "@/lib/quick-replies";

export const dynamic = "force-dynamic";

/** Ordenadas por uso: el menú de `#` muestra primero lo que más se usa. */
export const GET = withAuth(async (session) => {
  const db = getDb();
  const rows = await db
    .select()
    .from(schema.quickReply)
    .where(scoped(schema.quickReply.organizationId, session.organizationId))
    .orderBy(desc(schema.quickReply.usageCount), asc(schema.quickReply.shortcut));

  return Response.json({
    quickReplies: rows.map((r) => ({
      id: r.id,
      shortcut: r.shortcut,
      body: r.body,
      usageCount: r.usageCount,
    })),
  });
});

const createSchema = z.object({
  shortcut: z.string().trim().min(1).max(32),
  body: z.string().trim().min(1).max(4096),
});

export const POST = withAuth(async (session, req: Request) => {
  const body = await parseBody(req, createSchema);
  if (!body.ok) return body.response;

  const shortcut = normalizeShortcut(body.data.shortcut);
  if (!isValidShortcut(shortcut)) {
    return apiError(
      422,
      "invalid_shortcut",
      "El atajo solo admite minúsculas, números y guiones"
    );
  }

  const invalidas = invalidVariables(body.data.body);
  if (invalidas.length > 0) {
    return apiError(
      422,
      "invalid_variables",
      `Variables desconocidas: ${invalidas.map((v) => `{{${v}}}`).join(", ")}`
    );
  }

  const db = getDb();
  // Mismo atajo dos veces = se reescribe. Es lo esperable al "guardar" desde
  // la pantalla de administración, y el índice único lo exige de todos modos.
  const inserted = await db
    .insert(schema.quickReply)
    .values({
      id: newId("quickReply"),
      organizationId: session.organizationId,
      shortcut,
      body: body.data.body,
    })
    .onConflictDoUpdate({
      target: [schema.quickReply.organizationId, schema.quickReply.shortcut],
      set: { body: body.data.body, updatedAt: new Date() },
    })
    .returning();

  return Response.json({ quickReply: inserted[0] }, { status: 201 });
});
