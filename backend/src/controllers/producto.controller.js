// backend/src/controllers/producto.controller.js
import { QueryTypes } from "sequelize";
import XLSX from "xlsx";
import {
  sequelize,
  Producto,
  Proveedor,
  SeUbica,
  Zona,
  Contiene,
  Suministra,
  Suministro,
} from "../models/index.js";

// Helper para obtener opciones de auditoría
function getAuditOptions(req) {
  return {
    userId: req.empleado?.id || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
  };
}

/* =========================================================
   HELPER: borrar producto por id usando una transacción
========================================================= */
async function deleteProductoById(id, t, auditOptions = {}) {
  const producto = await Producto.findByPk(id, { transaction: t });
  if (!producto) return;

  await SeUbica.destroy({ where: { id_producto: id }, transaction: t });
  await Contiene.destroy({ where: { id_producto: id }, transaction: t });
  await Suministra.destroy({ where: { id_producto: id }, transaction: t });
  await producto.destroy({ transaction: t, ...auditOptions });
}

/* =========================================================
   HELPER: registrar ajustes manuales de stock
========================================================= */
async function registrarAjusteStock({ t, id_producto, delta, motivo }) {
  if (!delta || delta === 0) return;
  try {
    await sequelize.query(
      `INSERT INTO ajustes_stock (id_producto, fecha, hora, cantidad, motivo) VALUES (?, CURDATE(), CURTIME(), ?, ?)`,
      { replacements: [id_producto, delta, motivo], type: QueryTypes.INSERT, transaction: t }
    );
  } catch (err) {
    console.error("ERROR registrarAjusteStock:", err.message);
  }
}

/* =========================================================
   HELPER: Recalcular stock de un producto
========================================================= */
export async function recalcularStockProducto(id_producto, t) {
  const entradasRow = await sequelize.query(
    `SELECT COALESCE(SUM(sm.cantidad), 0) AS total_entradas FROM suministra sm INNER JOIN suministro su ON su.id_suministro = sm.id_suministro WHERE sm.id_producto = ?`,
    { replacements: [id_producto], type: QueryTypes.SELECT, transaction: t }
  );
  const totalEntradas = Number(entradasRow[0]?.total_entradas || 0);

  const salidasRow = await sequelize.query(
    `SELECT COALESCE(SUM(c.cantidad), 0) AS total_salidas FROM contiene c INNER JOIN pedidos p ON p.id_pedido = c.id_pedido WHERE c.id_producto = ?`,
    { replacements: [id_producto], type: QueryTypes.SELECT, transaction: t }
  );
  const totalSalidas = Number(salidasRow[0]?.total_salidas || 0);

  const ajustesRow = await sequelize.query(
    `SELECT COALESCE(SUM(a.cantidad), 0) AS total_ajustes FROM ajustes_stock a WHERE a.id_producto = ?`,
    { replacements: [id_producto], type: QueryTypes.SELECT, transaction: t }
  );
  const totalAjustes = Number(ajustesRow[0]?.total_ajustes || 0);

  const nuevoStock = totalEntradas - totalSalidas + totalAjustes;
  await Producto.update({ stock: nuevoStock >= 0 ? nuevoStock : 0 }, { where: { id_producto }, transaction: t });
  return nuevoStock;
}

