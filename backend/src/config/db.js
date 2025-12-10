// backend/src/config/db.js
import { Sequelize } from "sequelize";
import "dotenv/config";

// 1. Cargar variables
const {
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  DB_PASS,
  DB_HOST = "127.0.0.1",
  DB_PORT = 3306,
  NODE_ENV
} = process.env;

const password = DB_PASSWORD || DB_PASS;

// 2. VALIDACIÓN DE SEGURIDAD (Fail Fast)
// Si falta algo crítico, detenemos la app aquí mismo.
if (!DB_NAME || !DB_USER || !password) {
  console.error("❌ ERROR FATAL: Faltan variables de entorno para la Base de Datos.");
  console.error("Revisar: DB_NAME, DB_USER y DB_PASSWORD en el archivo .env");
  process.exit(1); // Cierra la aplicación con código de error
}

// 3. Log condicional (Solo en desarrollo)
// En producción, el silencio es seguridad.
if (NODE_ENV !== 'production') {
  console.log("[DB] Intentando conectar con:", {
    db: DB_NAME,
    user: DB_USER,
    host: DB_HOST,
    port: DB_PORT,
    ssl: NODE_ENV === 'production' // Solo informativo
  });
}

const sequelize = new Sequelize(DB_NAME, DB_USER, password, {
  host: DB_HOST,
  port: Number(DB_PORT),
  dialect: "mariadb",
  logging: false, // Mantener en false para no saturar la consola con queries
  
  // Opcional: Configuración para producción (Pool y SSL)
  pool: {
    max: 10,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  dialectOptions: {
    // Si en el futuro usas una DB en la nube que requiera SSL, descomenta esto:
    // ssl: {
    //   require: true,
    //   rejectUnauthorized: false 
    // }
  }
});

export default sequelize;