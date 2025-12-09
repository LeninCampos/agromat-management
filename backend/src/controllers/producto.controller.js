// backend/src/controllers/producto.controller.js
import { QueryTypes } from "sequelize";
import  XLSX  from "xlsx";
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

/* =========================================================
   HELPER: borrar producto por id usando una transacción
   (borra ubicaciones, líneas de pedido y suministros)
========================================================= */
async function deleteProductoById(id, t) {
  const producto = await Producto.findByPk(id, { transaction: t });
  if (!producto) return;

  // 1️⃣ Borrar ubicaciones del producto
  await SeUbica.destroy({
    where: { id_producto: id },
    transaction: t,
  });

  // 2️⃣ Borrar líneas de pedido (contiene)
  await Contiene.destroy({
    where: { id_producto: id },
    transaction: t,
  });

  // 3️⃣ Borrar registros de suministros (suministra)
  await Suministra.destroy({
    where: { id_producto: id },
    transaction: t,
  });

  // 4️⃣ Borrar el producto
  await producto.destroy({ transaction: t });
}

/* =========================================================
   HELPER: registrar ajustes manuales de stock
   (cuando cambias el campo stock en Productos)
========================================================= */
async function registrarAjusteStock({ t, id_producto, delta, motivo }) {
  if (!delta || delta === 0) return;

  try {
    await sequelize.query(
      `
      INSERT INTO ajustes_stock (id_producto, fecha, hora, cantidad, motivo)
      VALUES (?, CURDATE(), CURTIME(), ?, ?)
      `,
      {
        replacements: [id_producto, delta, motivo],
        type: QueryTypes.INSERT,
        transaction: t,
      }
    );
  } catch (err) {
    // Si por alguna razón falla, no truena todo el flujo
    console.error("ERROR registrarAjusteStock:", err.message);
  }
}

/* =========================================================
   HELPER: Recalcular stock de un producto
   = entradas (suministros) - salidas (pedidos) + ajustes
========================================================= */
export async function recalcularStockProducto(id_producto, t) {
  // Entradas de suministra / suministro
  const entradasRow = await sequelize.query(
    `
    SELECT COALESCE(SUM(sm.cantidad), 0) AS total_entradas
    FROM suministra sm
    INNER JOIN suministro su ON su.id_suministro = sm.id_suministro
    WHERE sm.id_producto = ?
    `,
    {
      replacements: [id_producto],
      type: QueryTypes.SELECT,
      transaction: t,
    }
  );

  const totalEntradas = Number(entradasRow[0]?.total_entradas || 0);

  // Salidas de contiene / pedidos
  const salidasRow = await sequelize.query(
    `
    SELECT COALESCE(SUM(c.cantidad), 0) AS total_salidas
    FROM contiene c
    INNER JOIN pedidos p ON p.id_pedido = c.id_pedido
    WHERE c.id_producto = ?
    `,
    {
      replacements: [id_producto],
      type: QueryTypes.SELECT,
      transaction: t,
    }
  );

  const totalSalidas = Number(salidasRow[0]?.total_salidas || 0);

  // Ajustes manuales
  const ajustesRow = await sequelize.query(
    `
    SELECT COALESCE(SUM(a.cantidad), 0) AS total_ajustes
    FROM ajustes_stock a
    WHERE a.id_producto = ?
    `,
    {
      replacements: [id_producto],
      type: QueryTypes.SELECT,
      transaction: t,
    }
  );

  const totalAjustes = Number(ajustesRow[0]?.total_ajustes || 0);

  const nuevoStock = totalEntradas - totalSalidas + totalAjustes;

  // Actualizar el stock del producto
  await Producto.update(
    { stock: nuevoStock >= 0 ? nuevoStock : 0 },
    { where: { id_producto }, transaction: t }
  );

  return nuevoStock;
}

