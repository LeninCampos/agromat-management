import { body, validationResult } from "express-validator";

// Acepta dígitos, espacios, +, -, paréntesis. 6 a 20 chars tras limpiar.
const phoneVisibleRegex = /^[0-9+\-\s()]{6,20}$/;

const phoneToE164ish = (value) => {
  if (typeof value !== "string") return value;
  let v = value.trim();
  v = v.replace(/^\+\+/, "+");
  v = v.replace(/\s+/g, " ");
  return v;
};

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  next();
};

export const validateEmpleadoCreate = [
  body("nombre_empleado")
    .trim()
    .notEmpty().withMessage("El nombre es obligatorio").bail()
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("numero_empleado")
    .notEmpty().withMessage("El teléfono es obligatorio").bail()
    .customSanitizer(phoneToE164ish)
    .matches(phoneVisibleRegex).withMessage("Teléfono inválido"),

  body("correo")
    .trim()
    .notEmpty().withMessage("El correo es obligatorio").bail()
    .isEmail().withMessage("Correo inválido")
    .isLength({ max: 254 }).withMessage("Correo demasiado largo"),

  body("fecha_alta")
    .notEmpty().withMessage("La fecha de alta es obligatoria").bail()
    .isISO8601().withMessage("Fecha inválida (YYYY-MM-DD)"),

  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria").bail()
    .isLength({ min: 6 }).withMessage("La contraseña debe tener al menos 6 caracteres"),

  body("rol")
    .optional()
    .isIn(["admin", "empleado"]).withMessage("Rol inválido"),
  
  handleValidationErrors, 
];

export const validateEmpleadoUpdate = [
  body("nombre_empleado")
    .optional().trim().notEmpty().withMessage("No puede ser vacío")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("numero_empleado")
    .optional()
    .customSanitizer(phoneToE164ish)
    .matches(phoneVisibleRegex).withMessage("Teléfono inválido"),

  body("correo")
    .optional().trim().notEmpty().withMessage("No puede ser vacío")
    .isEmail().withMessage("Correo inválido")
    .isLength({ max: 254 }).withMessage("Correo demasiado largo"),

  body("fecha_alta")
    .optional().notEmpty().withMessage("No puede ser vacío")
    .isISO8601().withMessage("Fecha inválida (YYYY-MM-DD)"),
  
  body("rol")
    .optional()
    .isIn(["admin", "empleado"]).withMessage("Rol inválido"),
  handleValidationErrors, 
];