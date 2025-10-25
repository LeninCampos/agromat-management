// src/models/Suministro.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Suministro = sequelize.define("Suministro", {
  id_suministro: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fecha_llegada: { type: DataTypes.DATEONLY, allowNull: false },
  hora_llegada: { type: DataTypes.TIME, allowNull: false },
  id_proveedor: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: "suministro",
  timestamps: false,
});

export default Suministro;
