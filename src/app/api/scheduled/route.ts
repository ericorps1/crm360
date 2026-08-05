import { z } from "zod";
import { apiError, parseBody, withAuth } from "@/lib/api";
import {
  listarDeConversacion,
  programar,
  ScheduleError,
  scheduleErrorStatus,
} from "@/server/inbox/scheduled";

export const dynamic = "force-dynamic";

/** Pendientes de una conversación: `?conversationId=<id>`. */
export const GET = withAuth(async (session, req: Request) => {
  const conversationId = new URL(req.url).searchParams.get("conversationId");
  if (!conversationId) {
    return apiError(422, "missing_conversation", "Falta conversationId");
  }
  const scheduled = await listarDeConversacion(
    session.organizationId,
    conversationId
  );
  return Response.json({ scheduled });
});

const createSchema = z.object({
  conversationId: z.string().min(1),
  body: z.string().trim().min(1).max(4096),
  /** ISO 8601 con huso; el navegador lo arma desde la hora local. */
  sendAt: z.string().datetime({ offset: true }),
});

export const POST = withAuth(async (session, req: Request) => {
  const parsed = await parseBody(req, createSchema);
  if (!parsed.ok) return parsed.response;

  try {
    const scheduled = await programar({
      organizationId: session.organizationId,
      conversationId: parsed.data.conversationId,
      body: parsed.data.body,
      sendAt: new Date(parsed.data.sendAt),
      createdBy: session.userId,
    });
    return Response.json({ scheduled }, { status: 201 });
  } catch (e) {
    if (e instanceof ScheduleError) {
      return apiError(scheduleErrorStatus(e), e.code, e.message);
    }
    throw e;
  }
});
