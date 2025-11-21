import { body, validationResult } from "express-validator";

export const validateLogin = [
  body("correo")
    .trim()
    .notEmpty().withMessage("El correo es obligatorio").bail()
    .isEmail().withMessage("Correo inválido"),
  body("password")
    .notEmpty().withMessage("La contraseña es obligatoria"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({
        errors: errors.array().map(e => ({ campo: e.path, mensaje: e.msg }))
      });
    next();
  },
];