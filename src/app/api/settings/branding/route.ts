import { APP_NAME, BRAND } from "@/lib/branding";

export const dynamic = "force-dynamic";

/**
 * La identidad de CRM360 es fija: nombre y pareja de colores son constantes
 * del producto. Este endpoint solo la expone; no hay nada que escribir.
 */
export async function GET() {
  return Response.json({ name: APP_NAME, brand: BRAND });
}
