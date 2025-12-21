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

// Helper para determinar si un estado debe afectar (restar) el stock
// Según tu requerimiento: NO descontar si es 'cancelado' o 'pendiente'.
function debeDescontarStock(status) {
  const s = status ? status.toLowerCase() : "";
  return s !== "cancelado" && s !== "pendiente";
}

function calcSubtotalLine(cantidad, precio_unitario) {
  if (cantidad == null || precio_unitario == null) return null;
  return (Number(cantidad) * Number(precio_unitario)).toFixed(2);
}

async function recalcTotales(id_pedido, descuento_total = 0, impuesto_total = 0, t) {
  const subtotal = (await Contiene.sum("subtotal_linea", { where: { id_pedido }, transaction: t })) || 0;
  const total = Number(subtotal) - Number(descuento_total) + Number(impuesto_total);
  await Pedido.update({ subtotal, descuento_total, impuesto_total, total }, { where: { id_pedido }, transaction: t });
  return { subtotal, descuento_total, impuesto_total, total };
}

async function actualizarStockProductos(items, operacion, t, auditOptions = {}) {
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
      await producto.update({ stock: nuevoStock }, { transaction: t, ...auditOptions });
    }
  }
}

async function obtenerItemsPedido(id_pedido, t) {
  const items = await Contiene.findAll({ where: { id_pedido }, transaction: t });
  return items.map(item => ({ id_producto: item.id_producto, cantidad: item.cantidad }));
}

// Helper para verificar stock disponible antes de restar
async function verificarStockDisponible(items, t) {
  for (const item of items) {
    const producto = await Producto.findByPk(item.id_producto, { transaction: t });
    if (!producto) throw new Error(`Producto ${item.id_producto} no encontrado`);
    
    const stockDisponible = Number(producto.stock) || 0;
    const cantidadSolicitada = Number(item.cantidad) || 0;
    
    if (cantidadSolicitada > stockDisponible) {
      throw new Error(`Stock insuficiente para ${producto.nombre_producto}. Disponible: ${stockDisponible}, Solicitado: ${cantidadSolicitada}`);
    }
  }
}

function getAuditOptions(req) {
  return {
    userId: req.empleado?.id || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
  };
}

