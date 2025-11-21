// src/app.js
import "dotenv/config";
import express from "express";
import cors from "cors";

import sequelize from "./config/db.js";   // ✅ única import de la conexión
import "./models/index.js";               // ✅ carga asociaciones, sin traer 'sequelize'

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
import envioDetalleRouter from "./routes/envio_detalle.js";
import contieneRouter from "./routes/contiene.js";
import authRouter from "./routes/auth.js";


const app = express();

// Descomentar bloque y eliminar app.use(cors()); cuando se tenga url frontend
const whiteList = [process.env.FRONTEND_URL];
const corsOptions = {
  origin: function (origin, callback) {
    // origin es 'undefined' en peticiones de la misma máquina (ej. Postman)
    if (whiteList.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error("No permitido por CORS"));
    }
  }
};
app.use(cors(corsOptions));

app.use(express.static('public'));

app.use(express.json());

// Healthcheck mejorado
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "agromath-backend",
    db: sequelize.getDatabaseName(),
    time: new Date().toISOString(),
  });
});

// Montaje de rutas
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
app.use("/api/envio-detalle", envioDetalleRouter);
app.use("/api/contiene", contieneRouter);

// 404 para rutas no encontradas
app.use((req, res) => res.status(404).json({ error: "Ruta no encontrada" }));

// Manejo de errores centralizado
app.use((err, req, res, next) => {
  console.error("❌ Error:", err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || "Error interno del servidor",
    details: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
});

// Arranque
const PORT = process.env.PORT || 4000;

(async () => {
  try {
    // Conexión a MariaDB
    await sequelize.authenticate();
    console.log("✅ Conectado a MariaDB");

    // Si solo consumís tablas ya existentes, dejá sync en falso o sin alter.
    // Si querés que Sequelize cree/ajuste tablas (con cuidado):
    // await sequelize.sync({ alter: false });

    app.listen(PORT, () => {
      console.log(`🚀 Servidor escuchando en http://localhost:${PORT}`);
    });

    // Opcional: logs cortos de inventario al iniciar
    // const countProd = await Producto.count();
    // console.log(`📦 Productos cargados: ${countProd}`);

  } catch (error) {
    console.error("❌ No se pudo iniciar el servidor:", error);
    process.exit(1);
  }
})();

// Apagado elegante
process.on("SIGINT", async () => {
  console.log("\n⏳ Cerrando conexión...");
  await sequelize.close();
  console.log("👋 Conexión cerrada. Bye!");
  process.exit(0);
});