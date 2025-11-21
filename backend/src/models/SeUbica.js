// src/models/SeUbica.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SeUbica = sequelize.define("SeUbica", {
  id_producto: { type: DataTypes.INTEGER, primaryKey: true },
  nombre: { type: DataTypes.STRING(100), primaryKey: true },
  numero: { type: DataTypes.INTEGER, primaryKey: true },
}, {
  tableName: "seubica",
  timestamps: false,
});

export default SeUbica;
