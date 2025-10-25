// src/models/EnvioDetalle.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const EnvioDetalle = sequelize.define("EnvioDetalle", {
  id_envio: { type: DataTypes.INTEGER, primaryKey: true },
  renglon: { type: DataTypes.INTEGER, primaryKey: true },
  id_producto: { type: DataTypes.INTEGER, allowNull: false },
  cantidad: { type: DataTypes.INTEGER, allowNull: false },
}, {
  tableName: "envio_detalle",
  timestamps: false,
});

export default EnvioDetalle;
