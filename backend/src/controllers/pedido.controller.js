// backend/src/controllers/pedido.controller.js
import {
  sequelize,
  Pedido,
  Cliente,
  Empleado,
  Contiene,
  Producto,
  Envio,
} from "../models/index.js";
import { Op } from "sequelize";

// =============================
// Helpers
// =============================
function calcSubtotalLine(cantidad, precio_unitario) {
  if (cantidad == null || precio_unitario == null) return null;
  return (Number(cantidad) * Number(precio_unitario)).toFixed(2);
}

async function recalcTotales(
  id_pedido,
  descuento_total = 0,
  impuesto_total = 0,
  t
) {
  const subtotal =
    (await Contiene.sum("subtotal_linea", {
      where: { id_pedido },
      transaction: t,
    })) || 0;

  const total =
    Number(subtotal) - Number(descuento_total) + Number(impuesto_total);

  await Pedido.update(
    { subtotal, descuento_total, impuesto_total, total },
    { where: { id_pedido }, transaction: t }
  );

  return { subtotal, descuento_total, impuesto_total, total };
}

// =============================
// GET /api/pedidos
// =============================
export const getAllPedidos = async (req, res, next) => {
  try {
    const rows = await Pedido.findAll({
      include: [
        {
          model: Cliente,
          attributes: ["id_cliente", "nombre_cliente", "direccion"],
        },
        {
          model: Empleado,
          attributes: ["id_empleado", "nombre_empleado"],
        },
        {
          model: Producto,
          through: {
            attributes: ["cantidad", "precio_unitario", "subtotal_linea"],
          },
          attributes: ["id_producto", "nombre_producto", "precio"],
        },
      ],
      order: [["id_pedido", "DESC"]],
    });

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// =============================
// GET /api/pedidos/:id
// =============================
export const getPedidoById = async (req, res, next) => {
  try {
    const row = await Pedido.findByPk(req.params.id, {
      include: [
        {
          model: Cliente,
          attributes: ["id_cliente", "nombre_cliente", "direccion"],
        },
        {
          model: Empleado,
          attributes: ["id_empleado", "nombre_empleado"],
        },
        {
          model: Producto,
          through: {
            attributes: ["cantidad", "precio_unitario", "subtotal_linea"],
          },
          attributes: ["id_producto", "nombre_producto", "precio"],
        },
      ],
    });

    if (!row) {
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    res.json(row);
  } catch (err) {
    next(err);
  }
};

// =============================
// POST /api/pedidos
// =============================
export const createPedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const {
      fecha_pedido,
      hora_pedido,
      status,
      id_empleado,
      id_cliente,
      direccion_envio, // 👈 NUEVO
      descuento_total = 0,
      impuesto_total = 0,
      items = [],
    } = req.body;

    const pedido = await Pedido.create(
      {
        fecha_pedido,
        hora_pedido,
        status,
        id_empleado,
        id_cliente,
        direccion_envio, // 👈 NUEVO
        subtotal: 0,
        descuento_total,
        impuesto_total,
        total: 0,
        last_change: "Pedido creado",
      },
      { transaction: t }
    );

    const lineas = items.map((i) => ({
      id_pedido: pedido.id_pedido,
      id_producto: i.id_producto,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal_linea: calcSubtotalLine(i.cantidad, i.precio_unitario),
    }));

    if (lineas.length > 0) {
      await Contiene.bulkCreate(lineas, { transaction: t });
    }

    const tot = await recalcTotales(
      pedido.id_pedido,
      descuento_total,
      impuesto_total,
      t
    );

    await t.commit();
    res.status(201).json({ ...pedido.toJSON(), ...tot });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// =============================
// PUT /api/pedidos/:id
// =============================
export const updatePedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { items, ...headerData } = req.body; // aquí viene direccion_envio también

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // --- construir el mensaje de cambio ---
    const cambios = [];

    if (headerData.status && headerData.status !== pedido.status) {
      cambios.push(`Status: ${pedido.status || "N/A"} → ${headerData.status}`);
    }

    if (
      headerData.direccion_envio &&
      headerData.direccion_envio !== pedido.direccion_envio
    ) {
      cambios.push("Dirección de envío actualizada");
    }

    const lastChangeText =
      cambios.length > 0 ? cambios.join(" | ") : "Pedido actualizado";

    // 1️⃣ Actualizar cabecera (incluye direccion_envio)
    await pedido.update(
      {
        ...headerData, // fecha, hora, status, direccion_envio, desc, imp, etc.
        last_change: lastChangeText,
      },
      { transaction: t }
    );

    // 2️⃣ Reemplazar items si vienen en el body
    if (items && Array.isArray(items)) {
      await Contiene.destroy({ where: { id_pedido: id }, transaction: t });

      const lineas = items.map((i) => ({
        id_pedido: id,
        id_producto: i.id_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal_linea: calcSubtotalLine(i.cantidad, i.precio_unitario),
      }));

      if (lineas.length > 0) {
        await Contiene.bulkCreate(lineas, { transaction: t });
      }
    }

    // 3️⃣ Recalcular totales
    const tot = await recalcTotales(
      pedido.id_pedido,
      headerData.descuento_total ?? pedido.descuento_total,
      headerData.impuesto_total ?? pedido.impuesto_total,
      t
    );

    await t.commit();
    res.json({ ...pedido.toJSON(), ...tot });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// =============================
// DELETE /api/pedidos/:id
// Borra cabecera + líneas + envíos asociados
// =============================
export const deletePedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id, { transaction: t });

    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // borrar líneas del pedido
    await Contiene.destroy({
      where: { id_pedido: pedido.id_pedido },
      transaction: t,
    });

    // borrar envíos ligados al pedido
    const envios = await Envio.findAll({
      where: { id_pedido: pedido.id_pedido },
      attributes: ["id_envio"],
      transaction: t,
    });

    if (envios.length > 0) {
      const idsEnvios = envios.map((e) => e.id_envio);
      await Envio.destroy({
        where: { id_envio: idsEnvios },
        transaction: t,
      });
    }

    // borrar cabecera
    await pedido.destroy({ transaction: t });

    await t.commit();
    res.json({
      ok: true,
      mensaje: "Pedido y sus envíos eliminados correctamente",
    });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// =============================
// (Opcionales) manejo de items sueltos
// =============================
export const addPedidoItem = async (req, res, next) => {
  // si después quieres, aquí podemos implementar agregar un item
  // sin rehacer todo el pedido.
  return res
    .status(501)
    .json({ error: "addPedidoItem aún no está implementado" });
};

export const deletePedidoItem = async (req, res, next) => {
  // igual que arriba, por ahora lo dejamos como no implementado.
  return res
    .status(501)
    .json({ error: "deletePedidoItem aún no está implementado" });
};
