# Precio por moneda de origen (EUR / USD) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que cada producto se guarde en su moneda de origen (EUR o USD) sin conversión, y que los pedidos muestren subtotales separados por moneda.

**Architecture:** Columna `moneda` en `productos` y `contiene` (snapshot por línea); `pedidos` gana `total_eur`, `total_usd` y `multimoneda` (0 = pedido histórico que se sigue viendo con `moneda`+`tasa_cambio`; 1 = pedido nuevo). La lógica pura (sumar por moneda, formatear, vista de pedido) vive en dos módulos chicos con tests de `node --test` (sin dependencias nuevas); controladores y páginas los consumen.

**Tech Stack:** Node 22 (ESM) + Express 5 + Sequelize 6 + MariaDB; React + Vite; jsPDF; `node:test` para tests unitarios.

**Spec:** `docs/superpowers/specs/2026-10-07-precio-por-moneda-de-origen-design.md`

## Global Constraints

- Monedas válidas: exactamente `EUR` y `USD` (mayúsculas). Cualquier otro valor → `400` en la API de productos; en la importación se normaliza a `EUR`.
- Default de toda columna/campo nuevo de moneda: `EUR`. Si algo falla, el comportamiento de partida es el actual.
- Migración **aditiva e idempotente** (`ADD COLUMN IF NOT EXISTS`); no convierte ni borra datos históricos.
- El precio del pedido sale **siempre de la DB** (producto), nunca del body.
- No se convierte entre monedas en ninguna parte del sistema nuevo. Facturación (ARS, sistema externo) no se toca.
- Se conservan `pedidos.moneda`, `pedidos.tasa_cambio`, `pedidos.subtotal`, `pedidos.total` (histórico).
- Backend en ESM (`import`/`export`), frontend con estilos inline existentes; seguir el estilo del archivo que se edita. Textos de UI en español.
- **Seguridad de datos (innegociable):** ninguna prueba con datos corre contra `agromat` ni producción. Todo se prueba contra la copia `agromat_safety_copy` (`DB_NAME=agromat_safety_copy`, que pisa el `.env`). Ningún cambio puede alterar columnas, totales ni la visualización de pedidos, productos o líneas existentes; un pedido histórico se ve exactamente igual que antes salvo que se le agregue una línea en USD.
- **Orden de despliegue:** primero la migración 003, después el código nuevo (el código nuevo consulta las columnas nuevas). Volver atrás = redeplegar el código viejo; la base migrada es compatible con él (verificado).
- No hay framework de tests en el repo: los tests unitarios usan `node --test`; lo demás se verifica con SQL/curl y `npm run build` / `npm run lint` del frontend.

## Review Focus

- Editar un pedido **histórico** (`multimoneda = 0`) desde el modal (que siempre manda los ítems) sin agregar productos USD: debe seguir `multimoneda = 0`, con su moneda/tasa y su total intactos. Solo si se le agrega una línea USD pasa a `multimoneda = 1` (Task 4).
- Importación Excel sin columna de precio, o con precio vacío, sobre un producto existente: **no** debe cambiar su moneda ni su precio (Task 3).
- Moneda inválida o en minúsculas (`usd`, `ARS`, `""`) en alta/edición de producto o en el body de la importación (Tasks 2–3).
- Redondeo: sumar `0.1 + 0.2` por moneda debe dar `0.30`, no `0.30000000000000004` (Task 1).
- Pedido sin ítems o solo con una moneda: el total de la otra moneda no debe mostrarse como `0,00` espurio ni romper el PDF (Tasks 5, 8).
- Cambiar la moneda/precio de un producto no debe alterar pedidos ya hechos (Task 4, verificación SQL).

---

## File Structure

| Archivo | Responsabilidad |
|---|---|
| `backend/src/migrations/003_moneda_por_producto.sql` (nuevo) | Columnas nuevas + backfill |
| `backend/src/utils/moneda.js` (nuevo) | `MONEDAS`, `normalizarMoneda`, `sumarPorMoneda` (puro) |
| `backend/src/utils/moneda.test.js` (nuevo) | Tests de lo anterior |
| `backend/src/models/{Producto,Contiene,Pedido}.js` | Campos nuevos |
| `backend/src/middleware/validateProducto.js` | Validar `moneda` |
| `backend/src/controllers/producto.controller.js` | create/update con moneda; export sin tasa |
| `backend/src/controllers/import.controller.js` | Moneda sin conversión |
| `backend/src/controllers/pedido.controller.js` | Totales por moneda, snapshot de moneda |
| `backend/src/controllers/envio.controller.js`, `auditController.js` | Atributos / campos auditables |
| `frontend/src/utils/money.js` (nuevo) + `money.test.js` | Formato y vista de pedido (puro) |
| `frontend/src/api/productos.js` | Export sin tasa |
| `frontend/src/pages/{Productos,Suministros,Pedidos,Envios,Dashboard}.jsx` | UI |

---

### Task 1: Migración, modelos y helper de moneda del backend

**Files:**
- Create: `backend/src/migrations/003_moneda_por_producto.sql`
- Create: `backend/src/utils/moneda.js`
- Test: `backend/src/utils/moneda.test.js`
- Modify: `backend/package.json` (script `test`)
- Modify: `backend/src/models/Producto.js`, `backend/src/models/Contiene.js`, `backend/src/models/Pedido.js`

**Interfaces:**
- Produces: `MONEDAS: ['EUR','USD']`; `normalizarMoneda(valor: any): 'EUR'|'USD'` (trim + mayúsculas, inválido → `'EUR'`); `sumarPorMoneda(lineas: {moneda?: string, subtotal_linea: number|string|null}[]): { total_eur: number, total_usd: number }`.
- Produces (DB/modelos): `productos.moneda`, `contiene.moneda`, `pedidos.total_eur`, `pedidos.total_usd`, `pedidos.multimoneda`.

- [ ] **Step 1: Escribir el test que falla**

`backend/src/utils/moneda.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import { MONEDAS, normalizarMoneda, sumarPorMoneda } from "./moneda.js";

test("MONEDAS contiene solo EUR y USD", () => {
  assert.deepEqual(MONEDAS, ["EUR", "USD"]);
});

test("normalizarMoneda acepta minúsculas y espacios", () => {
  assert.equal(normalizarMoneda(" usd "), "USD");
  assert.equal(normalizarMoneda("eur"), "EUR");
});

test("normalizarMoneda cae a EUR con valores inválidos", () => {
  assert.equal(normalizarMoneda("ARS"), "EUR");
  assert.equal(normalizarMoneda(""), "EUR");
  assert.equal(normalizarMoneda(null), "EUR");
  assert.equal(normalizarMoneda(undefined), "EUR");
});

test("sumarPorMoneda separa EUR y USD", () => {
  const r = sumarPorMoneda([
    { moneda: "EUR", subtotal_linea: "10.50" },
    { moneda: "USD", subtotal_linea: 20 },
    { moneda: "EUR", subtotal_linea: 4.5 },
  ]);
  assert.deepEqual(r, { total_eur: 15, total_usd: 20 });
});

test("sumarPorMoneda no arrastra error de punto flotante", () => {
  const r = sumarPorMoneda([
    { moneda: "USD", subtotal_linea: 0.1 },
    { moneda: "USD", subtotal_linea: 0.2 },
  ]);
  assert.equal(r.total_usd, 0.3);
});

test("sumarPorMoneda con lista vacía o subtotales nulos devuelve ceros", () => {
  assert.deepEqual(sumarPorMoneda([]), { total_eur: 0, total_usd: 0 });
  assert.deepEqual(sumarPorMoneda([{ moneda: "USD", subtotal_linea: null }]), { total_eur: 0, total_usd: 0 });
});

test("sumarPorMoneda trata moneda ausente como EUR", () => {
  assert.deepEqual(sumarPorMoneda([{ subtotal_linea: 5 }]), { total_eur: 5, total_usd: 0 });
});
```

