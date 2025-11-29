// backend/src/controllers/envio.controller.js
import {
  sequelize,
  Envio,
  Pedido,
  Empleado,
  Cliente,
} from "../models/index.js";

// GET /api/envios
export const getAllEnvios = async (req, res, next) => {
  try {
    const rows = await Envio.findAll({
      include: [
        {
          model: Pedido,
          attributes: ["id_pedido", "status", "total", "direccion_envio"],
          include: [
            {
              model: Cliente,
              attributes: ["nombre_cliente", "direccion"],
            },
          ],
        },
        {
          model: Empleado,
          as: "responsable",
          attributes: ["id_empleado", "nombre_empleado", "rol"],
        },
      ],
      order: [["id_envio", "ASC"]],
    });

    res.json(rows);
  } catch (err) {
    next(err);
  }
};

// GET /api/envios/:id
export const getEnvioById = async (req, res, next) => {
  try {
    const row = await Envio.findByPk(req.params.id, {
      include: [
        {
          model: Pedido,
          attributes: ["id_pedido", "status", "total", "direccion_envio"],
          include: [
            {
              model: Cliente,
              attributes: ["nombre_cliente", "direccion"],
            },
          ],
        },
        {
          model: Empleado,
          as: "responsable",
          attributes: ["id_empleado", "nombre_empleado", "rol"],
        },
      ],
    });

    if (!row) return res.status(404).json({ error: "Envío no encontrado" });

    res.json(row);
  } catch (err) {
    next(err);
  }
};

// POST /api/envios
export const createEnvio = async (req, res, next) => {
  const t = await sequelize.transaction();

  try {
    const {
      id_pedido,
      codigo,
      id_empleado_responsable,
      observaciones,

      // nuevos
      nombre_conductor,
      telefono_conductor,
      placa_vehiculo,
    } = req.body;

    const envio = await Envio.create(
      {
        codigo: codigo || `ENV-${Date.now()}`,
        id_pedido,
        id_empleado_responsable: id_empleado_responsable ?? null,
        status: "EN_PREPARACION",
        observaciones: observaciones ?? null,

        nombre_conductor: nombre_conductor || null,
        telefono_conductor: telefono_conductor || null,
        placa_vehiculo: placa_vehiculo || null,
      },
      { transaction: t }
    );

    await t.commit();
    res.status(201).json(envio);
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error("Error en createEnvio:", err);
    if (err.original?.sqlMessage) {
      return next(new Error(err.original.sqlMessage));
    }
    next(err);
  }
};

// PUT /api/envios/:id
export const updateEnvio = async (req, res, next) => {
  try {
    const envio = await Envio.findByPk(req.params.id);
    if (!envio) {
      return res.status(404).json({ error: "Envío no encontrado" });
    }

    const {
      status,
      id_empleado_responsable,
      observaciones,
      nombre_conductor,
      telefono_conductor,
      placa_vehiculo,
      fecha_entrega,
    } = req.body;

    await envio.update({
      ...(status !== undefined && { status }),
      ...(id_empleado_responsable !== undefined && {
        id_empleado_responsable,
      }),
      ...(observaciones !== undefined && { observaciones }),
      ...(nombre_conductor !== undefined && { nombre_conductor }),
      ...(telefono_conductor !== undefined && { telefono_conductor }),
      ...(placa_vehiculo !== undefined && { placa_vehiculo }),
      ...(fecha_entrega !== undefined && { fecha_entrega }),
    });

    res.json(envio);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/envios/:id
export const deleteEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const envio = await Envio.findByPk(id);

    if (!envio) {
      return res.status(404).json({ error: "Envío no encontrado" });
    }

    await envio.destroy();
    res.json({ ok: true, message: "Envío eliminado correctamente" });
  } catch (err) {
    next(err);
  }
};

// POST /api/envios/:id/foto (si luego quieres usar la foto)
export const uploadFotoEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;

    const envio = await Envio.findByPk(id);
    if (!envio) {
      return res.status(404).json({ error: "Envío no encontrado" });
    }

    if (!req.file) {
      return res.status(400).json({ error: "No se subió ningún archivo" });
    }

    const urlImagen = `/uploads/envios/${req.file.filename}`;

    await envio.update({ url_imagen: urlImagen });

    res.json({
      ok: true,
      mensaje: "Imagen subida correctamente",
      url: urlImagen,
    });
  } catch (err) {
    next(err);
  }
};
