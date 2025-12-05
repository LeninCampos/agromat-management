import { body, validationResult } from "express-validator";

const telefonoRegex = /^[0-9+\-\s()]{6,20}$/;

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({ errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg })) });
  next();
};

export const validateClienteCreate = [
  body("nombre_cliente").notEmpty().withMessage("Nombre obligatorio").isLength({ max: 100 }),
  body("nombre_contacto").optional().isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  body("comentarios").optional().isString(),
  
  body("telefono").notEmpty().withMessage("Teléfono obligatorio").matches(telefonoRegex),
  body("direccion").notEmpty().withMessage("Dirección obligatoria").isLength({ max: 150 }),
  body("correo_cliente").optional({ checkFalsy: true }).isEmail().withMessage("Correo inválido"),
  handleValidationErrors,
];

export const validateClienteUpdate = [
  body("nombre_cliente").optional().notEmpty().isLength({ max: 100 }),
  body("nombre_contacto").optional().isLength({ max: 100 }),
  body("comentarios").optional().isString(),
  body("telefono").optional().notEmpty().matches(telefonoRegex),
  body("direccion").optional().notEmpty().isLength({ max: 150 }),
  body("correo_cliente").optional({ checkFalsy: true }).isEmail(),
  handleValidationErrors,
];