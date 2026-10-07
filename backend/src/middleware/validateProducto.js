// src/middleware/validateProducto.js
import { body, validationResult } from "express-validator";

// Middleware genérico de manejo de errores (para reusar)
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    // 👀 Útil para depurar si vuelve a pasar algo
    console.log("Errores de validación Producto:", errors.array());

    return res.status(400).json({
      errors: errors.array().map((e) => ({
        campo: e.path,
        mensaje: e.msg,
      })),
    });
  }

  next();
};

export const validateProductoCreate = [
  body("id_producto")
    .trim()
    .notEmpty()
    .withMessage("El código de barras/ID es obligatorio")
    .isLength({ max: 50 })
    .withMessage("Máximo 50 caracteres"),
  body("nombre_producto")
    .trim()
    .notEmpty()
    .withMessage("El nombre es obligatorio")
    .isLength({ max: 100 })
    .withMessage("Máximo 100 caracteres"),
  body("id_proveedor")
    .isInt({ min: 1 })
    .withMessage("Debe ser un ID de proveedor válido"),
  body("precio")
    .notEmpty()
    .withMessage("El precio es obligatorio")
    .bail()
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número positivo"),
  body("moneda")
    .optional()
    .isIn(["EUR", "USD"])
    .withMessage("La moneda debe ser EUR o USD"),
  body("stock")
    .notEmpty()
    .withMessage("El stock es obligatorio")
    .bail()
    .isInt({ min: 0 })
    .withMessage("El stock debe ser un entero positivo"),
  body("descripcion")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Máximo 255 caracteres"),
  // 🔥 NUEVO: imagen_url ultra flexible (opcional, cualquier string)
  body("imagen_url")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("La URL de la imagen debe ser texto"),
  handleValidationErrors,
];

export const validateProductoUpdate = [
  body("nombre_producto")
    .optional()
    .trim()
    .notEmpty()
    .withMessage("No puede ser vacío")
    .isLength({ max: 100 })
    .withMessage("Máximo 100 caracteres"),
  body("id_proveedor")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Debe ser un ID de proveedor válido"),
  body("precio")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("El precio debe ser un número positivo"),
  body("moneda")
    .optional()
    .isIn(["EUR", "USD"])
    .withMessage("La moneda debe ser EUR o USD"),
  body("stock")
    .optional()
    .isInt({ min: 0 })
    .withMessage("El stock debe ser un entero positivo"),
  body("descripcion")
    .optional()
    .isLength({ max: 255 })
    .withMessage("Máximo 255 caracteres"),
  // 🔥 Igual aquí, súper permisivo
  body("imagen_url")
    .optional({ nullable: true, checkFalsy: true })
    .isString()
    .withMessage("La URL de la imagen debe ser texto"),
  handleValidationErrors,
];