/* =========================================================
   GET: todos los productos
========================================================= */
export const getAllProductos = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: [
        {
          model: Proveedor,
          attributes: ["id_proveedor", "nombre_proveedor"],
        },
        {
          model: SeUbica,
          as: "SeUbicas",
          attributes: ["id_zona"],
          include: [
            {
              model: Zona,
              as: "Zona",
              attributes: ["id_zona", "codigo", "rack", "modulo", "piso"],
            },
          ],
        },
      ],
      order: [["id_producto", "ASC"]],
    });

    // Agregamos fechas de último ingreso / egreso
    const productosConFechas = await Promise.all(
      productos.map(async (p) => {
        const producto = p.toJSON();

        const [ultimoIngreso] = await sequelize.query(
          `
          SELECT MAX(su.fecha_llegada) AS fecha
          FROM suministra sm
          INNER JOIN suministro su ON su.id_suministro = sm.id_suministro
          WHERE sm.id_producto = ?
          `,
          {
            replacements: [producto.id_producto],
            type: QueryTypes.SELECT,
          }
        );

        const [ultimoEgreso] = await sequelize.query(
          `
          SELECT MAX(p.fecha_pedido) AS fecha
          FROM contiene c
          INNER JOIN pedidos p ON p.id_pedido = c.id_pedido
          WHERE c.id_producto = ?
          `,
          {
            replacements: [producto.id_producto],
            type: QueryTypes.SELECT,
          }
        );

        return {
          ...producto,
          fecha_ultimo_ingreso: ultimoIngreso?.fecha
            ? String(ultimoIngreso.fecha).slice(0, 10)
            : null,
          fecha_ultimo_egreso: ultimoEgreso?.fecha
            ? String(ultimoEgreso.fecha).slice(0, 10)
            : null,
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
        {
          model: Proveedor,
          attributes: ["id_proveedor", "nombre_proveedor"],
        },
        {
          model: SeUbica,
          as: "SeUbicas",
          attributes: ["id_zona"],
          include: [
            {
              model: Zona,
              as: "Zona",
              attributes: ["id_zona", "codigo", "rack", "modulo", "piso"],
            },
          ],
        },
      ],
    });

    if (!producto) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    res.json(producto);
  } catch (err) {
    next(err);
  }
};

