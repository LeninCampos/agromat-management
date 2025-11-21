// src/models/Pedido.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Pedido = sequelize.define("Pedido", {
  id_pedido: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fecha_pedido: { type: DataTypes.DATEONLY, allowNull: false },
  hora_pedido: { type: DataTypes.TIME, allowNull: false },
  status: { type: DataTypes.STRING(100), allowNull: false },
  subtotal: { type: DataTypes.DECIMAL(10,2) },
  descuento_total: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  impuesto_total: { type: DataTypes.DECIMAL(10,2), allowNull: false, defaultValue: 0 },
  total: { type: DataTypes.DECIMAL(10,2) },
  id_empleado: { type: DataTypes.INTEGER, allowNull: false },
  id_cliente: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: "pedidos",
  timestamps: false,
});

export default Pedido;
