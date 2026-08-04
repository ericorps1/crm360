# Guion E2E — US6: Plantillas y respuestas rápidas

> Conducido con Playwright (MCP) contra `pnpm dev` con wa-mock.
>
> `/settings/templates` tiene dos pestañas, porque son dos cosas distintas:
> **respuestas rápidas** internas (texto libre, sin aprobación, solo dentro de
> la ventana de 24 h, variables con nombre `{{nombre}}`) y **plantillas de
> Meta** (aprobadas, únicas válidas fuera de la ventana, variable posicional
> `{{1}}`). El compositor las ofrece juntas con `#`.

## Ciclo de aprobación (plantillas de Meta)

1. En `/settings/templates` → pestaña "Plantillas de Meta": crear
   `seguimiento_cotizacion` (es_MX, UTILITY,
   cuerpo con `{{1}}`).
   ✅ Queda en estado "Pendiente de Meta" (el mock devuelve PENDING).
2. Simular la aprobación: `POST /api/dev/wa-mock/template-status`
   `{ wabaId, name, language, event: "APPROVED" }`.
   ✅ El estado pasa a "Aprobada" (evento webhook enrutado por entry.id).
3. Camino infeliz: crear `promo_rechazada` y simular `REJECTED` con razón.
   ✅ Estado "Rechazada" mostrando la razón.
4. `POST /api/templates/sync` → 200 (pull por Graph; cubre modo agencia).

## Envío con ventana cerrada

5. Abrir una conversación con ventana cerrada en la bandeja.
   ✅ El composer bloqueado ahora lista la plantilla aprobada.
6. Elegirla, llenar la variable y enviar.
   ✅ El mensaje aparece en el hilo (tipo plantilla, cuerpo renderizado).
   ✅ El outbox del wa-mock registra `type: "template"` con `components`
   (`parameters[0].text` = valor de la variable).
7. Validaciones: enviar plantilla no aprobada → 422; variable faltante → 422.

## Respuestas rápidas

8. En `/settings/templates` → pestaña "Respuestas rápidas": crear
   `saludo-inicial` con cuerpo `¡Hola {{nombre}}! ¿En qué te ayudo?`.
   ✅ La vista previa muestra el texto ya sustituido con el contacto de ejemplo.
9. Crear una con atajo `Saludo Buenos DÍAS`.
   ✅ Avisa que se guardará como `#saludo-buenos-dias` (sin acentos ni espacios).
10. Crear una con `{{apellido}}`.
    ✅ Se bloquea el guardado: "Variables desconocidas: {{apellido}}".
11. Eliminar una respuesta rápida → desaparece de la lista.

## Menú `#` en el compositor

12. Abrir una conversación con **ventana abierta** y teclear `#`.
    ✅ Se abre el menú sobre el compositor con dos grupos marcados: rápidas (⚡)
    y de Meta (📄, con etiqueta "Meta").
13. Seguir tecleando `#salu`.
    ✅ Filtra en vivo por atajo y por nombre de plantilla.
14. Navegar con ↑ ↓ y presionar Enter sobre una **respuesta rápida**.
    ✅ **Enter INSERTA, no envía** — este es el caso crítico.
    ✅ El `#salu` se reemplaza por el texto con `{{nombre}}` ya sustituido, queda
    editable, y el cursor se posiciona al final de lo insertado.
    ✅ El contador de usos de esa respuesta sube en 1.
15. Presionar Escape con el menú abierto.
    ✅ El menú cierra y el texto queda intacto. Enter vuelve a enviar.
16. Teclear `#` y elegir una **plantilla de Meta**.
    ✅ NO pega texto: se envía como plantilla y aparece en el hilo.
17. Abrir una conversación con **ventana cerrada** y teclear `#`.
    ✅ El menú avisa "Ventana de 24 h cerrada: solo plantillas aprobadas por
    Meta" y **oculta las respuestas rápidas** (ofrecerlas sería ofrecer un error).
