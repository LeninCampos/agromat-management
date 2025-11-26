// backend/src/controllers/auth.controller.js
import { Empleado } from "../models/index.js";
import jwt from "jsonwebtoken";

export const login = async (req, res, next) => {
  try {
    const { correo, password } = req.body;

    // Buscar empleado por correo
    const empleado = await Empleado.findOne({ where: { correo } });

    if (!empleado) {
      return res.status(404).json({ error: "Empleado no encontrado" });
    }

    // Validar contraseña
    const passwordValido = await empleado.compararPassword(password);
    if (!passwordValido) {
      return res.status(401).json({ error: "Password incorrecto" });
    }

    // Datos que se envían dentro del token
    const payload = {
      id: empleado.id_empleado,
      nombre: empleado.nombre_empleado,
      rol: empleado.rol
    };

    // Firmar token
    const token = jwt.sign(
      payload,
      process.env.JWT_SECRET || "fallback_secret_dev",
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "8h"
      }
    );

    return res.json({ token });

  } catch (err) {
    next(err);
  }
};