/* =========================================================
   GET: todos los productos
========================================================= */
export const getAllProductos = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] },
        { model: SeUbica, as: "SeUbicas", attributes: ["id_zona"], include: [{ model: Zona, as: "Zona", attributes: ["id_zona", "codigo", "rack", "modulo", "piso"] }] },
      ],
      order: [["id_producto", "ASC"]],
    });

    const productosConFechas = await Promise.all(
      productos.map(async (p) => {
        const producto = p.toJSON();
        const [ultimoIngreso] = await sequelize.query(
          `SELECT MAX(su.fecha_llegada) AS fecha FROM suministra sm INNER JOIN suministro su ON su.id_suministro = sm.id_suministro WHERE sm.id_producto = ?`,
          { replacements: [producto.id_producto], type: QueryTypes.SELECT }
        );
        const [ultimoEgreso] = await sequelize.query(
          `SELECT MAX(p.fecha_pedido) AS fecha FROM contiene c INNER JOIN pedidos p ON p.id_pedido = c.id_pedido WHERE c.id_producto = ?`,
          { replacements: [producto.id_producto], type: QueryTypes.SELECT }
        );
        return {
          ...producto,
          fecha_ultimo_ingreso: ultimoIngreso?.fecha ? String(ultimoIngreso.fecha).slice(0, 10) : null,
          fecha_ultimo_egreso: ultimoEgreso?.fecha ? String(ultimoEgreso.fecha).slice(0, 10) : null,
        };
      })
    );
    res.json(productosConFechas);
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   GET: producto por ID
========================================================= */
export const getProductoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id, {
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] },
        { model: SeUbica, as: "SeUbicas", attributes: ["id_zona"], include: [{ model: Zona, as: "Zona", attributes: ["id_zona", "codigo", "rack", "modulo", "piso"] }] },
      ],
    });
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(producto);
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   POST /api/productos
========================================================= */
export const createProducto = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);

  try {
    const { zona, ...datos } = req.body;
    const existente = await Producto.findByPk(datos.id_producto, { transaction: t });
    let productoFinal;

    if (existente) {
      const nuevoStock = Number(existente.stock ?? 0) + Number(datos.stock ?? 0);
      await existente.update({
        stock: nuevoStock,
        precio: datos.precio,
        nombre_producto: datos.nombre_producto,
        descripcion: datos.descripcion,
        id_proveedor: datos.id_proveedor,
        imagen_url: datos.imagen_url,
      }, { transaction: t, ...auditOptions });
      productoFinal = existente;
    } else {
      productoFinal = await Producto.create(datos, { transaction: t, ...auditOptions });
    }

    if (zona !== undefined) {
      await SeUbica.destroy({ where: { id_producto: datos.id_producto }, transaction: t });
      if (zona && zona.id_zona != null) {
        await SeUbica.create({ id_producto: datos.id_producto, id_zona: Number(zona.id_zona) }, { transaction: t, ...auditOptions });
      }
    }

    await t.commit();
    const mensaje = existente ? "Stock sumado al producto existente" : "Producto creado correctamente";
    res.status(201).json({ ...productoFinal.toJSON(), mensaje_accion: mensaje });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/* =========================================================
   PUT /api/productos/:id
========================================================= */
export const updateProducto = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    const { zona, ...datos } = req.body;

    const producto = await Producto.findByPk(id, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const stockActual = Number(producto.stock ?? 0);
    const stockNuevo = datos.stock !== undefined ? Number(datos.stock) : stockActual;
    const delta = stockNuevo - stockActual;

    await producto.update({ ...datos, stock: stockNuevo }, { transaction: t, ...auditOptions });

    if (delta !== 0) {
      await registrarAjusteStock({ t, id_producto: id, delta, motivo: "Ajuste manual en ficha de producto" });
    }

    if (zona !== undefined) {
      await SeUbica.destroy({ where: { id_producto: id }, transaction: t });
      if (zona && zona.id_zona != null) {
        await SeUbica.create({ id_producto: id, id_zona: Number(zona.id_zona) }, { transaction: t, ...auditOptions });
      }
    }

    await t.commit();
    res.json(producto);
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/* =========================================================
   DELETE /api/productos/:id
========================================================= */
export const deleteProducto = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    await deleteProductoById(id, t, auditOptions);
    await t.commit();
    return res.json({ ok: true, message: "Producto eliminado correctamente (incluyendo movimientos relacionados)." });
  } catch (err) {
    console.error("ERROR EN deleteProducto:", err);
    await t.rollback();
    return res.status(500).json({ error: "No se pudo eliminar el producto (ver servidor)." });
  }
};

