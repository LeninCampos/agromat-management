import {
  sequelize, Envio, EnvioDetalle, Pedido, Empleado, Producto
} from "../models/index.js";

// Helper (no se exporta)
async function nextRenglon(id_envio, t) {
  const last = await EnvioDetalle.findOne({
    where: { id_envio },
    order: [["renglon", "DESC"]],
    attributes: ["renglon"],
    transaction: t,
  });
  return last ? last.renglon + 1 : 1;
}

// GET /api/envios
export const getAllEnvios = async (req, res, next) => {
  try {
    const rows = await Envio.findAll({
      include: [
        { model: Pedido, attributes: ["id_pedido", "status", "total"] },
        { model: Empleado, as: "responsable", attributes: ["id_empleado", "nombre_empleado"] },
      ],
      order: [["id_envio", "ASC"]],
    });
    res.json(rows);
  } catch (err) { next(err); }
};

export const uploadFotoEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1. Verificar que el envío exista
    const envio = await Envio.findByPk(id);
    if (!envio) {
      return res.status(404).json({ error: "Envío no encontrado" });
    }

    // 2. Verificar que el archivo se haya subido
    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo de imagen" });
    }

    // 3. Construir la URL de la imagen
    // req.file.filename nos lo da multer (ej: "1678886512345-mi-imagen.png")
    const urlImagen = `/uploads/envios/${req.file.filename}`;

    // 4. Actualizar la base de datos
    await envio.update({ url_imagen: urlImagen });

    res.json({ 
      ok: true, 
      mensaje: "Imagen subida correctamente", 
      url: urlImagen 
    });

  } catch (err) {
    next(err);
  }
};

// GET /api/envios/:id (con detalles)
export const getEnvioById = async (req, res, next) => {
  try {
    const row = await Envio.findByPk(req.params.id, {
      include: [
        { model: Pedido, attributes: ["id_pedido", "status", "total"] },
        { model: Empleado, as: "responsable", attributes: ["id_empleado", "nombre_empleado"] },
        {
          model: EnvioDetalle,
          include: [{ model: Producto, attributes: ["id_producto", "nombre_producto", "stock"] }],
        },
      ],
    });
    if (!row) return res.status(404).json({ error: "Envío no encontrado" });
    res.json(row);
  } catch (err) { next(err); }
};

// POST /api/envios (crea envío + detalles)
export const createEnvio = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id_pedido, codigo, id_empleado_responsable, observaciones, detalles = [] } = req.body;

    // Crear cabecera
    const envio = await Envio.create({
      codigo: codigo || `ENV-${Date.now()}`,
      id_pedido,
      id_empleado_responsable: id_empleado_responsable ?? null,
      status: "EN_PREPARACION",
      observaciones: observaciones ?? null,
    }, { transaction: t });

    // Insertar detalles
    for (const d of detalles) {
      const renglon = d.renglon ?? await nextRenglon(envio.id_envio, t);
      await EnvioDetalle.create({
        id_envio: envio.id_envio,
        renglon,
        id_producto: d.id_producto,
        cantidad: d.cantidad,
      }, { transaction: t });
    }

    await t.commit();
    const created = await Envio.findByPk(envio.id_envio); // respuesta breve
    res.status(201).json(created);
  } catch (err) {
    await t.rollback();
    if (err.original?.sqlMessage) {
      return next(new Error(err.original.sqlMessage));
    }
    next(err);
  }
};

// POST /api/envios/:id/detalles (agregar renglón)
export const addEnvioDetalle = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    const { id } = req.params;
    const { id_producto, cantidad, renglon } = req.body;

    const envio = await Envio.findByPk(id, { transaction: t });
    if (!envio) { await t.rollback(); return res.status(404).json({ error: "Envío no encontrado" }); }

    const r = renglon ?? await nextRenglon(envio.id_envio, t);
    const det = await EnvioDetalle.create({
      id_envio: envio.id_envio, renglon: r, id_producto, cantidad
    }, { transaction: t });

    await t.commit();
    res.status(201).json(det);
  } catch (err) {
    await t.rollback();
    if (err.original?.sqlMessage) {
      return next(new Error(err.original.sqlMessage));
    }
    next(err);
  }
};

// PUT /api/envios/:id (estado, responsable, observaciones, fecha_entrega)
export const updateEnvio = async (req, res, next) => {
  try {
    const envio = await Envio.findByPk(req.params.id);
    if (!envio) return res.status(404).json({ error: "Envío no encontrado" });

    const { status, id_empleado_responsable, observaciones, fecha_entrega } = req.body;
    await envio.update({
      ...(status !== undefined && { status }),
      ...(id_empleado_responsable !== undefined && { id_empleado_responsable }),
      ...(observaciones !== undefined && { observaciones }),
      ...(fecha_entrega !== undefined && { fecha_entrega }),
    });

    res.json(envio);
  } catch (err) { next(err); }
};