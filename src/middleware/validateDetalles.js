// src/middleware/validateDetalles.js
import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  next();
};

// --- Para EnvioDetalle ---
export const validateEnvioDetalleCreate = [
  body("id_envio").isInt({ min: 1 }).withMessage("ID envío inválido"),
  body("id_producto").isInt({ min: 1 }).withMessage("ID producto inválido"),
  body("cantidad").isInt({ min: 1 }).withMessage("Cantidad debe ser al menos 1"),
  body("renglon").optional().isInt({ min: 1 }).withMessage("Renglón inválido"),
  handleValidationErrors,
];
export const validateEnvioDetalleUpdate = [
  body("id_envio").isInt({ min: 1 }).withMessage("ID envío (PK) obligatorio"),
  body("renglon").isInt({ min: 1 }).withMessage("Renglón (PK) obligatorio"),
  body("id_producto").optional().isInt({ min: 1 }).withMessage("ID producto inválido"),
  body("cantidad").optional().isInt({ min: 1 }).withMessage("Cantidad inválida"),
  handleValidationErrors,
];
export const validateEnvioDetalleDelete = [
  body("id_envio").isInt({ min: 1 }).withMessage("ID envío (PK) obligatorio"),
  body("renglon").isInt({ min: 1 }).withMessage("Renglón (PK) obligatorio"),
  handleValidationErrors,
];

// --- Para Contiene ---
export const validateContieneUpdate = [
  body("id_pedido").isInt({ min: 1 }).withMessage("ID pedido (PK) obligatorio"),
  body("id_producto").isInt({ min: 1 }).withMessage("ID producto (PK) obligatorio"),
  body("cantidad").optional().isInt({ min: 1 }).withMessage("Cantidad inválida"),
  body("precio_unitario").optional().isFloat({ min: 0 }).withMessage("Precio inválido"),
  body("subtotal_linea").optional().isFloat({ min: 0 }).withMessage("Subtotal inválido"),
  handleValidationErrors,
];
export const validateContieneDelete = [
  body("id_pedido").isInt({ min: 1 }).withMessage("ID pedido (PK) obligatorio"),
  body("id_producto").isInt({ min: 1 }).withMessage("ID producto (PK) obligatorio"),
  handleValidationErrors,
];

// --- Para SeUbica ---
export const validateSeUbica = [
  body("id_producto").isInt({ min: 1 }).withMessage("ID producto (PK) inválido"),
  body("nombre").trim().notEmpty().withMessage("Nombre de zona (PK) obligatorio"),
  body("numero").isInt({ min: 0 }).withMessage("Número de zona (PK) inválido"),
  handleValidationErrors,
];

// --- Para Suministra ---
const validateSuministraPK = [
  body("id_suministro").isInt({ min: 1 }).withMessage("ID suministro (PK) obligatorio"),
  body("id_producto").isInt({ min: 1 }).withMessage("ID producto (PK) obligatorio"),
];

export const validateSuministraCreate = [
  ...validateSuministraPK,
  body("cantidad").isInt({ min: 1 }).withMessage("Cantidad debe ser al menos 1"),
  handleValidationErrors,
];

export const validateSuministraUpdate = [
  ...validateSuministraPK,
  body("cantidad")
    .optional()
    .isInt({ min: 1 }).withMessage("Cantidad debe ser al menos 1"),
  handleValidationErrors,
];

export const validateSuministraDelete = [
  ...validateSuministraPK,
  handleValidationErrors,
];