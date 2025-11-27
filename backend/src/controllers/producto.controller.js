import { sequelize, Producto, Proveedor, SeUbica } from "../models/index.js";

// GET y GET BY ID se quedan igual...
export const getAllProductos = async (req, res, next) => {
  try {
    const productos = await Producto.findAll({
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] },
        { model: SeUbica, attributes: ["nombre", "numero"] }
      ],
      order: [["id_producto", "ASC"]],
    });
    res.json(productos);
  } catch (err) { next(err); }
};

export const getProductoById = async (req, res, next) => {
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id, {
      include: [
        { model: Proveedor, attributes: ["id_proveedor", "nombre_proveedor"] },
        { model: SeUbica, attributes: ["nombre", "numero"] }
      ],
    });
    if (!producto) return res.status(404).json({ error: "Producto no encontrado" });
    res.json(producto);
  } catch (err) { next(err); }
};

/**
 * POST /api/productos
 * - Si el ID no existe: CREA el producto.
 * - Si el ID existe: ACTUALIZA (Suma stock y actualiza precio/nombre).
 */
export const createProducto = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { zona, ...datos } = req.body;

    // 1. Verificar si ya existe
    const existente = await Producto.findByPk(datos.id_producto, { transaction: t });

    let productoFinal;

    if (existente) {
      // --- CASO EXISTE: SUMAR STOCK ---
      const nuevoStock = Number(existente.stock) + Number(datos.stock);
      
      await existente.update({
        stock: nuevoStock,
        precio: datos.precio,          // Actualizamos precio al actual
        nombre_producto: datos.nombre_producto, // Actualizamos nombre por si cambió
        descripcion: datos.descripcion,
        id_proveedor: datos.id_proveedor
      }, { transaction: t });
      
      productoFinal = existente;
    } else {
      // --- CASO NUEVO: CREAR ---
      productoFinal = await Producto.create(datos, { transaction: t });
    }

    // 2. Gestionar Zona (SeUbica)
    // Si enviaron zona, actualizamos la ubicación (borrar anterior y poner nueva)
    if (zona !== undefined) {
      // Borramos ubicación previa si existe (para evitar duplicados o movimientos)
      await SeUbica.destroy({ where: { id_producto: datos.id_producto }, transaction: t });
      
      if (zona && zona.nombre && zona.numero !== undefined) {
        await SeUbica.create({
          id_producto: datos.id_producto,
          nombre: zona.nombre,
          numero: zona.numero
        }, { transaction: t });
      }
    }

    await t.commit();
    
    // Respondemos diferente según lo que pasó para que el frontend sepa
    const mensaje = existente ? "Stock sumado al producto existente" : "Producto creado correctamente";
    res.status(201).json({ ...productoFinal.toJSON(), mensaje_accion: mensaje });

  } catch (err) {
    await t.rollback();
    next(err);
  }
};

// UPDATE y DELETE se quedan igual...
export const updateProducto = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { zona, ...datos } = req.body;
    const producto = await Producto.findByPk(id, { transaction: t });
    if (!producto) { await t.rollback(); return res.status(404).json({ error: "Producto no encontrado" }); }
    
    await producto.update(datos, { transaction: t });

    if (zona !== undefined) {
      await SeUbica.destroy({ where: { id_producto: id }, transaction: t });
      if (zona && zona.nombre && zona.numero !== undefined) {
        await SeUbica.create({ id_producto: id, nombre: zona.nombre, numero: zona.numero }, { transaction: t });
      }
    }
    await t.commit();
    res.json(producto);
  } catch (err) { await t.rollback(); next(err); }
};

export const deleteProducto = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const producto = await Producto.findByPk(id);
    if (!producto) { await t.rollback(); return res.status(404).json({ error: "Producto no encontrado" }); }
    await SeUbica.destroy({ where: { id_producto: id }, transaction: t });
    await producto.destroy({ transaction: t });
    await t.commit();
    res.json({ ok: true });
  } catch (err) { await t.rollback(); next(err); }
};