- [ ] **Step 2: Correr y verificar que falla**

Run: `cd backend && node --test src/utils/`
Expected: FAIL (`Cannot find module './moneda.js'`).

- [ ] **Step 3: Implementar el helper y el script de test**

`backend/src/utils/moneda.js`:
```js
// src/utils/moneda.js
export const MONEDAS = ["EUR", "USD"];

export function normalizarMoneda(valor) {
  const m = String(valor ?? "").trim().toUpperCase();
  return MONEDAS.includes(m) ? m : "EUR";
}

// Suma subtotales por moneda en centavos para evitar errores de punto flotante.
export function sumarPorMoneda(lineas) {
  const centavos = { EUR: 0, USD: 0 };
  for (const l of lineas) {
    centavos[normalizarMoneda(l.moneda)] += Math.round(Number(l.subtotal_linea || 0) * 100);
  }
  return { total_eur: centavos.EUR / 100, total_usd: centavos.USD / 100 };
}
```

En `backend/package.json`, dentro de `"scripts"` agregar:
```json
"test": "node --test src/utils/"
```

- [ ] **Step 4: Verificar que pasa**

Run: `cd backend && npm test`
Expected: PASS (7 tests).

- [ ] **Step 5: Migración SQL**

`backend/src/migrations/003_moneda_por_producto.sql`:
```sql
-- ============================================================
-- MIGRACIÓN 003: Precio por moneda de origen (EUR / USD)
-- Fecha: 2026-10-07
-- ADITIVA e idempotente: no convierte ni borra datos.
--
-- INSTRUCCIONES:
-- 1. BACKUP: mysqldump -u root -p agromat_db > backup_pre_003.sql
-- 2. APAGAR la app: pm2 stop agromat
-- 3. Ejecutar: mysql -u root -p agromat_db < 003_moneda_por_producto.sql
-- 4. Verificar (queries al final), desplegar código, pm2 restart agromat
-- ============================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE contiene
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS total_eur   DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_usd   DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multimoneda TINYINT(1)    NOT NULL DEFAULT 0;

-- Backfill: los totales históricos están en EUR base.
-- Solo toca pedidos históricos sin migrar (multimoneda = 0 y total_eur = 0).
UPDATE pedidos
SET total_eur = total, total_usd = 0
WHERE multimoneda = 0 AND total_eur = 0 AND total <> 0;

-- ---------- Verificación ----------
-- SELECT COUNT(*) AS pedidos_con_diferencia FROM pedidos WHERE multimoneda = 0 AND total_eur <> total;  -- esperado 0
-- SELECT moneda, COUNT(*) FROM productos GROUP BY moneda;                                              -- todo EUR
-- SELECT moneda, COUNT(*) FROM contiene GROUP BY moneda;                                               -- todo EUR
```

- [ ] **Step 6: Modelos**

`backend/src/models/Producto.js`: reemplazar el bloque de `precio` por
```js
    precio: {
      type: DataTypes.DECIMAL(10, 2), // Precio en la moneda del producto (ver `moneda`)
      allowNull: false,
    },
    moneda: {
      type: DataTypes.STRING(3), // 'EUR' | 'USD' — moneda de origen del precio
      allowNull: false,
      defaultValue: "EUR",
    },
```

`backend/src/models/Contiene.js`: después de `subtotal_linea` agregar
```js
  moneda: { type: DataTypes.STRING(3), allowNull: false, defaultValue: "EUR" },
```

`backend/src/models/Pedido.js`: después del campo `total` agregar
```js
    // Totales por moneda (pedidos nuevos). En históricos total_eur = total.
    total_eur: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total_usd: {
      type: DataTypes.DECIMAL(12, 2),
      allowNull: false,
      defaultValue: 0,
    },
    // 0 = histórico (se muestra con moneda + tasa_cambio); 1 = por línea
    multimoneda: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
```

- [ ] **Step 7: Aplicar la migración en la base de desarrollo y verificar**

Run (sobre la copia `agromat_safety_copy`, **nunca** `agromat` ni producción; ya está creada y migrada con este mismo SQL, repetirla debe ser inocua): `mariadb -u root -p agromat_safety_copy < backend/src/migrations/003_moneda_por_producto.sql` y luego las 3 queries de verificación del final del archivo.
Expected: `pedidos_con_diferencia = 0`; todos los `moneda` = `EUR`. Ejecutarla una segunda vez no debe dar error.

- [ ] **Step 8: Commit**

```bash
git add backend/src/utils backend/package.json backend/src/migrations/003_moneda_por_producto.sql backend/src/models
git commit -m "feat(moneda): migración 003, modelos y helper de moneda"
```

---

### Task 2: API de productos con moneda

**Files:**
- Modify: `backend/src/middleware/validateProducto.js`
- Modify: `backend/src/controllers/producto.controller.js` (createProducto ~l.150, exportarProductosExcel ~l.467-560)
- Modify: `backend/src/controllers/auditController.js:23`
- Modify: `frontend/src/api/productos.js:20-28`

**Interfaces:**
- Consumes: `normalizarMoneda`, `MONEDAS` (Task 1).
- Produces: `POST/PUT /api/productos` aceptan `moneda: 'EUR'|'USD'`; `GET /api/productos/exportar-excel` ya no usa `tasa`/`moneda`; frontend `descargarInventarioExcel()` sin parámetros.

- [ ] **Step 1: Validadores**

En `validateProducto.js`, en `validateProductoCreate` y `validateProductoUpdate`, justo después del bloque `body("precio")` de cada uno, agregar:
```js
  body("moneda")
    .optional()
    .isIn(["EUR", "USD"])
    .withMessage("La moneda debe ser EUR o USD"),
```

- [ ] **Step 2: createProducto (rama "producto existente")**

En `producto.controller.js`, dentro de `existente.update({...})` agregar `moneda: datos.moneda ?? existente.moneda,` después de `precio: datos.precio,`. (La rama `Producto.create(datos, …)` y `updateProducto` ya propagan `moneda` porque pasan `datos`/`...datos` y el modelo tiene el campo.)

- [ ] **Step 3: Export de inventario sin tasa**