/* =========================================================
   DELETE /api/productos (borrado masivo)
========================================================= */
export const bulkDeleteProductos = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);

  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      await t.rollback();
      return res.status(400).json({ error: "Debes enviar un arreglo de ids" });
    }

    for (const id of ids) {
      await deleteProductoById(id, t, auditOptions);
    }

    await t.commit();
    return res.json({ ok: true, message: `Se eliminaron ${ids.length} productos (incluyendo movimientos relacionados).` });
  } catch (err) {
    console.error("ERROR EN bulkDeleteProductos:", err);
    await t.rollback();
    return res.status(500).json({ error: "No se pudo eliminar en bloque (ver servidor)." });
  }
};

/* =========================================================
   GET /api/productos/:id/movimientos
========================================================= */
export const getMovimientosProducto = async (req, res, next) => {
  const { id } = req.params;
  try {
    const salidas = await sequelize.query(
      `SELECT DATE(p.fecha_pedido) AS fecha, SUM(c.cantidad) AS cantidad_salida FROM contiene c INNER JOIN pedidos p ON p.id_pedido = c.id_pedido WHERE c.id_producto = ? GROUP BY DATE(p.fecha_pedido) ORDER BY DATE(p.fecha_pedido)`,
      { replacements: [id], type: QueryTypes.SELECT, raw: true }
    );

    const entradas = await sequelize.query(
      `SELECT DATE(su.fecha_llegada) AS fecha, SUM(sm.cantidad) AS cantidad_entrada FROM suministra sm INNER JOIN suministro su ON su.id_suministro = sm.id_suministro WHERE sm.id_producto = ? GROUP BY DATE(su.fecha_llegada) ORDER BY DATE(su.fecha_llegada)`,
      { replacements: [id], type: QueryTypes.SELECT, raw: true }
    );

    const ajustes = await sequelize.query(
      `SELECT fecha, SUM(CASE WHEN cantidad > 0 THEN cantidad ELSE 0 END) AS entradas_ajuste, SUM(CASE WHEN cantidad < 0 THEN -cantidad ELSE 0 END) AS salidas_ajuste FROM ajustes_stock WHERE id_producto = ? GROUP BY fecha ORDER BY fecha`,
      { replacements: [id], type: QueryTypes.SELECT, raw: true }
    );

    const byDate = new Map();
    for (const row of entradas) {
      const key = String(row.fecha);
      byDate.set(key, { fecha: key, entradas: Number(row.cantidad_entrada) || 0, salidas: 0 });
    }
    for (const row of salidas) {
      const key = String(row.fecha);
      const existing = byDate.get(key) || { fecha: key, entradas: 0, salidas: 0 };
      existing.salidas += Number(row.cantidad_salida) || 0;
      byDate.set(key, existing);
    }
    for (const row of ajustes) {
      const key = String(row.fecha);
      const existing = byDate.get(key) || { fecha: key, entradas: 0, salidas: 0 };
      existing.entradas += Number(row.entradas_ajuste) || 0;
      existing.salidas += Number(row.salidas_ajuste) || 0;
      byDate.set(key, existing);
    }

    const movimientos = Array.from(byDate.values()).sort((a, b) => (a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0));
    const producto = await Producto.findByPk(id);
    const totalEntradas = movimientos.reduce((sum, m) => sum + m.entradas, 0);
    const totalSalidas = movimientos.reduce((sum, m) => sum + m.salidas, 0);
    const stockCalculado = totalEntradas - totalSalidas;

    return res.json({
      producto: producto ? { ...producto.toJSON(), stock_calculado: stockCalculado } : null,
      movimientos,
      resumen: { total_entradas: totalEntradas, total_salidas: totalSalidas, stock_calculado: stockCalculado },
    });
  } catch (err) {
    console.error("ERROR getMovimientosProducto:", err);
    return res.status(500).json({ error: "Error al obtener los movimientos de inventario" });
  }
};

