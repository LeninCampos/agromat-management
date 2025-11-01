// src/middleware/validateZona.js
import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  next();
};

export const validateZonaCreate = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  body("numero")
    .notEmpty().withMessage("El número es obligatorio").bail()
    .isInt({ min: 0 }).withMessage("Número debe ser entero positivo"),
  body("descripcion")
    .optional()
    .isLength({ max: 255 }).withMessage("Máximo 255 caracteres"),
  handleValidationErrors,
];

// Para PUT y DELETE que usan PK en el body
const validateZonaPK = [
  body("nombre")
    .trim()
    .notEmpty().withMessage("El nombre (PK) es obligatorio"),
  body("numero")
    .notEmpty().withMessage("El número (PK) es obligatorio").bail()
    .isInt({ min: 0 }),
];

export const validateZonaUpdate = [
  ...validateZonaPK, // Valida la PK
  body("descripcion") // Valida el campo a actualizar
    .optional()
    .isLength({ max: 255 }).withMessage("Máximo 255 caracteres"),
  handleValidationErrors,
];

export const validateZonaDelete = [
  ...validateZonaPK, // Solo valida la PK
  handleValidationErrors,
];