En `exportarProductosExcel`:
- Eliminar `const { tasa } = req.query;` y `const tasaCambio = ...;` (y el comentario de la tasa) y cambiar el comentario del encabezado a `MODIFICADO: Precio en su moneda de origen, sin conversión`.
- Reemplazar el bloque que calcula `precioEUR/totalEUR/precioUSD/totalUSD` y el objeto devuelto por:
```js
      const stock = Number(p.stock);
      const precio = Number(p.precio);
      const moneda = p.moneda === "USD" ? "USD" : "EUR";

      return {
        "Código": p.id_producto,
        "Producto": p.nombre_producto,
        "Proveedor": p.Proveedor?.nombre_proveedor || "Sin proveedor",
        "Ubicación": ubicacionTexto,
        "Stock": stock,
        "Moneda": moneda,
        "Precio": precio,
        "Total": Math.round(precio * stock * 100) / 100,
        "Último Ingreso": fecha_ultimo_ingreso,
        "Última Salida": fecha_ultimo_egreso
      };
    });

    // Totales de inventario por moneda (sin mezclar)
    const totalPorMoneda = (m) =>
      datosExcel.filter((r) => r.Moneda === m).reduce((acc, r) => acc + r.Total, 0);
    datosExcel.push(
      { "Código": "TOTAL EUR", "Total": Math.round(totalPorMoneda("EUR") * 100) / 100 },
      { "Código": "TOTAL USD", "Total": Math.round(totalPorMoneda("USD") * 100) / 100 }
    );
```
  (el `});` que cerraba el `.map` ya está incluido arriba: borrar el original para no duplicarlo.)
- Reemplazar el array `workSheet["!cols"]` por:
```js
    workSheet["!cols"] = [
        { wch: 15 }, // Código
        { wch: 30 }, // Producto
        { wch: 20 }, // Proveedor
        { wch: 20 }, // Ubicación
        { wch: 8 },  // Stock
        { wch: 8 },  // Moneda
        { wch: 12 }, // Precio
        { wch: 15 }, // Total
        { wch: 15 }, // Ingreso
        { wch: 15 }  // Salida
    ];
```
- Cambiar el filename a `Inventario_Global_${dateStr}.xlsx` (ya es así; no tocar).

- [ ] **Step 4: Auditoría**

En `auditController.js:23` cambiar `campos: ["precio", "precio_unitario"],` por `campos: ["precio", "precio_unitario", "moneda"],`.

- [ ] **Step 5: Frontend API**

En `frontend/src/api/productos.js` reemplazar el bloque `descargarInventarioExcel` (y su comentario) por:
```js
// Inventario con cada precio en su moneda de origen (sin conversión)
export const descargarInventarioExcel = () =>
  api.get("/productos/exportar-excel", { responseType: "blob" });
```

- [ ] **Step 6: Verificar**

Run: `cd backend && node --check src/controllers/producto.controller.js && node --check src/middleware/validateProducto.js`
Expected: sin salida (OK).
Con el backend de desarrollo levantado y un token válido (`TOKEN`):
- `curl -s -X POST localhost:PORT/api/productos -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' -d '{"id_producto":"T-USD-1","nombre_producto":"Prueba USD","id_proveedor":1,"precio":10,"stock":1,"moneda":"USD"}'` → `201` y `"moneda":"USD"`.
- Mismo request con `"moneda":"ARS"` → `400` con mensaje `La moneda debe ser EUR o USD`.
- `GET /api/productos/exportar-excel` abre un xlsx con columnas `Moneda`, `Precio`, `Total` y dos filas `TOTAL EUR` / `TOTAL USD`.
(Borrar luego el producto `T-USD-1`.)

- [ ] **Step 7: Commit**

```bash
git add backend/src frontend/src/api/productos.js
git commit -m "feat(productos): moneda por producto en API y export sin conversión"
```

---

### Task 3: Importación Excel sin conversión

**Files:**
- Modify: `backend/src/controllers/import.controller.js` (l.1-2, l.30-31, l.88-103, l.121-155 aprox. del bloque de productos)

**Interfaces:**
- Consumes: `normalizarMoneda` (Task 1).
- Produces: `POST /api/suministro/importar` (multipart) con campo `moneda` ('EUR'|'USD'); `tasa_cambio` se ignora. El precio se guarda tal cual y fija `productos.moneda` solo si la fila trae precio.

- [ ] **Step 1: Import y destructuring**

Al inicio, junto a los imports, agregar:
```js
import { normalizarMoneda } from "../utils/moneda.js";
```
Reemplazar
```js
    // 👇 Recibimos datos del body, incluyendo moneda y tasa
    const { id_proveedor, fecha_llegada, hora_llegada, id_empleado, moneda, tasa_cambio } = req.body;
```
por
```js
    // Moneda del Excel: el precio se guarda tal cual, sin conversión
    const { id_proveedor, fecha_llegada, hora_llegada, id_empleado } = req.body;
    const monedaImport = normalizarMoneda(req.body.moneda);
```

- [ ] **Step 2: Quitar la conversión**

Reemplazar el bloque
```js
          precioValidado = parsed;

          // 💶 CONVERSIÓN DE DIVISA
          if (moneda === 'USD' && tasa_cambio) {
            const tasa = parseFloat(tasa_cambio);
            if (!isNaN(tasa) && tasa > 0) {
              precioValidado = precioValidado / tasa;
            }
          }
```
por
```js
          precioValidado = parsed;
```

- [ ] **Step 3: Guardar la moneda junto al precio**

En la creación del producto agregar `moneda: monedaImport,` debajo de `precio: precio !== null ? precio : 0,`.
En la actualización de producto existente reemplazar `{ precio: precio },` por `{ precio: precio, moneda: monedaImport },` (solo corre cuando `precio !== null`, así que una fila sin precio **no** cambia la moneda).

- [ ] **Step 4: Verificar**

Run: `cd backend && node --check src/controllers/import.controller.js`
Expected: OK. Prueba manual (dev): importar un Excel con `Precio = 100` eligiendo USD → `SELECT precio, moneda FROM productos WHERE id_producto='<codigo>'` devuelve `100.00 | USD` (no `100/tasa`). Importar otro Excel sin columna de precio para el mismo código → precio y moneda no cambian.

- [ ] **Step 5: Commit**

```bash
git add backend/src/controllers/import.controller.js
git commit -m "feat(importacion): guardar precio en su moneda sin convertir"
```

---

### Task 4: Pedidos — totales por moneda y snapshot de moneda

**Files:**
- Modify: `backend/src/controllers/pedido.controller.js` (imports, `recalcTotales` l.28-33, `getAllPedidos`/`getPedidoById` l.92 y l.111, `createPedido`, `updatePedido`, `addPedidoItem`, `deletePedidoItem`)
- Modify: `backend/src/controllers/envio.controller.js:33,54`

**Interfaces:**
- Consumes: `sumarPorMoneda`, `normalizarMoneda` (Task 1); campos de modelo (Task 1).
- Produces: respuestas de pedidos incluyen `total_eur`, `total_usd`, `multimoneda`, y por línea `Contiene.moneda`; `Producto.moneda` en el include.

- [ ] **Step 1: Imports y `recalcTotales`**

Agregar arriba: `import { sumarPorMoneda, normalizarMoneda } from "../utils/moneda.js";`

