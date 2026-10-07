# Precio por moneda de origen (EUR / USD) — Diseño

Fecha: 2026-10-07 · Estado: aprobado en conversación, pendiente de revisión del spec escrito

## Problema
Hoy todo precio se guarda en EUR. Para cargar un precio en dólares hay que convertirlo con una tasa en el momento de la carga (solo en la importación Excel de Suministros). Como la tasa EUR/USD cambia a diario, un mismo producto brasileño no puede mantener un precio estable en USD. El formulario manual de Productos solo acepta EUR.

## Objetivo
Cada producto se cotiza y guarda **en su moneda de origen** (USD para Brasil, EUR para Europa), sin conversión al cargar. Los pedidos muestran subtotales separados por moneda.

## Decisiones del cliente
- Un producto viene siempre del mismo origen → una sola moneda por producto.
- Precio cambia → pedidos ya hechos conservan el precio del día.
- Pedido con ambas monedas → dos totales separados (USD y EUR), sin convertir.
- La factura se emite en otro sistema, en ARS → no se toca la facturación (flag manual por pedido).
- Reportes / análisis por cliente → siempre separados por moneda.
- Excel de ingresos: cada proveedor usa siempre la misma moneda → no hace falta columna `Moneda`.
- Productos existentes: quedan en EUR; la moneda se corrige editando el producto o reimportando.

## Diseño

### Datos (migración aditiva, idempotente)
- `productos.moneda VARCHAR(3) NOT NULL DEFAULT 'EUR'` (valores `EUR`|`USD`).
- `contiene.moneda VARCHAR(3) NOT NULL DEFAULT 'EUR'`: snapshot de la moneda del producto al armar el pedido (junto al `precio_unitario` que ya es snapshot).
- `pedidos.total_eur`, `pedidos.total_usd` `DECIMAL(12,2) NOT NULL DEFAULT 0` y `pedidos.multimoneda TINYINT(1) NOT NULL DEFAULT 0`.
  - Backfill: `total_eur = total` (los totales históricos están en EUR base), `total_usd = 0`, `multimoneda = 0`.
  - Pedidos nuevos: `multimoneda = 1`. Las columnas `moneda`, `tasa_cambio`, `subtotal`, `total` se conservan sin cambios para los pedidos históricos.
- `descuento_total` / `impuesto_total` no se usan en la UI (siempre 0); en pedidos nuevos no se aplican.
- No se convierte ni modifica ningún dato histórico.

### Backend
- `Producto` model + `validateProducto`: campo `moneda` (opcional en alta, default EUR; `isIn(['EUR','USD'])`).
- `pedido.controller`: al crear/editar items, tomar `precio` y `moneda` desde la DB (no del body), guardarlos en `contiene`. Reemplazar `recalcTotales` por suma por moneda → `total_eur` / `total_usd`. Dejar de leer `moneda`/`tasa` del body para pedidos nuevos (se guarda `moneda='EUR'`, `tasa_cambio=1`, `multimoneda=1`). El `addItem` por línea sigue el mismo criterio.
- `import.controller`: el body trae `moneda` (EUR|USD) **sin `tasa_cambio`**; el precio se guarda tal cual y `productos.moneda` se fija a esa moneda (alta y actualización). Se elimina la división por tasa.
- `producto.controller` export de stock: columnas `Precio`, `Moneda`, `Total`; sin conversión con tasa. Totales agregados por moneda.
- Auditoría: `moneda` entra en los campos auditables de producto (cambio de moneda queda registrado).

### Frontend
- `Productos.jsx`: selector EUR/USD junto al precio en el formulario; se elimina el toggle global EUR/USD y el input de tasa; cada precio se formatea en su moneda (`US$ 12,50` / `12,50 €`). Stat de valor de inventario separado por moneda.
- `Suministros.jsx`: el diálogo de importación mantiene "Moneda del Excel" pero se elimina el campo de tasa y el fetch a frankfurter.
- `Pedidos.jsx`: se elimina el selector de moneda del pedido y la tasa en pedidos nuevos; el selector de productos y el listado de items muestran cada precio en su moneda; subtotal en el modal y total en la grilla/impresión se muestran como dos montos (EUR y USD, omitiendo el que sea 0). Pedidos con `multimoneda = 0` siguen mostrándose con la lógica actual (moneda + tasa histórica). El resumen/análisis por cliente (`fmtEUR(summary.total)` etc.) pasa a mostrar dos valores por tarjeta.
- `Envios.jsx` (`Pedido.total` en €) y `Dashboard.jsx` (columna total en €): mostrar total correcto según `multimoneda` (a verificar en implementación qué representa `p.total` del Dashboard).

### Fuera de alcance
- Facturación / ARS, tasas de cambio automáticas, conversión entre monedas, columna `Moneda` en el Excel.

## Manejo de errores y compatibilidad
- Todo valor por defecto es EUR: si algo falla, el comportamiento de partida es el actual.
- Un producto que cambia de moneda no altera pedidos existentes (snapshot en `contiene`).
- Backup de la base antes de migrar (igual que `002_usd_to_eur_base_currency.sql`).

## Pruebas
- Migración: re-ejecutable; `total_eur` de histórico == `total`.
- Pedido solo-EUR, solo-USD y mixto: `total_eur`/`total_usd` correctos; editar y agregar/quitar línea recalcula bien.
- Importación Excel con USD: el precio queda sin cambios y el producto queda en USD; reimportar con otro valor actualiza el precio sin tasa.
- Cambiar el precio de un producto no modifica pedidos previos.
- Pedido histórico (`multimoneda = 0`) se ve igual que antes.
- Export de stock con productos de ambas monedas.

## Puntos abiertos (resolver al implementar)
- Qué representa exactamente `p.total` en `Dashboard.jsx:212`.
- Dónde más se agregan montos de pedidos en `Pedidos.jsx` (resumen por cliente, líneas ~830-870).
