// src/models/Suministra.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Suministra = sequelize.define("Suministra", {
  id_suministro: { type: DataTypes.INTEGER, primaryKey: true },
  id_producto: { type: DataTypes.STRING(50), primaryKey: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: "suministra",
  timestamps: false,
});

export default Suministra;