Reemplazar `recalcTotales` por:
```js
async function recalcTotales(id_pedido, descuento_total = 0, impuesto_total = 0, t, auditOptions = {}) {
  const lineas = await Contiene.findAll({
    where: { id_pedido },
    attributes: ["moneda", "subtotal_linea"],
    transaction: t,
    raw: true,
  });
  const { total_eur, total_usd } = sumarPorMoneda(lineas);
  const subtotal = total_eur;
  const total = Number(subtotal) - Number(descuento_total) + Number(impuesto_total);
  const cambios = { subtotal, descuento_total, impuesto_total, total, total_eur: total, total_usd };
  // Un pedido histórico solo pasa a modo por-línea si ahora tiene líneas USD.
  // Sin líneas USD conserva su moneda/tasa/visualización exactamente como estaba.
  if (lineas.some((l) => normalizarMoneda(l.moneda) === "USD")) {
    Object.assign(cambios, { multimoneda: true, moneda: "EUR", tasa_cambio: 1 });
  }
  await Pedido.update(cambios, { where: { id_pedido }, transaction: t, ...auditOptions });
  return { subtotal, descuento_total, impuesto_total, total, total_eur: total, total_usd };
}
```

- [ ] **Step 2: Includes de lectura**

En `getAllPedidos` y `getPedidoById` reemplazar el include de Producto por:
```js
        { model: Producto, through: { attributes: ["cantidad", "precio_unitario", "subtotal_linea", "moneda"] }, attributes: ["id_producto", "nombre_producto", "precio", "moneda"] },
```

- [ ] **Step 3: `createPedido`**

- Quitar `moneda, tasa // Recibimos la configuración de divisa` del destructuring (dejar `numero_remito,` como última clave, sin coma colgante) y borrar las dos líneas `const monedaFinal…` / `const tasaFinal…`.
- En `Pedido.create({...})` reemplazar `moneda: monedaFinal, tasa_cambio: tasaFinal` por `moneda: "EUR", tasa_cambio: 1, multimoneda: true`.
- Reemplazar el bloque de preparación de ítems (desde `// Preparar Items` hasta el cierre del `.map`) por:
```js
    // Preparar Items: precio y moneda SIEMPRE desde la DB (snapshot por línea)
    const productIds = items.map(i => i.id_producto);
    const dbProducts = await Producto.findAll({
        where: { id_producto: productIds },
        attributes: ['id_producto', 'precio', 'moneda'],
        transaction: t
    });

    const lineas = items.map((i) => {
      const prodDB = dbProducts.find(p => p.id_producto === i.id_producto);
      const precio = prodDB ? Number(prodDB.precio) : 0;

      return {
        id_pedido: pedido.id_pedido,
        id_producto: i.id_producto,
        cantidad: i.cantidad,
        precio_unitario: precio,
        moneda: normalizarMoneda(prodDB?.moneda),
        subtotal_linea: (precio * Number(i.cantidad)).toFixed(2),
      };
    });
```

- [ ] **Step 4: `updatePedido`**

- En el destructuring dejar `const { items, moneda, tasa, tasa_cambio, multimoneda, total_eur, total_usd, ...headerData } = req.body;` (para que el cliente no pueda pisar los totales).
- Reemplazar el bloque `// Fetch fresh prices…` hasta el cierre de `lineas` por el mismo código del Step 3 (con `id_pedido: id`).
- Reemplazar la llamada final por:
```js
    const tot = await recalcTotales(pedido.id_pedido, headerData.descuento_total ?? pedido.descuento_total, headerData.impuesto_total ?? pedido.impuesto_total, t, auditOptions);
```
(Sin cambios en la firma original: el pase a modo por-línea lo decide `recalcTotales` solo si hay líneas USD.)

- [ ] **Step 5: `addPedidoItem` y `deletePedidoItem`**

En `addPedidoItem` reemplazar el bloque `// Usar precio de BD…` por:
```js
    // Usar precio y moneda de BD en vez de confiar en el body
    const precio = Number(producto.precio) || 0;
    await Contiene.create({
      id_pedido: id, id_producto, cantidad,
      precio_unitario: precio,
      moneda: normalizarMoneda(producto.moneda),
      subtotal_linea: calcSubtotalLine(cantidad, precio),
    }, { transaction: t, ...auditOptions });
```
(la llamada a `recalcTotales` de ese handler queda como está: ya no recibe parámetro extra).
`deletePedidoItem` queda como está (borrar una línea no cambia la moneda de las demás).

- [ ] **Step 6: Envíos**

En `envio.controller.js` (las dos apariciones, l.33 y l.54) cambiar `attributes: ["id_pedido", "status", "total", "direccion_envio", "numero_remito"]` por `attributes: ["id_pedido", "status", "total", "total_eur", "total_usd", "multimoneda", "direccion_envio", "numero_remito"]`.

- [ ] **Step 7: Verificar**

Run: `cd backend && node --check src/controllers/pedido.controller.js && node --check src/controllers/envio.controller.js`
Expected: OK. Levantar el backend contra la copia (`cd backend && DB_NAME=agromat_safety_copy node src/app.js`) y usar un producto `A` (EUR, 10) y uno `B` (USD, 20) creados para la prueba (borrarlos y los pedidos de prueba al terminar):
1. `POST /api/pedidos` con items `A x2` y `B x1` → respuesta con `total_eur: 20`, `total_usd: 20`, `multimoneda: true`.
2. `UPDATE productos SET precio = 99, moneda='EUR' WHERE id_producto='B'` y `GET /api/pedidos` → ese pedido sigue con la línea de B en `USD`/`20` (snapshot intacto).
3. Pedido histórico (`multimoneda = 0`, p. ej. el que tiene `moneda='USD'`, `tasa_cambio=1.1886`): un `PUT` solo de estado **y** un `PUT` que reenvía sus mismos ítems EUR dejan `multimoneda = 0`, `moneda`, `tasa_cambio` y `total` idénticos a antes. Un `PUT` o `POST /items` que agrega un producto USD lo pasa a `multimoneda = 1`, `moneda='EUR'`, `tasa_cambio=1`.
4. `GET /api/pedidos`: los históricos tienen `total_eur == total` y `multimoneda` 0.

- [ ] **Step 8: Commit**

```bash
git add backend/src/controllers/pedido.controller.js backend/src/controllers/envio.controller.js
git commit -m "feat(pedidos): líneas con moneda y totales separados EUR/USD"
```

---

### Task 5: Helper de dinero del frontend

**Files:**
- Create: `frontend/src/utils/money.js`
- Test: `frontend/src/utils/money.test.js`
- Modify: `frontend/package.json` (script `test`)

**Interfaces:**
- Produces (todas puras):
  - `normalizarMoneda(m): 'EUR'|'USD'`
  - `formatMonto(valor, moneda): string` — Intl `es-ES` moneda (UI)
  - `formatMontoPlano(valor, moneda): string` — `1.234,50 €` / `1.234,50 $` (PDF/HTML, igual al `fmt` actual)
  - `formatTotales({ eur, usd }): string` — monedas con monto ≠ 0 unidas con ` + `; si ambos 0 → `0,00 €`
  - `totalesPorMoneda(items): { eur, usd }` — items con `{cantidad, precio_unitario, moneda}`
  - `textoTotalPedido(pedido): string` — histórico (`!multimoneda`): `total` × tasa si `moneda==='USD'`; nuevo: `formatTotales({eur: total_eur, usd: total_usd})`
  - `aportePedido(p): { eur: number, usd: number }` — histórico (`!multimoneda`): `{eur: Number(p.total), usd: 0}` (no depende del backfill); nuevo: `{eur: total_eur, usd: total_usd}`
  - `vistaPedido(pedido): { legacy: boolean, lineas: {…item, moneda, precio, subtotal}[], grupos: {moneda, subtotal}[] }`

