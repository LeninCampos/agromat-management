// src/models/Producto.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Producto = sequelize.define("Producto", {
  id_producto: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre_producto: { type: DataTypes.STRING(100), allowNull: false },
  descripcion: { type: DataTypes.STRING(255) },
  id_proveedor: { type: DataTypes.INTEGER, allowNull: false },
  precio: { type: DataTypes.DECIMAL(10,2), allowNull: false },
  stock: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
}, {
  tableName: "productos",
  timestamps: false,
});

export default Producto;
