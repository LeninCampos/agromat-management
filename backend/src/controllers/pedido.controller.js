import { sequelize, Pedido, Cliente, Empleado, Contiene, Producto } from "../models/index.js";
import { Op } from "sequelize";

// --- Helpers (no se exportan) ---
function calcSubtotalLine(cantidad, precio_unitario) {
  if (cantidad == null || precio_unitario == null) return null;
  return (Number(cantidad) * Number(precio_unitario)).toFixed(2);
}

async function recalcTotales(id_pedido, descuento_total = 0, impuesto_total = 0, t) {
  const subtotal = await Contiene.sum("subtotal_linea", {
    where: { id_pedido },
    transaction: t,
  }) || 0;
  const total = Number(subtotal) - Number(descuento_total) + Number(impuesto_total);
  await Pedido.update(
    { subtotal, descuento_total, impuesto_total, total },
    { where: { id_pedido }, transaction: t }
  );
  return { subtotal, descuento_total, impuesto_total, total };
}

// --- Controladores (se exportan) ---

// GET /api/pedidos
export const getAllPedidos = async (req, res, next) => {
  try {
    const rows = await Pedido.findAll({
      include: [
        { model: Cliente, attributes: ["id_cliente", "nombre_cliente"] },
        { model: Empleado, attributes: ["id_empleado", "nombre_empleado"] },
      ],
      order: [["id_pedido", "ASC"]],
    });
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /api/pedidos/:id (detalle con líneas)
export const getPedidoById = async (req, res, next) => {
  try {
    const row = await Pedido.findByPk(req.params.id, {
      include: [
        { model: Cliente, attributes: ["id_cliente", "nombre_cliente"] },
        { model: Empleado, attributes: ["id_empleado", "nombre_empleado"] },
        {
          model: Producto,
          through: { attributes: ["cantidad", "precio_unitario", "subtotal_linea"] },
          attributes: ["id_producto", "nombre_producto", "precio"],
        },
      ],
    });
    if (!row) return res.status(404).json({ error: "Pedido no encontrado" });
    res.json(row);
  } catch (err) { next(err); }
};

// POST /api/pedidos (crea pedido con items)
export const createPedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      fecha_pedido, hora_pedido, status,
      id_empleado, id_cliente,
      descuento_total = 0, impuesto_total = 0,
      items = []
    } = req.body;

    const pedido = await Pedido.create({
      fecha_pedido, hora_pedido, status, id_empleado, id_cliente,
      subtotal: 0, descuento_total, impuesto_total, total: 0
    }, { transaction: t });

    // Validar productos y crear líneas
    const idsProd = items.map(i => i.id_producto);
    const prods = await Producto.findAll({
      where: { id_producto: { [Op.in]: idsProd } },
      attributes: ["id_producto"],
      transaction: t,
    });
    const existentes = new Set(prods.map(p => p.id_producto));
    const faltantes = idsProd.filter(id => !existentes.has(id));
    if (faltantes.length) {
      await t.rollback();
      return res.status(400).json({ error: "Productos inexistentes", faltantes });
    }

    const lineas = items.map(i => ({
      id_pedido: pedido.id_pedido,
      id_producto: i.id_producto,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal_linea: calcSubtotalLine(i.cantidad, i.precio_unitario),
    }));
    await Contiene.bulkCreate(lineas, { transaction: t });

    const tot = await recalcTotales(pedido.id_pedido, descuento_total, impuesto_total, t);

    await t.commit();
    res.status(201).json({ ...pedido.toJSON(), ...tot });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// POST /api/pedidos/:id/items (agrega o actualiza una línea)
export const addPedidoItem = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { id_producto, cantidad, precio_unitario, descuento_total, impuesto_total } = req.body;
    
    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: "Pedido no encontrado" }); }

    const [row, created] = await Contiene.findOrCreate({
      where: { id_pedido: id, id_producto },
      defaults: {
        id_pedido: id,
        id_producto,
        cantidad,
        precio_unitario,
        subtotal_linea: calcSubtotalLine(cantidad, precio_unitario),
      },
      transaction: t,
    });

    if (!created) {
      await row.update({
        cantidad,
        precio_unitario,
        subtotal_linea: calcSubtotalLine(cantidad, precio_unitario),
      }, { transaction: t });
    }

    const tot = await recalcTotales(
      id,
      descuento_total ?? pedido.descuento_total,
      impuesto_total ?? pedido.impuesto_total,
      t
    );

    await t.commit();
    res.status(201).json({ ok: true, created, totals: tot });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// DELETE /api/pedidos/:id/items/:id_producto (elimina línea y recalcula)
export const deletePedidoItem = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id, id_producto } = req.params;
    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: "Pedido no encontrado" }); }

    const row = await Contiene.findOne({ where: { id_pedido: id, id_producto }, transaction: t });
    if (!row) { await t.rollback(); return res.status(404).json({ error: "Línea no encontrada" }); }
    await row.destroy({ transaction: t });

    const tot = await recalcTotales(id, pedido.descuento_total, pedido.impuesto_total, t);

    await t.commit();
    res.json({ ok: true, totals: tot });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// PUT /api/pedidos/:id (actualiza cabecera y totales)
export const updatePedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const pedido = await Pedido.findByPk(req.params.id, { transaction: t });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: "Pedido no encontrado" }); }

    const fields = ["fecha_pedido","hora_pedido","status","id_empleado","id_cliente","descuento_total","impuesto_total"];
    const toUpdate = {};
    for (const f of fields) if (req.body[f] !== undefined) toUpdate[f] = req.body[f];

    await pedido.update(toUpdate, { transaction: t });

    // Recalcular totales por si cambiaron descuento/impuesto
    const tot = await recalcTotales(
      pedido.id_pedido,
      toUpdate.descuento_total ?? pedido.descuento_total,
      toUpdate.impuesto_total ?? pedido.impuesto_total,
      t
    );

    await t.commit();
    res.json({ ...pedido.toJSON(), ...tot });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// DELETE /api/pedidos/:id (borra cabecera + líneas)
export const deletePedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const pedido = await Pedido.findByPk(req.params.id, { transaction: t });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: "Pedido no encontrado" }); }
    await Contiene.destroy({ where: { id_pedido: pedido.id_pedido }, transaction: t });
    await pedido.destroy({ transaction: t });
    await t.commit();
    res.json({ ok: true, mensaje: "Pedido eliminado" });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};