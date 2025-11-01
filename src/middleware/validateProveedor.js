// src/middleware/validateProveedor.js
import { body, validationResult } from "express-validator";

const telefonoRegex = /^[0-9+\-\s()]{6,20}$/;

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  next();
};

export const validateProveedorCreate = [
  body("nombre_proveedor")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  body("telefono")
    .trim()
    .notEmpty().withMessage("El teléfono es obligatorio")
    .matches(telefonoRegex).withMessage("Teléfono inválido"),
  body("direccion")
    .trim()
    .notEmpty().withMessage("La dirección es obligatoria")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),
  body("correo")
    .optional({ values: "falsy" }).trim()
    .isEmail().withMessage("Correo inválido")
    .isLength({ max: 254 }).withMessage("Correo demasiado largo"),
  handleValidationErrors,
];

export const validateProveedorUpdate = [
  body("nombre_proveedor")
    .optional().trim().notEmpty().withMessage("No puede ser vacío")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  body("telefono")
    .optional().trim().notEmpty().withMessage("No puede ser vacío")
    .matches(telefonoRegex).withMessage("Teléfono inválido"),
  body("direccion")
    .optional().trim().notEmpty().withMessage("No puede ser vacío")
    .isLength({ max: 150 }).withMessage("Máximo 150 caracteres"),
  body("correo")
    .optional({ values: "falsy" }).trim()
    .isEmail().withMessage("Correo inválido")
    .isLength({ max: 254 }).withMessage("Correo demasiado largo"),
  handleValidationErrors,
];