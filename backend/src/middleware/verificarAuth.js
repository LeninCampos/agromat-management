import jwt from "jsonwebtoken";

export const verificarAuth = (req, res, next) => {
  // 1. Obtener el token del header
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: "No se proveyó un token" });
  }

  // 2. "Bearer TOKEN_AQUI" -> "TOKEN_AQUI"
  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ error: "Formato de token inválido" });
  }

  // 3. Verificar el token
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    
    // 4. Adjuntamos el payload (info del empleado) al request
    // para que las siguientes funciones lo puedan usar
    req.empleado = payload;
    
    next(); 
  } catch (err) {
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: "Token inválido" });
    }
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: "Token expirado" });
    }
    next(err);
  }
};