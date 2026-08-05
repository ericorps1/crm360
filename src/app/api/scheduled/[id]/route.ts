import { apiError, withAuth } from "@/lib/api";
import {
  cancelar,
  ScheduleError,
  scheduleErrorStatus,
} from "@/server/inbox/scheduled";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

/** Cancela una programación pendiente. Los ya enviados no se tocan. */
export const DELETE = withAuth(async (session, _req: Request, ctx: Params) => {
  const { id } = await ctx.params;
  try {
    const scheduled = await cancelar(session.organizationId, id);
    return Response.json({ scheduled });
  } catch (e) {
    if (e instanceof ScheduleError) {
      return apiError(scheduleErrorStatus(e), e.code, e.message);
    }
    throw e;
  }
});
