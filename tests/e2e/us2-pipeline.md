# Guion E2E — US2: Contactos y embudo conversacional

> Conducido con Playwright (MCP) contra `pnpm dev` con el entorno de pruebas
> interno. Continúa el estado del guion de US1 (contactos ya creados por
> mensajes entrantes).
>
> El embudo dejó de ser un kanban de columnas: ahora es **vista dividida**
> (pestañas de etapa · columna de leads · conversación · panel del contacto).

## Auto-registro (FR-010)

1. Abrir `/contacts`.
   ✅ Los remitentes de US1 ("Cliente E2E", "Cliente Frio") existen como
   contactos con su nombre de perfil y teléfono.
2. Abrir `/pipeline`.
   ✅ Hay una pestaña por etapa, cada una con su badge de color y el número de
   leads. La primera etapa queda activa y su columna lista los leads.
   ✅ Cada tarjeta muestra avatar, nombre, hora y extracto del último mensaje.
   Con ventana abierta lleva punto verde; con mensajes sin leer, contador.

## Conversación dentro del embudo (FR-011/FR-012)

3. Hacer clic en la tarjeta "Cliente E2E".
   ✅ Su conversación se abre a la derecha: hilo, compositor y panel del
   contacto, sin salir de `/pipeline`.
   ✅ La URL queda como `/pipeline?stage=<id>&contact=<id>`.
4. Escribir y enviar un mensaje desde ahí.
   ✅ Aparece en el hilo y el extracto de la tarjeta se actualiza.
5. Recargar la página.
   ✅ Se restauran la misma etapa y la misma conversación (persistencia por URL).

## Movimiento de etapa — los tres caminos (FR-011)

6. **Arrastre**: tomar la tarjeta "Cliente E2E" y soltarla sobre la pestaña
   "En conversación".
   ✅ La pestaña se resalta como destino mientras se arrastra.
   ✅ El lead cambia de etapa y, por ser el que estaba abierto, **la vista lo
   sigue**: la pestaña activa pasa a "En conversación" y la conversación
   permanece abierta.
7. **Menú del encabezado**: con una conversación abierta, usar el badge `▾`
   junto al nombre y elegir otra etapa.
   ✅ Mismo resultado sin arrastrar (camino accesible y táctil; el tablero usa
   `PointerSensor` sin `KeyboardSensor`, así que el arrastre es solo puntero).
8. **Stepper del panel**: en el panel derecho, hacer clic en otra etapa.
   ✅ Mismo resultado.
9. Recargar tras cualquiera de los tres.
   ✅ El lead sigue en su etapa nueva (persistencia).

## Navegación entre etapas

10. Usar las flechas ‹ › del encabezado y las teclas ← →.
    ✅ Cambia la etapa activa; si el lead abierto no vive en la etapa nueva, se
    abre el primero de esa etapa. Si la etapa está vacía, la columna muestra
    "Sin leads en esta etapa".

## Tiempo real

11. Con `/pipeline` abierto, provocar un mensaje entrante (webhook o wa-mock).
    ✅ La tarjeta se actualiza sola, sin recargar (SSE con debounce de 500 ms).
12. Repetir mientras se arrastra una tarjeta.
    ✅ La lista NO se reordena a media operación (guarda de arrastre).

## Gestión de etapas (FR-011)

13. "Etapas": renombrar una, cambiarle el tono de color, agregar "Cotizado",
    verificar que las anclas ganado/perdido no se pueden eliminar.
    ✅ El tono elegido se refleja en la pestaña, en el badge del encabezado de la
    conversación y en la bandeja: los tres leen el mismo valor.
14. Eliminar la etapa activa.
    ✅ La vista salta a la primera etapa en vez de quedarse en blanco.
15. Eliminar "Cotizado" (vacía) → desaparece.

## Casos límite

16. Un contacto creado a mano en `/contacts` (sin conversación de WhatsApp)
    aparece como lead.
    ✅ Al abrirlo, el panel dice "Este lead todavía no tiene conversación de
    WhatsApp" y no se monta el compositor.

## Contactos (FR-013)

17. Buscar por "Frio" → filtra; editar notas → persiste; archivar → desaparece
    de la lista (visible con "Ver archivados"); desarchivar → vuelve.
