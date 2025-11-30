import { sequelize, Suministro, Proveedor, Suministra, Producto } from "../models/index.js";


export const getAllSuministros = async (req, res, next) => {
  try {
    const rows = await Suministro.findAll({
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] },
        { 
          model: Suministra, 
          include: [{ model: Producto, attributes: ["id_producto", "nombre_producto"] }] 
        }
      ],
      order: [["id_suministro", "DESC"]],
    });
    res.json(rows);
  } catch (e) {
    next(e);
  }
};

export const getSuministroById = async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id, {
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] },
        { 
          model: Suministra, 
          include: [{ model: Producto, attributes: ["id_producto", "nombre_producto"] }] 
        },
      ],
    });
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    res.json(row);
  } catch (e) {
    next(e);
  }
};

export const createSuministro = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { fecha_llegada, hora_llegada, id_proveedor, items } = req.body;

    // 1. Crear Cabecera del Suministro
    const suministro = await Suministro.create({
      fecha_llegada,
      hora_llegada,
      id_proveedor
    }, { transaction: t });

    // 2. Procesar los items (si existen)
    if (items && items.length > 0) {
      for (const item of items) {
        const { id_producto, cantidad } = item;

        // a) Registrar en tabla intermedia 'suministra'
        await Suministra.create({
          id_suministro: suministro.id_suministro,
          id_producto,
          cantidad
        }, { transaction: t });

        const producto = await Producto.findByPk(id_producto, { transaction: t });
        if (producto) {
          await producto.increment('stock', { by: cantidad, transaction: t });
        }
      }
    }

    await t.commit();
    res.status(201).json(suministro);

  } catch (e) {
    if (!t.finished) await t.rollback();
    next(e);
  }
};

export const updateSuministro = async (req, res, next) => {
  try {
    const row = await Suministro.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Suministro no encontrado" });
    await row.update({ ...req.body });
    res.json(row);
  } catch (e) { next(e); }
};

export const deleteSuministro = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;

    // 1. Buscar el suministro con sus detalles para saber qué revertir
    const suministro = await Suministro.findByPk(id, {
      include: [{ model: Suministra }],
      transaction: t
    });

    if (!suministro) {
      await t.rollback();
      return res.status(404).json({ error: "Suministro no encontrado" });
    }

    // 2. (Opcional pero recomendado) Revertir el stock: Restar lo que se había sumado
    // Si solo quieres borrar el registro sin tocar stock, puedes comentar este bloque 'for'.
    for (const item of suministro.Suministras) {
      const producto = await Producto.findByPk(item.id_producto, { transaction: t });
      if (producto) {
        // decrementamos el stock porque estamos deshaciendo una entrada
        await producto.decrement('stock', { by: item.cantidad, transaction: t });
      }
    }

    // 3. Borrar los detalles primero (Soluciona el error ForeignKey)
    await Suministra.destroy({ where: { id_suministro: id }, transaction: t });

    // 4. Borrar la cabecera
    await suministro.destroy({ transaction: t });

    await t.commit();
    res.json({ ok: true, message: "Suministro eliminado y stock revertido" });

  } catch (e) {
    await t.rollback();
    next(e);
  }
};