- [ ] **Step 1: Test que falla**

`frontend/src/utils/money.test.js`:
```js
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarMoneda, formatMontoPlano, formatTotales, totalesPorMoneda,
  textoTotalPedido, vistaPedido, aportePedido,
} from "./money.js";

const sinNbsp = (s) => s.replace(/ /g, " ");

test("normalizarMoneda", () => {
  assert.equal(normalizarMoneda("usd"), "USD");
  assert.equal(normalizarMoneda("xxx"), "EUR");
  assert.equal(normalizarMoneda(undefined), "EUR");
});

test("formatMontoPlano", () => {
  assert.equal(sinNbsp(formatMontoPlano(1234.5, "EUR")), "1.234,50 €");
  assert.equal(sinNbsp(formatMontoPlano(10, "USD")), "10,00 $");
});

test("formatTotales omite la moneda en cero", () => {
  assert.ok(!formatTotales({ eur: 20, usd: 0 }).includes("US$"));
  assert.ok(sinNbsp(formatTotales({ eur: 20, usd: 0 })).includes("20,00"));
  assert.ok(formatTotales({ eur: 20, usd: 5 }).includes(" + "));
  assert.ok(sinNbsp(formatTotales({ eur: 0, usd: 0 })).includes("0,00"));
});

test("totalesPorMoneda separa y redondea", () => {
  const r = totalesPorMoneda([
    { cantidad: 1, precio_unitario: 0.1, moneda: "USD" },
    { cantidad: 1, precio_unitario: 0.2, moneda: "USD" },
    { cantidad: 2, precio_unitario: 10, moneda: "EUR" },
  ]);
  assert.deepEqual(r, { eur: 20, usd: 0.3 });
});

test("textoTotalPedido histórico USD usa la tasa guardada", () => {
  const t = sinNbsp(textoTotalPedido({ multimoneda: 0, moneda: "USD", tasa_cambio: 2, total: 10 }));
  assert.ok(t.includes("20,00"));
});

test("textoTotalPedido nuevo muestra ambas monedas", () => {
  const t = textoTotalPedido({ multimoneda: 1, total_eur: 20, total_usd: 20 });
  assert.ok(t.includes(" + "));
});

test("aportePedido histórico usa total (no total_eur) y nuevo usa total_eur/usd", () => {
  assert.deepEqual(aportePedido({ multimoneda: 0, total: "12.50", total_eur: 0, total_usd: 0 }), { eur: 12.5, usd: 0 });
  assert.deepEqual(aportePedido({ multimoneda: 1, total: 20, total_eur: 20, total_usd: 7 }), { eur: 20, usd: 7 });
  assert.deepEqual(aportePedido({ multimoneda: 0 }), { eur: 0, usd: 0 });
});

test("vistaPedido histórico: una sola moneda con tasa aplicada", () => {
  const v = vistaPedido({
    multimoneda: 0, moneda: "USD", tasa_cambio: 2,
    items: [{ id_producto: "A", cantidad: 3, precio_unitario: 10 }],
  });
  assert.equal(v.legacy, true);
  assert.deepEqual(v.grupos, [{ moneda: "USD", subtotal: 60 }]);
  assert.equal(v.lineas[0].precio, 20);
});

test("vistaPedido nuevo: un grupo por moneda presente", () => {
  const v = vistaPedido({
    multimoneda: 1,
    items: [
      { id_producto: "A", cantidad: 2, precio_unitario: 10, moneda: "EUR" },
      { id_producto: "B", cantidad: 1, precio_unitario: 20, moneda: "USD" },
    ],
  });
  assert.deepEqual(v.grupos, [{ moneda: "EUR", subtotal: 20 }, { moneda: "USD", subtotal: 20 }]);
});

test("vistaPedido sin ítems devuelve un grupo EUR en cero", () => {
  assert.deepEqual(vistaPedido({ multimoneda: 1, items: [] }).grupos, [{ moneda: "EUR", subtotal: 0 }]);
});
```

- [ ] **Step 2: Correr y ver que falla**

Run: `cd frontend && node --test src/utils/`
Expected: FAIL (`Cannot find module './money.js'`).

- [ ] **Step 3: Implementar**

`frontend/src/utils/money.js`:
```js
// frontend/src/utils/money.js
const MONEDAS = ["EUR", "USD"];

export function normalizarMoneda(m) {
  const u = String(m ?? "").trim().toUpperCase();
  return MONEDAS.includes(u) ? u : "EUR";
}

export function formatMonto(valor, moneda) {
  return Number(valor || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: normalizarMoneda(moneda),
  });
}

// Para PDF / HTML de SweetAlert (mismo formato que el fmt histórico)
export function formatMontoPlano(valor, moneda) {
  const n = Number(valor || 0).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return n + (normalizarMoneda(moneda) === "USD" ? " $" : " €");
}

const aCentavos = (v) => Math.round(Number(v || 0) * 100);

export function formatTotales({ eur = 0, usd = 0 }) {
  const partes = [];
  if (Number(eur) !== 0) partes.push(formatMonto(eur, "EUR"));
  if (Number(usd) !== 0) partes.push(formatMonto(usd, "USD"));
  return partes.length ? partes.join(" + ") : formatMonto(0, "EUR");
}

export function totalesPorMoneda(items = []) {
  const c = { EUR: 0, USD: 0 };
  for (const it of items) {
    c[normalizarMoneda(it.moneda)] += aCentavos(Number(it.cantidad) * Number(it.precio_unitario));
  }
  return { eur: c.EUR / 100, usd: c.USD / 100 };
}

export function aportePedido(p) {
  if (!Number(p.multimoneda)) return { eur: Number(p.total) || 0, usd: 0 };
  return { eur: Number(p.total_eur) || 0, usd: Number(p.total_usd) || 0 };
}

export function textoTotalPedido(p) {
  if (!Number(p.multimoneda)) {
    const mon = normalizarMoneda(p.moneda);
    const tasa = Number(p.tasa_cambio) || 1;
    const valor = mon === "USD" ? Number(p.total) * tasa : Number(p.total);
    return formatMonto(valor, mon);
  }
  return formatTotales({ eur: p.total_eur, usd: p.total_usd });
}

// Vista unificada para PDF y detalle: histórico = una moneda con tasa; nuevo = por línea.
export function vistaPedido(pedido) {
  const legacy = !Number(pedido.multimoneda);
  const monLegacy = normalizarMoneda(pedido.moneda);
  const factor = legacy && monLegacy === "USD" ? Number(pedido.tasa_cambio) || 1 : 1;

  const lineas = (pedido.items || []).map((it) => {
    const moneda = legacy ? monLegacy : normalizarMoneda(it.moneda);
    const precio = Number(it.precio_unitario) * factor;
    return { ...it, moneda, precio, subtotal: precio * Number(it.cantidad) };
  });

  const grupos = MONEDAS.filter((m) => lineas.some((l) => l.moneda === m)).map((m) => ({
    moneda: m,
    subtotal:
      lineas.filter((l) => l.moneda === m).reduce((acc, l) => acc + aCentavos(l.subtotal), 0) / 100,
  }));

  return { legacy, lineas, grupos: grupos.length ? grupos : [{ moneda: legacy ? monLegacy : "EUR", subtotal: 0 }] };
}
```

