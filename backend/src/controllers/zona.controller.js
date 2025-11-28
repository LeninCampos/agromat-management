// backend/src/controllers/zona.controller.js
import { Zona } from "../models/index.js";

/**
 * GET /api/zonas
 * Lista todas las zonas
 */
export const getAllZonas = async (req, res, next) => {
  try {
    const zonas = await Zona.findAll({
      order: [
        ["rack", "ASC"],
        ["modulo", "ASC"],
        ["piso", "ASC"],
      ],
    });

    res.json(zonas);
  } catch (e) {
    next(e);
  }
};

/**
 * GET /api/zonas/:id
 * Obtiene una zona por id_zona
 */
export const getZonaById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const zona = await Zona.findByPk(id);
    if (!zona) {
      return res.status(404).json({ error: "Zona no encontrada" });
    }

    res.json(zona);
  } catch (e) {
    next(e);
  }
};

/**
 * POST /api/zonas
 * Crea una nueva zona
 * body: { rack, modulo, piso, descripcion?, codigo? }
 * Si no mandas codigo, se genera como rack+modulo+piso (ej: A31).
 */
export const createZona = async (req, res, next) => {
  try {
    const { rack, modulo, piso, descripcion } = req.body;

    // Si no viene código, lo generamos (A31, B42, etc.)
    const codigo =
      req.body.codigo ?? `${rack ?? ""}${modulo ?? ""}${piso ?? ""}`;

    const nueva = await Zona.create({
      rack,
      modulo,
      piso,
      codigo,
      descripcion,
    });

    res.status(201).json(nueva);
  } catch (e) {
    next(e);
  }
};

/**
 * PUT /api/zonas/:id
 * Actualiza una zona existente
 * body puede traer cualquiera de: { rack, modulo, piso, descripcion, codigo }
 * Si no mandas codigo pero cambias rack/modulo/piso, se regenera.
 */
export const updateZona = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { rack, modulo, piso, descripcion, codigo } = req.body;

    const zona = await Zona.findByPk(id);
    if (!zona) {
      return res.status(404).json({ error: "Zona no encontrada" });
    }

    // Preparamos los campos a actualizar
    const updates = {};

    if (rack !== undefined) updates.rack = rack;
    if (modulo !== undefined) updates.modulo = modulo;
    if (piso !== undefined) updates.piso = piso;
    if (descripcion !== undefined) updates.descripcion = descripcion;

    // Si mandaste codigo explícitamente, se usa tal cual
    if (codigo !== undefined) {
      updates.codigo = codigo;
    } else if (
      rack !== undefined ||
      modulo !== undefined ||
      piso !== undefined
    ) {
      // Si cambió rack/modulo/piso y NO mandaste codigo, lo regeneramos
      const finalRack = updates.rack ?? zona.rack;
      const finalModulo = updates.modulo ?? zona.modulo;
      const finalPiso = updates.piso ?? zona.piso;
      updates.codigo = `${finalRack}${finalModulo}${finalPiso}`;
    }

    await zona.update(updates);

    res.json(zona);
  } catch (e) {
    next(e);
  }
};

/**
 * DELETE /api/zonas/:id
 * Elimina una zona
 * (Ojo: puede fallar si está referenciada por seubica con FK RESTRICT)
 */
export const deleteZona = async (req, res, next) => {
  try {
    const { id } = req.params;

    const zona = await Zona.findByPk(id);
    if (!zona) {
      return res.status(404).json({ error: "Zona no encontrada" });
    }

    await zona.destroy();
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
};
