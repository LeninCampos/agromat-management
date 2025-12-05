import { body, validationResult } from "express-validator";

const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty())
    return res.status(400).json({
      errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
    });
  next();
};

const commonValidations = [
  body("nombre_proveedor")
    .trim().notEmpty().withMessage("El nombre es obligatorio")
    .isLength({ max: 100 }).withMessage("Máximo 100 caracteres"),
  
  body("telefono")
    .optional().trim()
    .isLength({ max: 20 }).withMessage("Máximo 20 caracteres"),

  body("cuit")
    .optional({ values: "falsy" }).trim()
    .matches(/^[0-9\-]+$/).withMessage("El CUIT solo debe contener números y guiones"),

  body("nombre_contacto")
    .optional().isLength({ max: 100 }),
  
  body("comentarios")
    .optional().isLength({ max: 500 }),

  body("correo")
    .optional({ values: "falsy" }).trim().isEmail().withMessage("Correo inválido"),
    
  handleValidationErrors,
];

export const validateProveedorCreate = commonValidations;
export const validateProveedorUpdate = commonValidations;