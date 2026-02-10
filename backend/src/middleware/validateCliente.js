import { body, validationResult } from "express-validator";

const telefonoRegex = /^[0-9+\-\s()]{6,20}$/;

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg })),
    });
  }
  next();
};

// helper: CUIT = 11 dígitos, aceptando que el usuario ponga guiones/espacios
const normalizeDigits = (v) => String(v ?? "").replace(/\D/g, "");

export const validateClienteCreate = [
  body("nombre_cliente")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }),

  body("codigo_cliente")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 50 }).withMessage("Máximo 50 caracteres"),

  body("nombre_contacto")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("cuit")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      const digits = normalizeDigits(value);
      if (digits.length !== 11) throw new Error("CUIT inválido (debe tener 11 dígitos)");
      return true;
    }),

  body("comentarios")
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage("Comentarios inválidos"),

  body("telefono")
    .optional({ nullable: true, checkFalsy: true })
    .matches(telefonoRegex).withMessage("Teléfono inválido"),

  body("fax")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("direccion")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 150 }),

  body("codigo_postal")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("localidad")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("zona")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("provincia")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),

  body("correo_cliente")
    .optional({ nullable: true, checkFalsy: true })
    .isEmail().withMessage("Correo inválido"),

  handleValidationErrors,
];

export const validateClienteUpdate = [
  body("nombre_cliente")
    .optional({ nullable: true })
    .notEmpty()
    .isLength({ max: 100 }),

  body("codigo_cliente")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 50 }),

  body("nombre_contacto")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }),

  body("cuit")
    .optional({ nullable: true, checkFalsy: true })
    .custom((value) => {
      const digits = normalizeDigits(value);
      if (digits.length !== 11) throw new Error("CUIT inválido (debe tener 11 dígitos)");
      return true;
    }),

  body("comentarios")
    .optional({ nullable: true, checkFalsy: true })
    .isString().withMessage("Comentarios inválidos"),

  body("telefono")
    .optional({ nullable: true, checkFalsy: true })
    .matches(telefonoRegex),

  body("fax")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 20 }),

  body("direccion")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 150 }),

  body("codigo_postal")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 20 }),

  body("localidad")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }),

  body("zona")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }),

  body("provincia")
    .optional({ nullable: true, checkFalsy: true })
    .isLength({ max: 100 }),

  body("correo_cliente")
    .optional({ nullable: true, checkFalsy: true })
    .isEmail(),

  handleValidationErrors,
];
