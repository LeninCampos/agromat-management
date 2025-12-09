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
// HELPER: Actualizar stock de productos después de un pedido
// =============================
async function actualizarStockProductos(items, operacion, t) {
  // operacion: 'restar' para nuevos pedidos, 'sumar' para eliminar pedidos
  for (const item of items) {
    const producto = await Producto.findByPk(item.id_producto, { transaction: t });
    if (producto) {
      const cantidad = Number(item.cantidad) || 0;
      let nuevoStock;

      if (operacion === 'restar') {
        nuevoStock = Math.max(0, Number(producto.stock || 0) - cantidad);
      } else {
        nuevoStock = Number(producto.stock || 0) + cantidad;
      }

      await producto.update({ stock: nuevoStock }, { transaction: t });
    }
  }
}

// =============================
// HELPER: Obtener items actuales de un pedido
// =============================
async function obtenerItemsPedido(id_pedido, t) {
  const items = await Contiene.findAll({
    where: { id_pedido },
    transaction: t,
  });
  return items.map(item => ({
    id_producto: item.id_producto,
    cantidad: item.cantidad,
  }));
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
      direccion_envio,
      descuento_total = 0,
      impuesto_total = 0,
      items = [],
    } = req.body;

    // Verificar que hay suficiente stock antes de crear el pedido
    for (const item of items) {
      const producto = await Producto.findByPk(item.id_producto, { transaction: t });
      if (!producto) {
        await t.rollback();
        return res.status(400).json({
          error: `Producto ${item.id_producto} no encontrado`,
        });
      }
      
      const stockDisponible = Number(producto.stock) || 0;
      const cantidadSolicitada = Number(item.cantidad) || 0;
      
      if (cantidadSolicitada > stockDisponible) {
        await t.rollback();
        return res.status(400).json({
          error: `Stock insuficiente para ${producto.nombre_producto}. Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`,
        });
      }
    }

    const pedido = await Pedido.create(
      {
        fecha_pedido,
        hora_pedido,
        status,
        id_empleado,
        id_cliente,
        direccion_envio,
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
      
      // ⚡ RESTAR STOCK de los productos
      await actualizarStockProductos(items, 'restar', t);
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
    const { items, ...headerData } = req.body;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // Actualizar cabecera
    await pedido.update({
      ...headerData,
      last_change: `Actualizado el ${new Date().toLocaleString()}`,
    }, { transaction: t });

    if (items && Array.isArray(items)) {
      // Obtener items anteriores para devolver stock
      const itemsAnteriores = await obtenerItemsPedido(id, t);
      
      // Devolver stock de items anteriores
      if (itemsAnteriores.length > 0) {
        await actualizarStockProductos(itemsAnteriores, 'sumar', t);
      }

      // Verificar stock disponible para los nuevos items
      for (const item of items) {
        const producto = await Producto.findByPk(item.id_producto, { transaction: t });
        if (!producto) {
          await t.rollback();
          return res.status(400).json({
            error: `Producto ${item.id_producto} no encontrado`,
          });
        }

        const stockDisponible = Number(producto.stock) || 0;
        const cantidadSolicitada = Number(item.cantidad) || 0;

        if (cantidadSolicitada > stockDisponible) {
          await t.rollback();
          return res.status(400).json({
            error: `Stock insuficiente para ${producto.nombre_producto}. Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`,
          });
        }
      }

      // Eliminar items anteriores
      await Contiene.destroy({ where: { id_pedido: id }, transaction: t });

      // Crear nuevos items
      const lineas = items.map((i) => ({
        id_pedido: id,
        id_producto: i.id_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal_linea: calcSubtotalLine(i.cantidad, i.precio_unitario),
      }));

      if (lineas.length > 0) {
        await Contiene.bulkCreate(lineas, { transaction: t });
        
        // ⚡ RESTAR STOCK de los nuevos items
        await actualizarStockProductos(items, 'restar', t);
      }
    }

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
// =============================
export const deletePedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "No existe" });
    }

    // Obtener items del pedido para devolver stock
    const itemsPedido = await obtenerItemsPedido(id, t);

    // ⚡ DEVOLVER STOCK de los productos
    if (itemsPedido.length > 0) {
      await actualizarStockProductos(itemsPedido, 'sumar', t);
    }

    await Contiene.destroy({ where: { id_pedido: id }, transaction: t });
    await Envio.destroy({ where: { id_pedido: id }, transaction: t });
    await pedido.destroy({ transaction: t });

    await t.commit();
    res.json({ ok: true, message: "Pedido eliminado y stock restaurado" });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// =============================
// (Opcionales) manejo de items sueltos
// =============================
export const addPedidoItem = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { id_producto, cantidad, precio_unitario } = req.body;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // Verificar stock
    const producto = await Producto.findByPk(id_producto, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    const stockDisponible = Number(producto.stock) || 0;
    const cantidadSolicitada = Number(cantidad) || 0;

    if (cantidadSolicitada > stockDisponible) {
      await t.rollback();
      return res.status(400).json({
        error: `Stock insuficiente. Disponible: ${stockDisponible}`,
      });
    }

    // Crear línea
    await Contiene.create({
      id_pedido: id,
      id_producto,
      cantidad,
      precio_unitario,
      subtotal_linea: calcSubtotalLine(cantidad, precio_unitario),
    }, { transaction: t });

    // Restar stock
    await producto.update({
      stock: stockDisponible - cantidadSolicitada,
    }, { transaction: t });

    // Recalcular totales
    await recalcTotales(id, pedido.descuento_total, pedido.impuesto_total, t);

    await t.commit();
    res.json({ ok: true, message: "Item agregado y stock actualizado" });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

export const deletePedidoItem = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id, id_producto } = req.params;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    // Buscar el item
    const item = await Contiene.findOne({
      where: { id_pedido: id, id_producto },
      transaction: t,
    });

    if (!item) {
      await t.rollback();
      return res.status(404).json({ error: "Item no encontrado en el pedido" });
    }

    // Devolver stock
    const producto = await Producto.findByPk(id_producto, { transaction: t });
    if (producto) {
      await producto.update({
        stock: Number(producto.stock || 0) + Number(item.cantidad || 0),
      }, { transaction: t });
    }

    // Eliminar item
    await item.destroy({ transaction: t });

    // Recalcular totales
    await recalcTotales(id, pedido.descuento_total, pedido.impuesto_total, t);

    await t.commit();
    res.json({ ok: true, message: "Item eliminado y stock restaurado" });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};