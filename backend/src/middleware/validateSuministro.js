// src/middleware/validateSuministro.js
import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  next();
};

export const validateSuministroCreate = [
  body("fecha_llegada")
    .notEmpty().withMessage("Fecha de llegada obligatoria").bail()
    .isISO8601().withMessage("Fecha inválida (YYYY-MM-DD)"),
  body("hora_llegada")
    .notEmpty().withMessage("Hora de llegada obligatoria").bail()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage("Hora inválida (HH:MM)"),
  body("id_proveedor")
    .isInt({ min: 1 }).withMessage("ID de proveedor inválido"),
  handleValidationErrors,
];

export const validateSuministroUpdate = [
  body("fecha_llegada")
    .optional().notEmpty().withMessage("No puede ser vacío").bail()
    .isISO8601().withMessage("Fecha inválida (YYYY-MM-DD)"),
  body("hora_llegada")
    .optional().notEmpty().withMessage("No puede ser vacío").bail()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage("Hora inválida (HH:MM)"),
  body("id_proveedor")
    .optional()
    .isInt({ min: 1 }).withMessage("ID de proveedor inválido"),
  handleValidationErrors,
];