En `frontend/package.json`, dentro de `"scripts"` agregar `"test": "node --test src/utils/"`.

- [ ] **Step 4: Verificar**

Run: `cd frontend && npm test`
Expected: PASS (10 tests).

- [ ] **Step 5: Commit**

```bash
git add frontend/src/utils frontend/package.json
git commit -m "feat(moneda): helpers de formato y vista de pedido en el frontend"
```

---

### Task 6: Pantalla de Productos

**Files:**
- Modify: `frontend/src/pages/Productos.jsx` (emptyForm l.19-28; estados l.56-67; `formatCurrency`/`stats` l.95-115; normalización l.196; `handleExport` l.222-226; StatCard l.296; toggle l.302-307; celda precio l.383; input precio l.416; payload l.240)

**Interfaces:**
- Consumes: `formatMonto` de `../utils/money.js` (Task 5); `descargarInventarioExcel()` (Task 2).

- [ ] **Step 1: Import y formulario**

Agregar `import { formatMonto } from "../utils/money.js";` con los demás imports. En `emptyForm` agregar `moneda: "EUR",` después de `precio: "",`.

- [ ] **Step 2: Quitar el modo global de moneda y la tasa**

Eliminar el bloque `// Estados de Moneda (Base: EUR)` con `currency`, `exchangeRate` y su `useEffect` de frankfurter (l.56-67). Eliminar `formatCurrency` (l.95-101).

- [ ] **Step 3: Stats por moneda**

Reemplazar el `useMemo` de `stats` por:
```js
  const stats = useMemo(() => {
    const total = items.length;
    let sinStock = 0, bajoStock = 0, valorEUR = 0, valorUSD = 0;
    for (const p of items) {
      const stock = Number(p.existencias) || 0;
      const precio = Number(p.precio) || 0;
      if (stock === 0) sinStock++;
      else if (stock > 0 && stock <= lowStockThreshold) bajoStock++;
      if (p.moneda === "USD") valorUSD += stock * precio;
      else valorEUR += stock * precio;
    }
    return { total, sinStock, bajoStock, valorEUR, valorUSD };
  }, [items, lowStockThreshold]);
```
Reemplazar la `StatCard` de valor (l.296) por dos:
```jsx
        <StatCard title="Valor (EUR)" value={formatMonto(stats.valorEUR, "EUR")} colorText="#047857" colorValue="#047857" borderColor="#d1fae5" />
        <StatCard title="Valor (USD)" value={formatMonto(stats.valorUSD, "USD")} colorText="#047857" colorValue="#047857" borderColor="#d1fae5" />
```
Eliminar el toggle de moneda y el input de tasa (l.302-307: el `{["EUR","USD"].map…}` y `{currency === "USD" && <input … />}` junto con su contenedor si queda vacío; revisar que el JSX siga balanceado).

- [ ] **Step 4: Normalización, tabla y formulario**

- En el `map` de normalización agregar `moneda: p.moneda === "USD" ? "USD" : "EUR",` después de `precio: …`.
- Celda de precio: `{formatCurrency(row.precio)}` → `{formatMonto(row.precio, row.moneda)}`.
- Reemplazar el `<input … placeholder="Precio (EUR)" …/>` (l.416) por:
```jsx
                <div style={{ display: "flex", gap: "8px" }}>
                  <input type="number" step="0.01" placeholder="Precio" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} style={{ flex: 1, padding: "10px", border: "1px solid #ddd", borderRadius: "8px" }} />
                  <select value={form.moneda} onChange={e => setForm({...form, moneda: e.target.value})} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "8px" }}>
                    <option value="EUR">🇪🇺 EUR</option>
                    <option value="USD">🇺🇸 USD</option>
                  </select>
                </div>
```
- Al abrir el modal en modo edición, el `form` se arma desde el producto: verificar que copie `moneda` (si arma el objeto campo por campo, agregar `moneda: row.moneda`; si hace `{...row}`, ya viene).
- En `save` (l.240) el `payload = { ...form, precio: …}` ya incluye `moneda`; no cambia.

- [ ] **Step 5: Exportar**

Reemplazar en `handleExport`: `await descargarInventarioExcel(currency, exchangeRate);` por `await descargarInventarioExcel();` y `INVENTARIO_${currency}_${…}` por `INVENTARIO_${now.toISOString().slice(0, 10)}`.

- [ ] **Step 6: Verificar**

Run: `cd frontend && npm run lint -- src/pages/Productos.jsx && npm run build`
Expected: sin errores nuevos de lint (variables `currency`/`exchangeRate`/`formatCurrency` ya no deben aparecer: `grep -nE "currency|exchangeRate|formatCurrency" src/pages/Productos.jsx` sin resultados) y build OK. Prueba manual: crear producto con USD → se ve `US$` en la lista; editarlo a EUR; las dos tarjetas de valor suman por separado.

- [ ] **Step 7: Commit**

```bash
git add frontend/src/pages/Productos.jsx
git commit -m "feat(productos-ui): selector de moneda por producto y valores sin conversión"
```

---

### Task 7: Importación en Suministros

**Files:**
- Modify: `frontend/src/pages/Suministros.jsx` (l.25-26, l.76-82, diálogo l.170-186, `preConfirm` l.206-217, FormData l.229-231)

- [ ] **Step 1: Eliminar tasa**

Borrar el estado `exchangeRate` (l.25-26 con su comentario) y el `useEffect` de frankfurter (l.76-82 con su comentario).

- [ ] **Step 2: Diálogo**

Reemplazar desde `<label … >Moneda del Excel</label>` hasta el cierre del `div-tasa` por:
```html
          <label style="display:block; margin-bottom: 4px; font-weight:600;">Moneda del Excel</label>
          <div style="display:flex; gap: 15px; margin-bottom: 4px;">
            <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                <input type="radio" name="swal-moneda" value="EUR" checked>
                🇪🇺 Euros (EUR)
            </label>
            <label style="cursor:pointer; display:flex; align-items:center; gap:5px;">
                <input type="radio" name="swal-moneda" value="USD">
                🇺🇸 Dólares (USD)
            </label>
          </div>
          <small style="display:block; color:#666; margin-bottom:10px;">Los precios se guardan tal cual, en la moneda elegida (sin conversión).</small>
```

- [ ] **Step 3: `preConfirm` y FormData**

En `preConfirm` quitar `const tasa = …` y la propiedad `tasa_cambio: tasa`. Quitar la línea `formData.append("tasa_cambio", formValues.tasa_cambio);` y cambiar el comentario `// Enviamos moneda y tasa` por `// Moneda del Excel (sin conversión)`.

- [ ] **Step 4: Verificar**

