// backend/src/controllers/envio.controller.js
import {
  sequelize,
  Envio,
  Pedido,
  Empleado,
  Cliente,
  FotoEnvio,
} from "../models/index.js";
import path from "path";
import fs from "fs";

// Helper para obtener opciones de auditoría
function getAuditOptions(req) {
  return {
    userId: req.empleado?.id || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
  };
}

// GET /api/envios
export const getAllEnvios = async (req, res, next) => {
  try {
    const rows = await Envio.findAll({
      include: [
        {
          model: Pedido,
          attributes: ["id_pedido", "status", "total", "direccion_envio", "numero_remito"],
          include: [{ model: Cliente, attributes: ["nombre_cliente", "direccion"] }],
        },
        { model: Empleado, as: "responsable", attributes: ["id_empleado", "nombre_empleado", "rol"] },
        { model: FotoEnvio, as: "fotos", attributes: ["id", "url", "nombre_archivo", "descripcion", "created_at"] },
      ],
      order: [["id_envio", "DESC"]],
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
          attributes: ["id_pedido", "status", "total", "direccion_envio", "numero_remito"],
          include: [{ model: Cliente, attributes: ["nombre_cliente", "direccion"] }],
        },
        { model: Empleado, as: "responsable", attributes: ["id_empleado", "nombre_empleado", "rol"] },
        { model: FotoEnvio, as: "fotos", attributes: ["id", "url", "nombre_archivo", "descripcion", "created_at"] },
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
  const auditOptions = getAuditOptions(req);

  try {
    const { id_pedido, codigo, id_empleado_responsable, observaciones, nombre_conductor, telefono_conductor, placa_vehiculo } = req.body;

    const pedido = await Pedido.findByPk(id_pedido, { transaction: t });
    if (!pedido) {
      await t.rollback();
      return res.status(404).json({ error: "Pedido no encontrado" });
    }

    const envio = await Envio.create({
      codigo: codigo || `ENV-${Date.now()}`,
      id_pedido,
      numero_remito: pedido.numero_remito || null,
      id_empleado_responsable: id_empleado_responsable ?? null,
      status: "EN_PREPARACION",
      observaciones: observaciones ?? null,
      nombre_conductor: nombre_conductor || null,
      telefono_conductor: telefono_conductor || null,
      placa_vehiculo: placa_vehiculo || null,
    }, { transaction: t, ...auditOptions });

    await t.commit();
    res.status(201).json(envio);
  } catch (err) {
    if (!t.finished) await t.rollback();
    console.error("Error en createEnvio:", err);
    if (err.original?.sqlMessage) return next(new Error(err.original.sqlMessage));
    next(err);
  }
};

// PUT /api/envios/:id
export const updateEnvio = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const envio = await Envio.findByPk(req.params.id);
    if (!envio) return res.status(404).json({ error: "Envío no encontrado" });

    const { status, id_empleado_responsable, observaciones, nombre_conductor, telefono_conductor, placa_vehiculo, fecha_entrega, numero_remito } = req.body;

    await envio.update({
      ...(status !== undefined && { status }),
      ...(id_empleado_responsable !== undefined && { id_empleado_responsable }),
      ...(observaciones !== undefined && { observaciones }),
      ...(nombre_conductor !== undefined && { nombre_conductor }),
      ...(telefono_conductor !== undefined && { telefono_conductor }),
      ...(placa_vehiculo !== undefined && { placa_vehiculo }),
      ...(fecha_entrega !== undefined && { fecha_entrega }),
      ...(numero_remito !== undefined && { numero_remito }),
    }, auditOptions);

    res.json(envio);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/envios/:id
export const deleteEnvio = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    const envio = await Envio.findByPk(id);
    if (!envio) return res.status(404).json({ error: "Envío no encontrado" });

    await envio.destroy(auditOptions);
    res.json({ ok: true, message: "Envío eliminado correctamente" });
  } catch (err) {
    next(err);
  }
};

// =====================================================
// Endpoints para manejo de fotos múltiples
// =====================================================

// POST /api/envios/:id/fotos
export const uploadFotosEnvio = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    const envio = await Envio.findByPk(id);
    if (!envio) return res.status(404).json({ error: "Envío no encontrado" });

    if (!req.files || req.files.length === 0) return res.status(400).json({ error: "No se subieron archivos" });

    const fotosCreadas = [];
    for (const file of req.files) {
      const urlImagen = `/uploads/envios/${file.filename}`;
      const foto = await FotoEnvio.create({
        id_envio: id,
        url: urlImagen,
        nombre_archivo: file.originalname,
        descripcion: req.body.descripcion || null,
      }, auditOptions);
      fotosCreadas.push(foto);
    }

    res.json({ ok: true, mensaje: `${fotosCreadas.length} foto(s) subida(s) correctamente`, fotos: fotosCreadas });
  } catch (err) {
    next(err);
  }
};

// GET /api/envios/:id/fotos
export const getFotosEnvio = async (req, res, next) => {
  try {
    const { id } = req.params;
    const envio = await Envio.findByPk(id);
    if (!envio) return res.status(404).json({ error: "Envío no encontrado" });

    const fotos = await FotoEnvio.findAll({ where: { id_envio: id }, order: [["created_at", "DESC"]] });
    res.json(fotos);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/envios/:id/fotos/:fotoId
export const deleteFotoEnvio = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const { id, fotoId } = req.params;
    const foto = await FotoEnvio.findOne({ where: { id: fotoId, id_envio: id } });
    if (!foto) return res.status(404).json({ error: "Foto no encontrada" });

    if (foto.url) {
      const filePath = path.join(process.cwd(), "public", foto.url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await foto.destroy(auditOptions);
    res.json({ ok: true, message: "Foto eliminada correctamente" });
  } catch (err) {
    next(err);
  }
};

// Compatibilidad: una sola foto
export const uploadFotoEnvio = async (req, res, next) => {
  const auditOptions = getAuditOptions(req);

  try {
    const { id } = req.params;
    const envio = await Envio.findByPk(id);
    if (!envio) return res.status(404).json({ error: "Envío no encontrado" });

    if (!req.file) return res.status(400).json({ error: "No se subió ningún archivo" });

    const urlImagen = `/uploads/envios/${req.file.filename}`;
    const foto = await FotoEnvio.create({ id_envio: id, url: urlImagen, nombre_archivo: req.file.originalname }, auditOptions);
    await envio.update({ url_imagen: urlImagen }, auditOptions);

    res.json({ ok: true, mensaje: "Imagen subida correctamente", url: urlImagen, foto });
  } catch (err) {
    next(err);
  }
};