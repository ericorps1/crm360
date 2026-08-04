import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { APP_NAME } from "@/lib/branding";
import { SCRIPT_ANTI_PARPADEO } from "@/components/theme-toggle";
import "./globals.css";

// next/font descarga la fuente en BUILD y la sirve self-hosted (sin CDN).
const geist = Geist({
  subsets: ["latin"],
  variable: "--font-geist",
  display: "swap",
});

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: `${APP_NAME} — CRM de WhatsApp`,
    description: "CRM de WhatsApp con agente de IA y Laboratorio de auto-evaluación",
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    // El script anti-parpadeo escribe data-theme en <html> antes de que React
    // hidrate, así que el servidor y el cliente nunca coinciden en ese atributo.
    // Es intencional: sin el script la página destella en claro. Se silencia
    // solo este nodo, no el árbol.
    <html lang="es" className={geist.variable} suppressHydrationWarning>
      <head>
        {/* Debe correr antes del primer pintado o la página destella en claro */}
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_ANTI_PARPADEO }} />
      </head>
      {/* Extensiones del navegador (ColorZilla, Grammarly…) inyectan atributos
          en <body> antes de que React hidrate y disparan un falso error de
          hidratación. suppressHydrationWarning solo silencia ese nivel. */}
      <body className="font-sans" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
