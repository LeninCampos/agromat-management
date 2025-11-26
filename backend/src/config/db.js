// backend/src/config/db.js
import { Sequelize } from "sequelize";
import "dotenv/config";

const DB_NAME = process.env.DB_NAME;
const DB_USER = process.env.DB_USER;
const DB_PASSWORD = process.env.DB_PASSWORD || process.env.DB_PASS || "";
const DB_HOST = process.env.DB_HOST || "127.0.0.1";
const DB_PORT = Number(process.env.DB_PORT || 3306);

// Solo para debug
console.log("[DB] Conectando a:", {
  DB_NAME,
  DB_USER,
  DB_HOST,
  DB_PORT,
  HAS_PASSWORD: !!DB_PASSWORD,
});

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST,
  port: DB_PORT,
  dialect: "mariadb",
  logging: false,
});

export default sequelize;