/* =========================================================
   POST /api/productos/recalcular-stock
========================================================= */
export const recalcularStock = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id_producto } = req.body;
    if (id_producto) {
      const nuevoStock = await recalcularStockProducto(id_producto, t);
      await t.commit();
      return res.json({ ok: true, id_producto, nuevo_stock: nuevoStock });
    }

    const productos = await Producto.findAll({ transaction: t });
    const resultados = [];
    for (const producto of productos) {
      const nuevoStock = await recalcularStockProducto(producto.id_producto, t);
      resultados.push({ id_producto: producto.id_producto, nuevo_stock: nuevoStock });
    }

    await t.commit();
    return res.json({ ok: true, message: `Se recalculó el stock de ${resultados.length} productos`, resultados });
  } catch (err) {
    console.error("ERROR recalcularStock:", err);
    await t.rollback();
    return res.status(500).json({ error: "Error al recalcular stock" });
  }
};

/* =========================================================
   GET /api/productos/exportar-excel
========================================================= */
export const exportarProductosExcel = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Proveedor, attributes: ["nombre_proveedor"] },
        { model: SeUbica, as: "SeUbicas", include: [{ model: Zona, as: "Zona", attributes: ["codigo", "rack", "modulo", "piso"] }] },
      ],
      order: [["id_producto", "ASC"]],
    });

    const productosConFechas = await Promise.all(
      productos.map(async (p) => {
        const [ultimoIngreso] = await sequelize.query(
          `SELECT MAX(su.fecha_llegada) AS fecha FROM suministra sm INNER JOIN suministro su ON su.id_suministro = sm.id_suministro WHERE sm.id_producto = ?`,
          { replacements: [p.id_producto], type: QueryTypes.SELECT }
        );
        const [ultimoEgreso] = await sequelize.query(
          `SELECT MAX(p.fecha_pedido) AS fecha FROM contiene c INNER JOIN pedidos p ON p.id_pedido = c.id_pedido WHERE c.id_producto = ?`,
          { replacements: [p.id_producto], type: QueryTypes.SELECT }
        );
        return {
          producto: p,
          fecha_ultimo_ingreso: ultimoIngreso?.fecha ? String(ultimoIngreso.fecha).slice(0, 10) : "N/A",
          fecha_ultimo_egreso: ultimoEgreso?.fecha ? String(ultimoEgreso.fecha).slice(0, 10) : "N/A",
        };
      })
    );

    const datosExcel = productosConFechas.map(({ producto: p, fecha_ultimo_ingreso, fecha_ultimo_egreso }) => {
      const ubicacion = p.SeUbicas?.[0]?.Zona;
      const ubicacionTexto = ubicacion ? `${ubicacion.codigo} (R:${ubicacion.rack} M:${ubicacion.modulo} P:${ubicacion.piso})` : "Sin asignar";
      return {
        "Código": p.id_producto,
        "Producto": p.nombre_producto,
        "Proveedor": p.Proveedor?.nombre_proveedor || "Sin proveedor",
        "Ubicación": ubicacionTexto,
        "Último Ingreso": fecha_ultimo_ingreso,
        "Última Salida": fecha_ultimo_egreso,
        "Precio": Number(p.precio),
        "Stock Actual": Number(p.stock),
      };
    });

    const workBook = XLSX.utils.book_new();
    const workSheet = XLSX.utils.json_to_sheet(datosExcel);
    workSheet["!cols"] = [{ wch: 15 }, { wch: 30 }, { wch: 20 }, { wch: 25 }, { wch: 15 }, { wch: 15 }, { wch: 10 }, { wch: 10 }];
    XLSX.utils.book_append_sheet(workBook, workSheet, "Inventario");

    const excelBuffer = XLSX.write(workBook, { bookType: "xlsx", type: "buffer" });
    res.setHeader("Content-Disposition", "attachment; filename=Inventario.xlsx");
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.send(excelBuffer);
  } catch (err) {
    console.error("ERROR exportarProductosExcel:", err);
    next(err);
  }
};