// backend/src/config/db.js
import { Sequelize } from "sequelize";
import "dotenv/config";

const sequelize = new Sequelize(
  process.env.DB_NAME,
  process.env.DB_USER,
  // Soporta ambas variables para NO romper a nadie
  process.env.DB_PASSWORD || process.env.DB_PASS,
  {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    dialect: "mariadb",
    logging: false
  }
);

export default sequelize;