// =============================
// GET /api/pedidos
// =============================
export const getAllPedidos = async (req, res, next) => {
  try {
    const rows = await Pedido.findAll({
      include: [
        { model: Cliente, attributes: ["id_cliente", "nombre_cliente", "direccion"] },
        { model: Empleado, attributes: ["id_empleado", "nombre_empleado"] },
        { model: Producto, through: { attributes: ["cantidad", "precio_unitario", "subtotal_linea"] }, attributes: ["id_producto", "nombre_producto", "precio"] },
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
        { model: Cliente, attributes: ["id_cliente", "nombre_cliente", "direccion"] },
        { model: Empleado, attributes: ["id_empleado", "nombre_empleado"] },
        { model: Producto, through: { attributes: ["cantidad", "precio_unitario", "subtotal_linea"] }, attributes: ["id_producto", "nombre_producto", "precio"] },
      ],
    });
    if (!row) return res.status(404).json({ error: "Pedido no encontrado" });
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
  const auditOptions = getAuditOptions(req);

  try {
    const {
      fecha_pedido, hora_pedido, status, id_empleado, id_cliente, direccion_envio,
      descuento_total = 0, impuesto_total = 0, items = [],
      quien_pidio, fecha_entrega_estimada, observaciones, numero_remito,
    } = req.body;

    // Verificar si el estado requiere validación y descuento de stock
    if (debeDescontarStock(status)) {
      try {
        await verificarStockDisponible(items, t);
      } catch (error) {
        await t.rollback();
        return res.status(400).json({ error: error.message });
      }
    }

    const pedido = await Pedido.create({
      fecha_pedido, hora_pedido, status, id_empleado, id_cliente, direccion_envio,
      subtotal: 0, descuento_total, impuesto_total, total: 0, last_change: "Pedido creado",
      quien_pidio: quien_pidio || null,
      fecha_entrega_estimada: fecha_entrega_estimada || null,
      observaciones: observaciones || null,
      numero_remito: numero_remito || null,
    }, { transaction: t, ...auditOptions });

    const lineas = items.map((i) => ({
      id_pedido: pedido.id_pedido,
      id_producto: i.id_producto,
      cantidad: i.cantidad,
      precio_unitario: i.precio_unitario,
      subtotal_linea: calcSubtotalLine(i.cantidad, i.precio_unitario),
    }));

    if (lineas.length > 0) {
      await Contiene.bulkCreate(lineas, { transaction: t, ...auditOptions });
      
      // Solo actualizamos stock si el estado NO es pendiente ni cancelado
      if (debeDescontarStock(status)) {
        await actualizarStockProductos(items, 'restar', t, auditOptions);
      }
    }

    const tot = await recalcTotales(pedido.id_pedido, descuento_total, impuesto_total, t);

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
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    const { items, ...headerData } = req.body;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const oldStatus = pedido.status;
    const newStatus = headerData.status !== undefined ? headerData.status : oldStatus;
    const statusChanged = oldStatus !== newStatus;

    // Actualizar cabecera
    await pedido.update({
      ...headerData,
      numero_remito: headerData.numero_remito !== undefined ? headerData.numero_remito : pedido.numero_remito,
      last_change: `Actualizado el ${new Date().toLocaleString()}`,
    }, { transaction: t, ...auditOptions });

    // CASO 1: Se envían nuevos items (Reemplazo total de items)
    if (items && Array.isArray(items)) {
      const itemsAnteriores = await obtenerItemsPedido(id, t);
      
      // 1. Restaurar stock de items anteriores SI el estado anterior descontaba stock
      if (debeDescontarStock(oldStatus) && itemsAnteriores.length > 0) {
        await actualizarStockProductos(itemsAnteriores, 'sumar', t, auditOptions);
      }

      // 2. Verificar disponibilidad para nuevos items SI el nuevo estado descuenta stock
      if (debeDescontarStock(newStatus)) {
        try {
            await verificarStockDisponible(items, t);
        } catch (error) {
            await t.rollback();
            return res.status(400).json({ error: error.message });
        }
      }

      // 3. Reemplazar items en DB
      await Contiene.destroy({ where: { id_pedido: id }, transaction: t });
      
      const lineas = items.map((i) => ({
        id_pedido: id,
        id_producto: i.id_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal_linea: calcSubtotalLine(i.cantidad, i.precio_unitario),
      }));

      if (lineas.length > 0) {
        await Contiene.bulkCreate(lineas, { transaction: t, ...auditOptions });
        
        // 4. Restar stock de nuevos items SI el nuevo estado lo requiere
        if (debeDescontarStock(newStatus)) {
          await actualizarStockProductos(items, 'restar', t, auditOptions);
        }
      }

    } else if (statusChanged) {
      // CASO 2: Solo cambió el estado, pero los items son los mismos
      const currentItems = await obtenerItemsPedido(id, t);
      
      // Si antes descontaba y ahora NO (ej: Entregado -> Cancelado) => RESTAURAR STOCK
      if (debeDescontarStock(oldStatus) && !debeDescontarStock(newStatus)) {
        await actualizarStockProductos(currentItems, 'sumar', t, auditOptions);
      }
      
      // Si antes NO descontaba y ahora SI (ej: Pendiente -> Entregado) => RESTAR STOCK
      else if (!debeDescontarStock(oldStatus) && debeDescontarStock(newStatus)) {
        try {
            await verificarStockDisponible(currentItems, t);
            await actualizarStockProductos(currentItems, 'restar', t, auditOptions);
        } catch (error) {
            await t.rollback();
            return res.status(400).json({ error: error.message });
        }
      }
    }

    const tot = await recalcTotales(pedido.id_pedido, headerData.descuento_total ?? pedido.descuento_total, headerData.impuesto_total ?? pedido.impuesto_total, t);

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
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "No existe" });
    }

    const itemsPedido = await obtenerItemsPedido(id, t);
    
    // Solo restauramos stock si el estado del pedido eliminado implicaba descuento
    if (itemsPedido.length > 0 && debeDescontarStock(pedido.status)) {
      await actualizarStockProductos(itemsPedido, 'sumar', t, auditOptions);
    }

    await Contiene.destroy({ where: { id_pedido: id }, transaction: t });
    await Envio.destroy({ where: { id_pedido: id }, transaction: t });
    await pedido.destroy({ transaction: t, ...auditOptions });

    await t.commit();
    res.json({ ok: true, message: "Pedido eliminado" });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// =============================
// Manejo de items sueltos
// =============================
export const addPedidoItem = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    const { id_producto, cantidad, precio_unitario } = req.body;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const producto = await Producto.findByPk(id_producto, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Verificar stock solo si el estado actual lo requiere
    const stockDisponible = Number(producto.stock) || 0;
    const cantidadSolicitada = Number(cantidad) || 0;

    if (debeDescontarStock(pedido.status)) {
        if (cantidadSolicitada > stockDisponible) {
          await t.rollback();
          return res.status(400).json({ error: `Stock insuficiente. Disponible: ${stockDisponible}` });
        }
    }

    await Contiene.create({
      id_pedido: id, id_producto, cantidad, precio_unitario,
      subtotal_linea: calcSubtotalLine(cantidad, precio_unitario),
    }, { transaction: t, ...auditOptions });

    // Actualizar stock solo si el estado lo requiere
    if (debeDescontarStock(pedido.status)) {
        await producto.update({ stock: stockDisponible - cantidadSolicitada }, { transaction: t, ...auditOptions });
    }
    
    await recalcTotales(id, pedido.descuento_total, pedido.impuesto_total, t);

    await t.commit();
    res.json({ ok: true, message: "Item agregado" });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

export const deletePedidoItem = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);

  try {
    const { id, id_producto } = req.params;

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const item = await Contiene.findOne({ where: { id_pedido: id, id_producto }, transaction: t });
    if (!item) {
      await t.rollback();
      return res.status(404).json({ error: "Item no encontrado en el pedido" });
    }

    // Solo devolver stock si el estado lo requiere
    if (debeDescontarStock(pedido.status)) {
        const producto = await Producto.findByPk(id_producto, { transaction: t });
        if (producto) {
          await producto.update({ stock: Number(producto.stock || 0) + Number(item.cantidad || 0) }, { transaction: t, ...auditOptions });
        }
    }

    await item.destroy({ transaction: t, ...auditOptions });
    await recalcTotales(id, pedido.descuento_total, pedido.impuesto_total, t);

    await t.commit();
    res.json({ ok: true, message: "Item eliminado" });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};