Run: `cd frontend && npm run build && grep -nE "exchangeRate|tasa|frankfurter" src/pages/Suministros.jsx`
Expected: build OK; el grep no devuelve nada. Prueba manual: importar un Excel eligiendo USD y comprobar en Productos que el precio queda en USD sin dividir.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/Suministros.jsx
git commit -m "feat(suministros): importación sin tasa de cambio"
```

---

### Task 8: Pantalla de Pedidos

**Files:**
- Modify: `frontend/src/pages/Pedidos.jsx` (imports l.1-12; estados l.228-236; `formatMoney` l.286-295; `descargarPDF` l.301-440; `verDetalles` l.425-500; `summary` l.536-566; `fmtEUR` l.569; `marcarFacturadoRapido` l.593; `load` l.263-270; `save` l.645-651; `totalCalculado` l.661; grilla l.947; botón Editar l.963; selector de moneda l.1055-1062; sección de ítems l.1147-1226)

**Interfaces:**
- Consumes: `formatMonto`, `formatMontoPlano`, `formatTotales`, `totalesPorMoneda`, `textoTotalPedido`, `vistaPedido`, `aportePedido` (Task 5); campos de API (Task 4).

- [ ] **Step 1: Import, estados y `formatMoney`**

Agregar `import { formatMonto, formatMontoPlano, formatTotales, totalesPorMoneda, textoTotalPedido, vistaPedido, aportePedido } from "../utils/money.js";`.
Eliminar los estados `currency`/`exchangeRate` con su `useEffect` de frankfurter (l.228-236) y la función `formatMoney` (l.286-295).

- [ ] **Step 2: `load` — moneda por línea**

En el `map` de `items` del `load` reemplazar el objeto por:
```js
        items: (p.Productos || []).map(prod => ({
          id_producto: prod.id_producto,
          nombre_producto: prod.nombre_producto,
          cantidad: prod.Contiene?.cantidad || 0,
          precio_unitario: prod.Contiene?.precio_unitario || prod.precio,
          moneda: prod.Contiene?.moneda || prod.moneda || "EUR"
        }))
```

- [ ] **Step 3: PDF (`descargarPDF`)**

- Reemplazar `const mon…`, `const tasa…` y `const fmt…` por `const vista = vistaPedido(pedido);`.
- `tableBody` pasa a:
```js
    const tableBody = vista.lineas.map(l => [
      l.id_producto,
      l.nombre_producto,
      formatMontoPlano(l.precio, l.moneda),
      l.cantidad,
      formatMontoPlano(l.subtotal, l.moneda)
    ]);
```
- En `head` usar `['Código', 'Producto', 'P. Unitario', 'Cant.', 'Subtotal']`.
- Reemplazar todo el bloque de totales (desde `// Calcular totales desde los items…` hasta el `doc.text(fmt(totalConIva)…)`) por:
```js
    const totalsX = pageWidth - marginRight;
    const labelX = totalsX - 60;
    let y = totalsSectionY;

    vista.grupos.forEach((g) => {
      const iva = g.subtotal * IVA_RATE;
      const totalConIva = g.subtotal + iva;
      const etiqueta = vista.grupos.length > 1 ? ` (${g.moneda})` : '';

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      doc.text(`Total sin IVA${etiqueta}:`, labelX, y, { align: 'right' });
      doc.text(formatMontoPlano(g.subtotal, g.moneda), totalsX, y, { align: 'right' });
      doc.text('IVA (21%):', labelX, y + 7, { align: 'right' });
      doc.text(formatMontoPlano(iva, g.moneda), totalsX, y + 7, { align: 'right' });

      doc.setDrawColor(79, 70, 229);
      doc.setLineWidth(0.4);
      doc.line(labelX - 5, y + 11, totalsX, y + 11);

      doc.setFontSize(12);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(79, 70, 229);
      doc.text(`Total con IVA${etiqueta}:`, labelX, y + 18, { align: 'right' });
      doc.text(formatMontoPlano(totalConIva, g.moneda), totalsX, y + 18, { align: 'right' });

      y += 28;
    });
```
(Se conserva la línea `const totalsSectionY = doc.lastAutoTable.finalY + 12;` y `doc.save(...)`.)

- [ ] **Step 4: Detalle (`verDetalles`)**

- Reemplazar `mon`, `tasa`, `fmtHTML`, `totalSinIva`, `iva`, `totalConIva` por `const vista = vistaPedido(pedido);`.
- `itemsHTML` usa `vista.lineas` con `formatMontoPlano(l.precio, l.moneda)` y `formatMontoPlano(l.subtotal, l.moneda)` en lugar de `fmtHTML(...)`; `it.` → `l.`.
- En la grilla de datos reemplazar `<div><strong>Moneda:</strong> ${mon}</div>` por `<div><strong>Moneda:</strong> ${vista.grupos.map(g => g.moneda).join(' + ')}</div>`.
- Reemplazar el `<div style="display:flex;flex-direction:column;…">…</div>` de totales por:
```js
          ${vista.grupos.map(g => {
            const iva = g.subtotal * IVA_RATE;
            return `<div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;padding-top:8px;border-top:2px solid #e5e7eb">
              <div style="font-size:13px;color:#666">Total sin IVA (${g.moneda}): <strong>${formatMontoPlano(g.subtotal, g.moneda)}</strong></div>
              <div style="font-size:13px;color:#666">IVA (21%): <strong>${formatMontoPlano(iva, g.moneda)}</strong></div>
              <div style="font-size:16px;font-weight:bold;color:#4F46E5;margin-top:4px">Total con IVA: ${formatMontoPlano(g.subtotal + iva, g.moneda)}</div>
            </div>`;
          }).join('')}
```

- [ ] **Step 5: Resumen y totales de la grilla**

- En `summary` cambiar la forma de los acumuladores a `{eur, usd}`:
```js
    const acc = {
      count: 0,
      total: { eur: 0, usd: 0 },
      porStatus: {},
      facturados: { count: 0, total: { eur: 0, usd: 0 } },
      sinFacturar: { count: 0, total: { eur: 0, usd: 0 } },
      completadosSinFacturar: 0,
    };
    const sumar = (dest, p) => {
      const a = aportePedido(p);
      dest.eur += a.eur;
      dest.usd += a.usd;
    };
    for (const p of processedItems) {
      acc.count++;
      sumar(acc.total, p);
      const s = p.status || "Pendiente";
      if (!acc.porStatus[s]) acc.porStatus[s] = { count: 0, total: { eur: 0, usd: 0 } };
      acc.porStatus[s].count++;
      sumar(acc.porStatus[s].total, p);
      if (estaFacturado(p)) {
        acc.facturados.count++;
        sumar(acc.facturados.total, p);
      } else {
        acc.sinFacturar.count++;
        sumar(acc.sinFacturar.total, p);
        if (p.status === "Completado") acc.completadosSinFacturar++;
      }
    }
    return acc;
```
  (conservar el resto de la firma `useMemo(() => {…}, [processedItems])`; y el valor inicial `{ count: 0, total: { eur: 0, usd: 0 } }` en `const d = summary.porStatus[s] || …` del JSX.)
