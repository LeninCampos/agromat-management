import { body, validationResult } from "express-validator";

export const ValidateProducto = [
    body("nombre_producto").notEmpty().withMessage("El nombre es obligatorio"),
    body("id_proveedor").isInt({ min: 1 }).withMessage("Debe tener proveedor válido"),
    body("precio").notEmpty().withMessage("campo obligatorio").bail()
        .isFloat({ min: 0 }).withMessage("Valor invalido."),
    body("stock").notEmpty().withMessage("campo obligatorio").bail()
        .isInt({ min: 0 }).withMessage("Valor invalido."),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        next();
    },
];