/* =========================================================
   POST /api/productos
   - Si el ID NO existe: CREA el producto.
   - Si el ID YA existe: suma stock y actualiza datos.
========================================================= */
export const createProducto = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { zona, ...datos } = req.body;

    const existente = await Producto.findByPk(datos.id_producto, {
      transaction: t,
    });

    let productoFinal;

    if (existente) {
      const nuevoStock =
        Number(existente.stock ?? 0) + Number(datos.stock ?? 0);

      await existente.update(
        {
          stock: nuevoStock,
          precio: datos.precio,
          nombre_producto: datos.nombre_producto,
          descripcion: datos.descripcion,
          id_proveedor: datos.id_proveedor,
          imagen_url: datos.imagen_url,
        },
        { transaction: t }
      );

      productoFinal = existente;
    } else {
      productoFinal = await Producto.create(datos, { transaction: t });
    }

    if (zona !== undefined) {
      await SeUbica.destroy({
        where: { id_producto: datos.id_producto },
        transaction: t,
      });

      if (zona && zona.id_zona != null) {
        await SeUbica.create(
          {
            id_producto: datos.id_producto,
            id_zona: Number(zona.id_zona),
          },
          { transaction: t }
        );
      }
    }

    await t.commit();

    const mensaje = existente
      ? "Stock sumado al producto existente"
      : "Producto creado correctamente";

    res.status(201).json({
      ...productoFinal.toJSON(),
      mensaje_accion: mensaje,
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

/* =========================================================
   PUT /api/productos/:id
   - Si cambia el stock, se registra un ajuste en ajustes_stock
========================================================= */
export const updateProducto = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    const { zona, ...datos } = req.body;

    const producto = await Producto.findByPk(id, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const stockActual = Number(producto.stock ?? 0);
    const stockNuevo =
      datos.stock !== undefined ? Number(datos.stock) : stockActual;
    const delta = stockNuevo - stockActual;

    // Actualizar datos del producto (incluye nuevo stock)
    await producto.update(
      {
        ...datos,
        stock: stockNuevo,
      },
      { transaction: t }
    );

    // Registrar ajuste si hubo cambio de stock
    if (delta !== 0) {
      await registrarAjusteStock({
        t,
        id_producto: id,
        delta,
        motivo: "Ajuste manual en ficha de producto",
      });
    }

    // Actualizar ubicación si se envía zona
    if (zona !== undefined) {
      await SeUbica.destroy({
        where: { id_producto: id },
        transaction: t,
      });

      if (zona && zona.id_zona != null) {
        await SeUbica.create(
          {
            id_producto: id,
            id_zona: Number(zona.id_zona),
          },
          { transaction: t }
        );
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

  try {
    const { id } = req.params;

    await deleteProductoById(id, t);

    await t.commit();

    return res.json({
      ok: true,
      message:
        "Producto eliminado correctamente (incluyendo movimientos relacionados).",
    });
  } catch (err) {
    console.error("ERROR EN deleteProducto:", err);
    await t.rollback();
    return res
      .status(500)
      .json({ error: "No se pudo eliminar el producto (ver servidor)." });
  }
};

/* =========================================================
   DELETE /api/productos  (borrado masivo)
========================================================= */
export const bulkDeleteProductos = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      await t.rollback();
      return res
        .status(400)
        .json({ error: "Debes enviar un arreglo de ids" });
    }

    for (const id of ids) {
      await deleteProductoById(id, t);
    }

    await t.commit();

    return res.json({
      ok: true,
      message: `Se eliminaron ${ids.length} productos (incluyendo movimientos relacionados).`,
    });
  } catch (err) {
    console.error("ERROR EN bulkDeleteProductos:", err);
    await t.rollback();
    return res
      .status(500)
      .json({ error: "No se pudo eliminar en bloque (ver servidor)." });
  }
};

/* =========================================================
   GET /api/productos/:id/movimientos
   - Entradas: suministros
   - Salidas: pedidos
   - Ajustes: ajustes_stock (se suman como +entradas o +salidas)
========================================================= */
export const getMovimientosProducto = async (req, res, next) => {
  const { id } = req.params;

  try {
    // 1) SALIDAS: pedidos (contiene + pedidos)
    const salidas = await sequelize.query(
      `
      SELECT
        DATE(p.fecha_pedido) AS fecha,
        SUM(c.cantidad)     AS cantidad_salida
      FROM contiene c
      INNER JOIN pedidos p ON p.id_pedido = c.id_pedido
      WHERE c.id_producto = ?
      GROUP BY DATE(p.fecha_pedido)
      ORDER BY DATE(p.fecha_pedido)
      `,
      {
        replacements: [id],
        type: QueryTypes.SELECT,
        raw: true,
      }
    );

    // 2) ENTRADAS: suministros (suministra + suministro)
    const entradas = await sequelize.query(
      `
      SELECT
        DATE(su.fecha_llegada) AS fecha,
        SUM(sm.cantidad)       AS cantidad_entrada
      FROM suministra sm
      INNER JOIN suministro su ON su.id_suministro = sm.id_suministro
      WHERE sm.id_producto = ?
      GROUP BY DATE(su.fecha_llegada)
      ORDER BY DATE(su.fecha_llegada)
      `,
      {
        replacements: [id],
        type: QueryTypes.SELECT,
        raw: true,
      }
    );

    // 3) AJUSTES MANUALES: ajustes_stock
    const ajustes = await sequelize.query(
      `
      SELECT
        fecha,
        SUM(CASE WHEN cantidad > 0 THEN cantidad ELSE 0 END) AS entradas_ajuste,
        SUM(CASE WHEN cantidad < 0 THEN -cantidad ELSE 0 END) AS salidas_ajuste
      FROM ajustes_stock
      WHERE id_producto = ?
      GROUP BY fecha
      ORDER BY fecha
      `,
      {
        replacements: [id],
        type: QueryTypes.SELECT,
        raw: true,
      }
    );

    // 4) Combinar por fecha
    const byDate = new Map();

    // Entradas de suministros
    for (const row of entradas) {
      const key = String(row.fecha);
      byDate.set(key, {
        fecha: key,
        entradas: Number(row.cantidad_entrada) || 0,
        salidas: 0,
      });
    }

    // Salidas de pedidos
    for (const row of salidas) {
      const key = String(row.fecha);
      const existing = byDate.get(key) || {
        fecha: key,
        entradas: 0,
        salidas: 0,
      };
      existing.salidas += Number(row.cantidad_salida) || 0;
      byDate.set(key, existing);
    }

    // Ajustes manuales
    for (const row of ajustes) {
      const key = String(row.fecha);
      const existing = byDate.get(key) || {
        fecha: key,
        entradas: 0,
        salidas: 0,
      };
      existing.entradas += Number(row.entradas_ajuste) || 0;
      existing.salidas += Number(row.salidas_ajuste) || 0;
      byDate.set(key, existing);
    }

    const movimientos = Array.from(byDate.values()).sort((a, b) =>
      a.fecha < b.fecha ? -1 : a.fecha > b.fecha ? 1 : 0
    );

    const producto = await Producto.findByPk(id);

    // Calcular stock basado en movimientos
    const totalEntradas = movimientos.reduce((sum, m) => sum + m.entradas, 0);
    const totalSalidas = movimientos.reduce((sum, m) => sum + m.salidas, 0);
    const stockCalculado = totalEntradas - totalSalidas;

    return res.json({
      producto: producto
        ? { ...producto.toJSON(), stock_calculado: stockCalculado }
        : null,
      movimientos,
      resumen: {
        total_entradas: totalEntradas,
        total_salidas: totalSalidas,
        stock_calculado: stockCalculado,
      },
    });
  } catch (err) {
    console.error("ERROR getMovimientosProducto:", err);
    return res
      .status(500)
      .json({ error: "Error al obtener los movimientos de inventario" });
  }
};

/* =========================================================
   POST /api/productos/recalcular-stock
   - Recalcula usando: entradas - salidas + ajustes
========================================================= */
export const recalcularStock = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { id_producto } = req.body;

    if (id_producto) {
      const nuevoStock = await recalcularStockProducto(id_producto, t);
      await t.commit();
      return res.json({
        ok: true,
        id_producto,
        nuevo_stock: nuevoStock,
      });
    }

    const productos = await Producto.findAll({ transaction: t });
    const resultados = [];

    for (const producto of productos) {
      const nuevoStock = await recalcularStockProducto(producto.id_producto, t);
      resultados.push({
        id_producto: producto.id_producto,
        nuevo_stock: nuevoStock,
      });
    }

    await t.commit();

    return res.json({
      ok: true,
      message: `Se recalculó el stock de ${resultados.length} productos`,
      resultados,
    });
  } catch (err) {
    console.error("ERROR recalcularStock:", err);
    await t.rollback();
    return res.status(500).json({ error: "Error al recalcular stock" });
  }
};

