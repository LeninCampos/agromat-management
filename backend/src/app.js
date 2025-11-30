// src/app.js
import "dotenv/config";
import express from "express";
import cors from "cors";

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




const app = express();

/* ==========================
   🔐 CORS CONFIG
   ========================== */

// Permitimos tu FRONT local + lo que venga en FRONTEND_URL
const whiteList = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

const corsOptions = {
  origin(origin, callback) {
    // origin === undefined cuando es misma máquina (Postman, curl, etc.)
    if (!origin || whiteList.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  },
  credentials: true,
};

app.use(cors(corsOptions));
app.use(express.static("public"));
app.use(express.json());

/* ==========================
   🩺 Healthcheck
   ========================== */

app.get("/health", (req, res) => {
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
