import { sequelize, Pedido, Cliente, Empleado, Contiene, Producto, Envio} from "../models/index.js";
import { Op } from "sequelize";

// --- Helpers ---
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

// --- Controladores ---

// GET /api/pedidos (AHORA INCLUYE PRODUCTOS)
export const getAllPedidos = async (req, res, next) => {
  try {
    const rows = await Pedido.findAll({
      include: [
        { model: Cliente, attributes: ["id_cliente", "nombre_cliente"] },
        { model: Empleado, attributes: ["id_empleado", "nombre_empleado"] },
        {
          model: Producto,
          // Esto es clave: trae los datos de la tabla intermedia (Contiene)
          through: { attributes: ["cantidad", "precio_unitario", "subtotal_linea"] },
          attributes: ["id_producto", "nombre_producto", "precio"]
        }
      ],
      order: [["id_pedido", "DESC"]], // Ordenar por más reciente
    });
    res.json(rows);
  } catch (err) { next(err); }
};

// GET /api/pedidos/:id
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

// POST /api/pedidos
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

// PUT /api/pedidos/:id (ACTUALIZADO PARA EDITAR ITEMS)
export const updatePedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { items, ...headerData } = req.body; // Separamos items del resto

    const pedido = await Pedido.findByPk(id, { transaction: t });
    if (!pedido) { await t.rollback(); return res.status(404).json({ error: "Pedido no encontrado" }); }

    // 1. Actualizar datos de cabecera (fecha, cliente, etc.)
    await pedido.update(headerData, { transaction: t });

    // 2. Si vienen items, reemplazamos los existentes (Estrategia: Borrar todo y crear nuevo)
    if (items && Array.isArray(items)) {
      // Borrar items viejos
      await Contiene.destroy({ where: { id_pedido: id }, transaction: t });
      
      // Crear items nuevos
      const lineas = items.map(i => ({
        id_pedido: id,
        id_producto: i.id_producto,
        cantidad: i.cantidad,
        precio_unitario: i.precio_unitario,
        subtotal_linea: calcSubtotalLine(i.cantidad, i.precio_unitario),
      }));
      await Contiene.bulkCreate(lineas, { transaction: t });
    }

    // 3. Recalcular totales
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

// DELETE /api/pedidos/:id
// DELETE /api/pedidos/:id (borra cabecera + líneas + envíos asociados)
export const deletePedido = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const pedido = await Pedido.findByPk(id, { transaction: t });
    
    if (!pedido) { 
      await t.rollback(); 
      return res.status(404).json({ error: "Pedido no encontrado" }); 
    }

    // 1. Eliminar los productos dentro del pedido (Tabla Contiene)
    await Contiene.destroy({ where: { id_pedido: pedido.id_pedido }, transaction: t });

    // 2. Buscar Envíos asociados a este pedido para borrarlos también
    const envios = await Envio.findAll({ 
      where: { id_pedido: pedido.id_pedido },
      attributes: ['id_envio'],
      transaction: t 
    });
    
    if (envios.length > 0) {
      const idsEnvios = envios.map(e => e.id_envio);
      
      await Envio.destroy({ where: { id_envio: idsEnvios }, transaction: t });
    }

    // 3. Finalmente eliminar el pedido
    await pedido.destroy({ transaction: t });

    await t.commit();
    res.json({ ok: true, mensaje: "Pedido y sus envíos eliminados correctamente" });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// ... (addPedidoItem y deletePedidoItem puedes dejarlos o quitarlos, ya no son estrictamente necesarios si usas el update completo)
export const addPedidoItem = async (req, res, next) => { /* ... código anterior ... */ };
export const deletePedidoItem = async (req, res, next) => { /* ... código anterior ... */ };