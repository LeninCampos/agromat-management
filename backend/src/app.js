// src/app.js
import "dotenv/config";
import express from "express";
import cors from "cors";

import rateLimit from "express-rate-limit";

import { QueryTypes } from "sequelize";
import sequelize from "./config/db.js";   // única conexión
import "./models/index.js";               // carga asociaciones

// Rutas
import productosRouter from "./routes/productos.js";
import clientesRouter from "./routes/clientes.js";
import pedidosRouter from "./routes/pedidos.js";
import enviosRouter from "./routes/envios.js";
import proveedoresRouter from "./routes/proveedores.js";
import empleadosRouter from "./routes/empleados.js";
import zonasRouter from "./routes/zonas.js";
import seubicaRouter from "./routes/seubica.js";
import suministroRouter from "./routes/suministro.js";
import suministraRouter from "./routes/suministra.js";
import contieneRouter from "./routes/contiene.js";
import authRouter from "./routes/auth.js";
import uploadRouter from "./routes/upload.js"; // 👈 NUEVO
import auditRouter from "./routes/audit.js";




const app = express();
app.set("trust proxy", 1);

/* ==========================
   🔐 CORS CONFIG
   ========================== */

// Permitimos tu FRONT local + lo que venga en FRONTEND_URL
const whiteList = [process.env.FRONTEND_URL];

app.use(
  cors({
    origin: function (origin, callback) {
      // (!origin) permite peticiones sin origen (como Postman o scripts de servidor a servidor)
      if (!origin || whiteList.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`CORS Error: El origen ${origin} no está autorizado`));
      }
    },
    credentials: true, // Importante si en el futuro usas cookies o sesiones seguras
  })
);

app.use(express.static("public"));
app.use(express.json());

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 300, // Máximo de peticiones por IP por ventana
  standardHeaders: true, // Devuelve info en los headers `RateLimit-*`
  legacyHeaders: false, // Deshabilita los headers `X-RateLimit-*`
  message: { error: "Demasiadas peticiones, por favor intenta más tarde." }
});

// 2. Limiter Estricto: Solo para Auth (Login/Registro)
// Evita fuerza bruta para adivinar contraseñas
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // Solo 10 intentos por IP cada 15 min
  message: { error: "Demasiados intentos de inicio de sesión, cuenta bloqueada temporalmente por seguridad." }
});

app.use("/api/", apiLimiter);
app.use("/api/auth", authLimiter);

/* ==========================
   🩺 Healthcheck
   ========================== */

app.get("/api/health", (req, res) => {
  res.json({
    ok: true,
    service: "agromat-backend",
    db: sequelize.getDatabaseName(),
    time: new Date().toISOString(),
  });
});

/* ==========================
   🚏 Rutas API
   ========================== */

app.use("/api/auth", authRouter);
app.use("/api/productos", productosRouter);
app.use("/api/clientes", clientesRouter);
app.use("/api/pedidos", pedidosRouter);
app.use("/api/envios", enviosRouter);
app.use("/api/proveedores", proveedoresRouter);
app.use("/api/empleados", empleadosRouter);
app.use("/api/zonas", zonasRouter);
app.use("/api/seubica", seubicaRouter);
app.use("/api/suministro", suministroRouter);
app.use("/api/suministra", suministraRouter);
app.use("/api/contiene", contieneRouter);
app.use("/api/upload", uploadRouter);
app.use("/api/audit", auditRouter);


/* ==========================
   404 y manejo de errores
   ========================== */

app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Error interno del servidor",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

/* ==========================
   🚀 Arranque del servidor
   ========================== */

const PORT = process.env.PORT || 4000;

(async () => {
  try {
    await sequelize.authenticate();
    console.log("Conectado a MariaDB");

    // Asegurar que la tabla ajustes_stock existe
    await sequelize.query(`
      CREATE TABLE IF NOT EXISTS ajustes_stock (
        id_ajuste    INT AUTO_INCREMENT PRIMARY KEY,
        id_producto  VARCHAR(255) NOT NULL,
        fecha        DATE NOT NULL,
        hora         TIME,
        cantidad     DECIMAL(14,2) NOT NULL DEFAULT 0,
        motivo       VARCHAR(500),
        created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log("Tabla ajustes_stock verificada");

    // Reconciliación automática: cerrar discrepancias existentes (solo la primera vez).
    // Envuelta en su propio try/catch para que un fallo NO impida arrancar el servidor.
    // Toda la reconciliación va en una transacción: o se aplica completa, o nada.
    try {
      const [countRow] = await sequelize.query(
        `SELECT COUNT(*) AS total FROM ajustes_stock WHERE motivo LIKE 'Reconciliación inicial%'`,
        { type: QueryTypes.SELECT }
      );

      if (Number(countRow?.total || 0) === 0) {
        console.log("Ejecutando reconciliación inicial de stock...");
        const tReconcile = await sequelize.transaction();
        try {
          const productos = await sequelize.query(
            `SELECT id_producto, stock FROM productos`,
            { type: QueryTypes.SELECT, transaction: tReconcile }
          );

          let ajustados = 0;
          for (const prod of productos) {
            const id = prod.id_producto;
            const stockActual = Number(prod.stock ?? 0);

            const [entRow] = await sequelize.query(
              `SELECT COALESCE(SUM(sm.cantidad), 0) AS total FROM suministra sm INNER JOIN suministro su ON su.id_suministro = sm.id_suministro WHERE sm.id_producto = ?`,
              { replacements: [id], type: QueryTypes.SELECT, transaction: tReconcile }
            );
            const [salRow] = await sequelize.query(
              `SELECT COALESCE(SUM(c.cantidad), 0) AS total FROM contiene c INNER JOIN pedidos p ON p.id_pedido = c.id_pedido WHERE c.id_producto = ?`,
              { replacements: [id], type: QueryTypes.SELECT, transaction: tReconcile }
            );
            const [ajuRow] = await sequelize.query(
              `SELECT COALESCE(SUM(a.cantidad), 0) AS total FROM ajustes_stock a WHERE a.id_producto = ?`,
              { replacements: [id], type: QueryTypes.SELECT, transaction: tReconcile }
            );

            const stockTeorico = Number(entRow?.total || 0) - Number(salRow?.total || 0) + Number(ajuRow?.total || 0);
            const delta = stockActual - stockTeorico;

            if (delta !== 0) {
              await sequelize.query(
                `INSERT INTO ajustes_stock (id_producto, fecha, hora, cantidad, motivo) VALUES (?, CURDATE(), CURTIME(), ?, ?)`,
                {
                  replacements: [id, delta, "Reconciliación inicial — ajuste automático para igualar stock con historial"],
                  transaction: tReconcile,
                }
              );
              ajustados++;
            }
          }

          await tReconcile.commit();
          console.log(`Reconciliación completada: ${ajustados} productos ajustados de ${productos.length} totales`);
        } catch (errReconcile) {
          await tReconcile.rollback();
          throw errReconcile;
        }
      }
    } catch (errReconcile) {
      console.error("Reconciliación inicial falló (el servidor arrancará igualmente):", errReconcile.message);
      console.error("Podés ejecutarla manualmente con POST /api/productos/reconciliar-stock");
    }

    app.listen(PORT, () => {
      console.log(`Servidor escuchando en http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
})();

/* ==========================
   📴 Apagado elegante
   ========================== */

process.on("SIGINT", async () => {
  console.log("\nCerrando conexión...");
  await sequelize.close();
  console.log("Conexión cerrada. Bye!");
  process.exit(0);
});
