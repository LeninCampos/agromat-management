// src/models/Zona.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Zona = sequelize.define("Zona", {
  nombre: { type: DataTypes.STRING(100), primaryKey: true },
  numero: { type: DataTypes.INTEGER, primaryKey: true },
  descripcion: { type: DataTypes.STRING(255) },
}, {
  tableName: "zonas",
  timestamps: false,
});

export default Zona;
