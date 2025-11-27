import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  next();
};

const statusEnum = ["EN_PREPARACION", "EN_TRANSITO", "ENTREGADO", "CANCELADO"];

export const validateEnvioCreate = [
  body("id_pedido")
    .isInt({ min: 1 }).withMessage("ID de pedido inválido"),
  body("codigo")
    .optional().trim()
    .isLength({ max: 20 }).withMessage("Código max 20 caracteres"),
  body("id_empleado_responsable")
    .optional({ values: "falsy" })
    .isInt({ min: 1 }).withMessage("ID de empleado inválido"),
  body("observaciones")
    .optional()
    .isLength({ max: 255 }).withMessage("Máximo 255 caracteres"),
    
  // HE BORRADO LA VALIDACIÓN DE 'detalles' AQUÍ
    
  handleValidationErrors,
];

export const validateEnvioUpdate = [
  body("status")
    .optional().trim()
    .isIn(statusEnum).withMessage("Status inválido"),
  body("id_empleado_responsable")
    .optional({ values: "falsy" })
    .isInt({ min: 1 }).withMessage("ID de empleado inválido"),
  body("observaciones")
    .optional({ values: "falsy" })
    .isLength({ max: 255 }).withMessage("Máximo 255 caracteres"),
  body("fecha_entrega")
    .optional({ values: "falsy" })
    .isISO8601().withMessage("Fecha de entrega inválida (YYYY-MM-DD)"),
  handleValidationErrors,
];