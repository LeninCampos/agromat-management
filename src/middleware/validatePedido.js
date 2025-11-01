// src/middleware/validatePedido.js
import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  next();
};

const camposComunes = [
  body("fecha_pedido")
    .notEmpty().withMessage("Fecha de pedido obligatoria").bail()
    .isISO8601().withMessage("Fecha inválida (YYYY-MM-DD)"),
  body("hora_pedido")
    .notEmpty().withMessage("Hora de pedido obligatoria").bail()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage("Hora inválida (HH:MM)"),
  body("status")
    .trim()
    .notEmpty().withMessage("El status es obligatorio")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  body("id_empleado")
    .isInt({ min: 1 }).withMessage("ID de empleado inválido"),
  body("id_cliente")
    .isInt({ min: 1 }).withMessage("ID de cliente inválido"),
  body("descuento_total")
    .optional()
    .isFloat({ min: 0 }).withMessage("Descuento debe ser número positivo"),
  body("impuesto_total")
    .optional()
    .isFloat({ min: 0 }).withMessage("Impuesto debe ser número positivo"),
];

const camposComunesUpdate = [
  body("fecha_pedido")
    .optional().notEmpty().withMessage("No puede ser vacío").bail()
    .isISO8601().withMessage("Fecha inválida (YYYY-MM-DD)"),
  body("hora_pedido")
    .optional().notEmpty().withMessage("No puede ser vacío").bail()
    .matches(/^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/).withMessage("Hora inválida (HH:MM)"),
  body("status")
    .optional().trim().notEmpty().withMessage("No puede ser vacío")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  body("id_empleado")
    .optional()
    .isInt({ min: 1 }).withMessage("ID de empleado inválido"),
  body("id_cliente")
    .optional()
    .isInt({ min: 1 }).withMessage("ID de cliente inválido"),
  body("descuento_total")
    .optional()
    .isFloat({ min: 0 }).withMessage("Descuento debe ser número positivo"),
  body("impuesto_total")
    .optional()
    .isFloat({ min: 0 }).withMessage("Impuesto debe ser número positivo"),
];

export const validatePedidoCreate = [
  ...camposComunes,
  body("items")
    .notEmpty().withMessage("Debe incluir al menos un item").bail()
    .isArray({ min: 1 }).withMessage("Items debe ser un arreglo con al menos 1 producto"),
  body("items.*.id_producto")
    .isInt({ min: 1 }).withMessage("ID de producto en items inválido"),
  body("items.*.cantidad")
    .isInt({ min: 1 }).withMessage("Cantidad en items inválida"),
  body("items.*.precio_unitario")
    .isFloat({ min: 0 }).withMessage("Precio unitario en items inválido"),
  handleValidationErrors,
];

export const validatePedidoUpdate = [
  ...camposComunesUpdate,
  handleValidationErrors,
];

export const validatePedidoItems = [
  body("id_producto")
    .isInt({ min: 1 }).withMessage("ID de producto inválido"),
  body("cantidad")
    .notEmpty().withMessage("Cantidad obligatoria").bail()
    .isInt({ min: 1 }).withMessage("Cantidad debe ser al menos 1"),
  body("precio_unitario")
    .notEmpty().withMessage("Precio unitario obligatorio").bail()
    .isFloat({ min: 0 }).withMessage("Precio debe ser número positivo"),
  handleValidationErrors,
];