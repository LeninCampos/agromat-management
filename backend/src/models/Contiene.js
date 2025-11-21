// src/models/Contiene.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Contiene = sequelize.define("Contiene", {
  id_producto: { type: DataTypes.INTEGER, primaryKey: true },
  id_pedido: { type: DataTypes.INTEGER, primaryKey: true },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
  precio_unitario: { type: DataTypes.DECIMAL(10,2) },
  subtotal_linea: { type: DataTypes.DECIMAL(10,2) },
}, {
  tableName: "contiene",
  timestamps: false,
});

export default Contiene;
