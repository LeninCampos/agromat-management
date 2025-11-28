// backend/src/controllers/producto.controller.js
import {
  sequelize,
  Producto,
  Proveedor,
  SeUbica,
  Zona,
} from "../models/index.js";

// =======================
// GET: todos los productos
// =======================
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
              attributes: ["id_zona", "codigo"],
            },
          ],
        },
      ],
      order: [["id_producto", "ASC"]],
    });

    res.json(productos);
  } catch (err) {
    next(err);
  }
};

// =======================
// GET: producto por ID
// =======================
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
              attributes: ["id_zona", "codigo"],
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

// ==========================================================
// POST /api/productos
// - Si el ID NO existe: CREA el producto.
// - Si el ID YA existe: suma stock y actualiza datos.
// ==========================================================
export const createProducto = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    // zona puede ser { id_zona } o null
    const { zona, ...datos } = req.body;

    // 1) Buscar si ya existe el producto
    const existente = await Producto.findByPk(datos.id_producto, {
      transaction: t,
    });

    let productoFinal;

    if (existente) {
      // --- CASO EXISTE: actualizar y sumar stock ---
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
      // --- CASO NUEVO: crear producto ---
      productoFinal = await Producto.create(datos, { transaction: t });
    }

    // 2) Manejar la ubicación en seubica
    //    El frontend SIEMPRE manda el campo zona (null o { id_zona })
    if (zona !== undefined) {
      // Borro cualquier ubicación previa de ese producto
      await SeUbica.destroy({
        where: { id_producto: datos.id_producto },
        transaction: t,
      });

      // Si viene una zona válida, la creo
      if (zona && zona.id_zona != null) {
        await SeUbica.create(
          {
            id_producto: datos.id_producto,
            id_zona: Number(zona.id_zona),
          },
          { transaction: t }
        );
      }
      // Si zona es null => se queda sin ubicación
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

// =======================
// PUT /api/productos/:id
// =======================
export const updateProducto = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;
    // zona puede ser { id_zona } o null
    const { zona, ...datos } = req.body;

    const producto = await Producto.findByPk(id, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Actualiza datos del producto (incluye imagen_url si viene)
    await producto.update(datos, { transaction: t });

    // Manejo de zona
    if (zona !== undefined) {
      // Elimino ubicación previa
      await SeUbica.destroy({
        where: { id_producto: id },
        transaction: t,
      });

      // Si mandan una zona válida se crea
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

// =======================
// DELETE /api/productos/:id
// =======================
export const deleteProducto = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const { id } = req.params;

    const producto = await Producto.findByPk(id, { transaction: t });
    if (!producto) {
      await t.rollback();
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    // Borrar ubicaciones primero
    await SeUbica.destroy({
      where: { id_producto: id },
      transaction: t,
    });

    await producto.destroy({ transaction: t });
    await t.commit();

    res.json({ ok: true });
  } catch (err) {
    await t.rollback();
    next(err);
  }
};
