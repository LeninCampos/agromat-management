// src/middleware/validateCliente.js
import { body, validationResult } from "express-validator";

const telefonoRegex = /^[0-9+\-\s()]{6,20}$/;

export const validateClienteCreate = [
  body("nombre_cliente")
    .notEmpty().withMessage("El nombre es obligatorio").bail()
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  body("telefono")
    .notEmpty().withMessage("El teléfono es obligatorio").bail()
    .matches(telefonoRegex).withMessage("Teléfono inválido"),
  body("direccion")
    .notEmpty().withMessage("La dirección es obligatoria").bail()
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),
  body("correo_cliente")
    .optional({ values: "falsy" })
    .isEmail().withMessage("Correo inválido")
    .isLength({ max: 254 }).withMessage("Correo demasiado largo"),
  body("fecha_alta")
    .optional({ values: "falsy" })
    .isISO8601().withMessage("Fecha inválida (ISO 8601: YYYY-MM-DD)"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg })) });
    next();
  },
];

export const validateClienteUpdate = [
  body("nombre_cliente")
    .optional().notEmpty().withMessage("No puede ser vacío")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  body("telefono")
    .optional().notEmpty().withMessage("No puede ser vacío")
    .matches(telefonoRegex).withMessage("Teléfono inválido"),
  body("direccion")
    .optional().notEmpty().withMessage("No puede ser vacío")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),
  body("correo_cliente")
    .optional({ values: "falsy" })
    .isEmail().withMessage("Correo inválido")
    .isLength({ max: 254 }).withMessage("Correo demasiado largo"),
  body("fecha_alta")
    .optional({ values: "falsy" })
    .isISO8601().withMessage("Fecha inválida (ISO 8601: YYYY-MM-DD)"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg })) });
    next();
  },
];
