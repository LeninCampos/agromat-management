import { Empleado } from "../models/index.js";
import jwt from "jsonwebtoken";

export const login = async (req, res, next) => {
  try {
    const { correo, password } = req.body;

    const empleado = await Empleado.findOne({ where: { correo } });
    if (!empleado) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    const passwordValido = await empleado.compararPassword(password);
    if (!passwordValido) {
      return res.status(401).json({ error: "Password incorrecto" });
    }

    const payload = {
      id: empleado.id_empleado,
      nombre: empleado.nombre_empleado,
      rol: empleado.rol
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "8h",
    });

    res.json({ token });

  } catch (err) {
    next(err);
  }
};