- Eliminar `fmtEUR` y reemplazar sus usos: `fmtEUR(summary.total)` → `formatTotales(summary.total)`; `fmtEUR(d.total)` → `formatTotales(d.total)`; `fmtEUR(summary.facturados.total)` / `…sinFacturar.total` → `formatTotales(...)`. En `const d = summary.porStatus[s] || { count: 0, total: 0 };` usar `{ count: 0, total: { eur: 0, usd: 0 } }`.

- [ ] **Step 6: Facturación rápida, grilla y Editar**

- `marcarFacturadoRapido`: `${formatMoney(pedido.total, pedido.moneda, pedido.tasa_cambio)}` → `${textoTotalPedido(pedido)}`.
- Grilla (l.945-948): reemplazar el comentario y la expresión por `{textoTotalPedido(row)}`.
- Botón Editar: quitar `setCurrency(row.moneda || 'EUR');` del `onClick`.

- [ ] **Step 7: Guardar y modal**

- En `save`: eliminar el bloque `if (editingId) {…} else {…}` y reemplazarlo por:
```js
      if (editingId) {
        await updatePedido(editingId, payload);
      } else {
        await createPedido(payload);
      }
```
- Reemplazar `const totalCalculado = …` (l.661) y su comentario por `const totalesForm = totalesPorMoneda(form.items);`.
- Eliminar el bloque `{/* SELECTOR DE MONEDA (Solo visible al crear) */}` completo (l.1055-1065).
- Encabezado de ítems: `<h4 …>Productos ({currency})</h4>` → `<h4 className="font-bold text-gray-700 text-sm">Productos</h4>`, y `Subtotal: {formatMoney(totalCalculado, currency, 1)}` → `Subtotal: {formatTotales(totalesForm)}` (cambiar el comentario a "Subtotal por moneda").
- Dropdown de productos: `{formatMoney(p.precio, currency, exchangeRate)}` → `{formatMonto(p.precio, p.moneda)}`.
- Botón `+`: eliminar `const precioParaForm = …` y usar:
```js
                    setForm(prev => ({ ...prev, items: [...prev.items, { ...nuevoItem, nombre_producto: prod.nombre_producto, precio_unitario: Number(prod.precio), moneda: prod.moneda === "USD" ? "USD" : "EUR" }] }));
```
- Lista de ítems: `({formatMoney(it.precio_unitario, currency, 1)})` → `({formatMonto(it.precio_unitario, it.moneda)})`.

- [ ] **Step 8: Verificar**

Run: `cd frontend && npm run lint -- src/pages/Pedidos.jsx && npm run build && grep -nE "formatMoney|fmtEUR|currency|exchangeRate|setCurrency|totalCalculado" src/pages/Pedidos.jsx`
Expected: lint/build OK; el grep no devuelve nada. Manual en dev: (a) crear pedido con un producto EUR y uno USD → subtotal muestra `X € + Y US$`; (b) PDF y "Ver detalle" muestran dos bloques de totales; (c) un pedido histórico en USD se ve igual que antes (moneda + tasa); (d) un pedido solo-EUR muestra un único bloque sin etiqueta de moneda; (e) las tarjetas del resumen muestran EUR/USD separados.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/pages/Pedidos.jsx
git commit -m "feat(pedidos-ui): líneas en su moneda y totales separados EUR/USD"
```

---

### Task 9: Envíos y Dashboard

**Files:**
- Modify: `frontend/src/pages/Envios.jsx:371`
- Modify: `frontend/src/pages/Dashboard.jsx:212` (+ import)

**Interfaces:**
- Consumes: `textoTotalPedido` (Task 5); `Pedido.total_eur/total_usd/multimoneda` en envíos (Task 4) y en pedidos (ya vienen completos).

- [ ] **Step 1: Envíos**

Agregar `import { textoTotalPedido } from "../utils/money.js";` y reemplazar
```jsx
{row.Pedido?.total != null && ` (€${Number(row.Pedido.total).toFixed(2)})`}
```
por
```jsx
{row.Pedido?.total != null && ` (${textoTotalPedido(row.Pedido)})`}
```

- [ ] **Step 2: Dashboard**

Agregar `import { textoTotalPedido } from "../utils/money.js";` y reemplazar `€{Number(p.total).toFixed(2)}` por `{textoTotalPedido(p)}`.

- [ ] **Step 3: Verificar**

Run: `cd frontend && npm run build`
Expected: OK. Manual: el listado de Envíos y "Últimos pedidos" del Dashboard muestran el total correcto para un pedido mixto y uno histórico.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/Envios.jsx frontend/src/pages/Dashboard.jsx
git commit -m "feat(ui): totales por moneda en Envíos y Dashboard"
```

---

### Task 10: Verificación integral y despliegue

**Files:** ninguno (verificación + notas); opcional: actualizar `README.md` (línea de "Ingresos (Suministros)": reemplazar "Soporta moneda y tasa de cambio." por "Soporta moneda por producto (EUR/USD) sin conversión.").

- [ ] **Step 1: Suite automática**

Run: `cd backend && npm test && cd ../frontend && npm test && npm run build`
Expected: todos los tests pasan; build OK.

- [ ] **Step 2: Regresión de datos viejos sobre la copia (obligatoria, antes de dar nada por terminado)**

Con `agromat_safety_copy` recién clonada de `agromat` (`mariadb-dump agromat | mariadb agromat_safety_copy`), tomar la huella de las columnas existentes (`COUNT` + suma de `CRC32(CONCAT_WS('|', …))` de `pedidos(id_pedido,total,subtotal,moneda,tasa_cambio,status,id_cliente)`, `contiene(id_pedido,id_producto,cantidad,precio_unitario,subtotal_linea)`, `productos(id_producto,nombre_producto,precio,stock,id_proveedor)`), aplicar 003 dos veces y volver a tomarla: **debe ser idéntica**. Luego ejecutar con el backend nuevo un `PUT` de solo-estado y un `PUT` con los mismos ítems sobre cada pedido histórico y confirmar que `total`, `subtotal`, `moneda`, `tasa_cambio` y `multimoneda` no cambian y que el listado se ve igual que antes. Cualquier diferencia bloquea el despliegue.

- [ ] **Step 2b: Recorrido completo en dev (sobre la copia)**

1. Migración 003 aplicada dos veces sin error; queries de verificación OK.
2. Marcar un producto como USD (formulario) y reimportar un Excel con otro producto en USD.
3. Pedido mixto → totales EUR/USD correctos; cambiar el precio del producto USD y confirmar que el pedido ya hecho no cambia.
4. Pedido histórico (USD con tasa) se ve idéntico; al editar sus ítems pasa a modo por-línea sin perder el total en EUR.
5. Inventario Excel con columnas `Moneda/Precio/Total` y filas `TOTAL EUR` / `TOTAL USD`.
6. Auditoría: el cambio de moneda de un producto aparece bajo "Cambios de Precio".

- [ ] **Step 3: Despliegue (producción)**

Backup (`mysqldump`), `pm2 stop agromat`, ejecutar la migración 003, desplegar backend + frontend, `pm2 restart agromat`, repetir las queries de verificación. Avisar al cliente de los 3 cambios visibles (pedidos sin selector de moneda y con dos totales, Productos sin toggle EUR/USD, reportes separados por moneda).

- [ ] **Step 4: Commit (opcional README)**

```bash
git add README.md
git commit -m "docs: moneda por producto en README"
```
