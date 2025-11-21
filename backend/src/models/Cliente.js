// src/models/Cliente.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Cliente = sequelize.define("Cliente", {
  id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre_cliente: { type: DataTypes.STRING(100), allowNull: false },
  telefono: { type: DataTypes.STRING(20), allowNull: false },
  correo_cliente: { type: DataTypes.STRING(254) },
  direccion: { type: DataTypes.STRING(150), allowNull: false },
  fecha_alta: { type: DataTypes.DATEONLY },
}, {
  tableName: "clientes",
  timestamps: false,
});

export default Cliente;
