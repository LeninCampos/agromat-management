// src/models/Proveedor.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Proveedor = sequelize.define("Proveedor", {
  id_proveedor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre_proveedor: { type: DataTypes.STRING(100), allowNull: false },
  telefono: { type: DataTypes.STRING(20), allowNull: false },
  correo: { type: DataTypes.STRING(254) },
  direccion: { type: DataTypes.STRING(150), allowNull: false },
}, {
  tableName: "proveedor",
  timestamps: false,
});

export default Proveedor;
