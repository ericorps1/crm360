import { apiError } from "@/lib/api";
import { dispararVencidos } from "@/server/inbox/scheduled";

export const dynamic = "force-dynamic";

/**
 * Disparador de mensajes programados.
 *
 * Se llama desde fuera —cron del sistema, cron del hosting, o a mano— porque
 * no hay proceso en segundo plano: así sobrevive a reinicios y funciona igual
 * en un VPS que en serverless.
 *
 *   * / 5 * * * *  curl -fsS -X POST https://tu-dominio/api/scheduled/run \
 *                    -H "authorization: Bearer $SCHEDULER_TOKEN"
 *
 * No usa la sesión del operador: no hay nadie con sesión a las 9 de la mañana.
 * Se protege con `SCHEDULER_TOKEN`. **Si la variable no está definida, el
 * endpoint queda deshabilitado** en vez de quedar abierto: sin ese cuidado,
 * cualquiera podría disparar los envíos de todas las organizaciones.
 */
export async function POST(req: Request) {
  const esperado = process.env.SCHEDULER_TOKEN;
  if (!esperado) {
    return apiError(
      503,
      "scheduler_disabled",
      "Define SCHEDULER_TOKEN para habilitar el disparador"
    );
  }

  const recibido = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (recibido !== esperado) {
    return apiError(401, "unauthorized", "Token del disparador inválido");
  }

  const resultado = await dispararVencidos();
  return Response.json(resultado);
}
