# Guion E2E — US2: Contactos y embudo kanban

> Conducido con Playwright (MCP) contra `pnpm dev` con el entorno de pruebas
> interno. Continúa el estado del guion de US1 (contactos ya creados por
> mensajes entrantes).
>
> El embudo es un tablero kanban: columnas por etapa, arrastre entre ellas.
> Hacer clic en una tarjeta abre su conversación en la Bandeja. El cambio de
> estatus también se puede hacer desde el encabezado del hilo en la Bandeja.

## Auto-registro (FR-010)

1. Abrir `/contacts`.
   ✅ Los remitentes de US1 ("Cliente E2E", "Cliente Frio") existen como
   contactos con su nombre de perfil y teléfono.
2. Abrir `/pipeline`.
   ✅ Una columna por etapa; el encabezado de cada una es su badge rectangular
   de color con el contador de leads.
   ✅ Cada tarjeta es compacta (dos líneas): avatar, nombre, hora y extracto del
   último mensaje. Con ventana abierta lleva punto verde; con mensajes sin
   leer, contador.

## Kanban (FR-011/FR-012)

3. Arrastrar la tarjeta "Cliente E2E" de "Nuevo" a "En conversación".
   ✅ La columna destino se resalta al pasar por encima y la tarjeta cambia.
4. Recargar la página.
   ✅ La tarjeta sigue en "En conversación" (persistencia).
5. Hacer clic en la tarjeta.
   ✅ Navega a `/inbox?contact=<id>` con esa conversación abierta.

## Estatus desde la Bandeja

6. En la Bandeja, con la conversación abierta, el encabezado del hilo muestra
   el badge rectangular de su etapa con `▾`.
7. Abrirlo y elegir otra etapa del catálogo.
   ✅ El badge cambia de inmediato (optimista) y el lead se mueve; al volver a
   `/pipeline`, la tarjeta está en la columna nueva.
   ✅ El badge de etapa de la fila en la lista de conversaciones coincide.

## Tiempo real

8. Con `/pipeline` abierto, provocar un mensaje entrante (webhook o wa-mock).
   ✅ La tarjeta se actualiza sola, sin recargar (SSE con debounce de 500 ms).
9. Repetir mientras se arrastra una tarjeta.
   ✅ Las columnas NO se reordenan a media operación (guarda de arrastre).

## Gestión de etapas (FR-011)

10. "Etapas": renombrar una, cambiarle el tono de color, agregar "Cotizado",
    verificar que las anclas ganado/perdido no se pueden eliminar.
    ✅ El tono se refleja en el badge de la columna, en el selector del
    encabezado del hilo y en la bandeja: los tres leen el mismo valor.
11. Eliminar "Cotizado" (vacía) → desaparece.

## Contactos (FR-013)

12. Buscar por "Frio" → filtra; editar notas → persiste; archivar → desaparece
    de la lista (visible con "Ver archivados"); desarchivar → vuelve.
