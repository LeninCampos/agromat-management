export const esAdmin = (req, res, next) => {
  if (req.empleado.rol !== 'admin') {
    return res.status(403).json({ error: "Acceso denegado. Se requiere rol de administrador." });
  }
  next();
};