export const exportarProductosExcel = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: [
        {
          model: Proveedor,
          attributes: ["nombre_proveedor"],
        },
        {
          model: SeUbica,
          as: "SeUbicas",
          include: [
            {
              model: Zona,
              as: "Zona",
              attributes: ["codigo", "rack", "modulo", "piso"],
            },
          ],
        },
      ],
      order: [["id_producto", "ASC"]],
    });
    const datosExcel = productos.map((p) => {
      const ubicacion = p.SeUbicas?.[0]?.Zona;
      const ubicacionTexto = ubicacion
        ? `${ubicacion.codigo} (R:${ubicacion.rack} M:${ubicacion.modulo} P:${ubicacion.piso})`
        : "Sin asignar";

      return {
        "Código": p.id_producto,
        "Producto": p.nombre_producto,
        "Descripción": p.descripcion || "",
        "Proveedor": p.Proveedor?.nombre_proveedor || "Sin proveedor",
        "Ubicación": ubicacionTexto,
        "Precio": Number(p.precio),
        "Stock Actual": Number(p.stock),
      };
    });

    const workBook = XLSX.utils.book_new();
    const workSheet = XLSX.utils.json_to_sheet(datosExcel);

    const wscols = [
      { wch: 15 }, // Código
      { wch: 30 }, // Producto
      { wch: 30 }, // Descripción
      { wch: 20 }, // Proveedor
      { wch: 25 }, // Ubicación
      { wch: 10 }, // Precio
      { wch: 10 }, // Stock
    ];
    workSheet["!cols"] = wscols;

    XLSX.utils.book_append_sheet(workBook, workSheet, "Inventario");

    const excelBuffer = XLSX.write(workBook, {
      bookType: "xlsx",
      type: "buffer",
    });

    // 5. Enviar respuesta como archivo descargable
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=Inventario.xlsx"
    );
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.send(excelBuffer);

  } catch (err) {
    console.error("ERROR exportarProductosExcel:", err);
    next(err);
  }
};