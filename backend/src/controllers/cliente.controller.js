import { Cliente } from "../models/index.js";

export const getAllClientes = async (req, res, next) => {
  try {
    const rows = await Cliente.findAll({ order: [["id_cliente", "ASC"]] });
    res.json(rows);
  } catch (err) { next(err); }
};

export const getClienteById = async (req, res, next) => {
  try {
    const row = await Cliente.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(row);
  } catch (err) { next(err); }
};

export const createCliente = async (req, res, next) => {
  try {
    const nuevo = await Cliente.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) {
    next(err);
  }
};

export const updateCliente = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    await cliente.update(req.body);
    res.json(cliente);
  } catch (err) {
    next(err);
  }
};

export const deleteCliente = async (req, res, next) => {
  try {
    const row = await Cliente.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Cliente no encontrado" });
    await row.destroy();
    res.json({ ok: true, mensaje: "Cliente eliminado" });
  } catch (err) { next(err); }
};