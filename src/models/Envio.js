// src/models/Envio.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Envio = sequelize.define("Envio", {
  id_envio: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  codigo: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  id_pedido: { type: DataTypes.INTEGER, allowNull: false },
  id_empleado_responsable: { type: DataTypes.INTEGER },
  status: {
    type: DataTypes.ENUM("EN_PREPARACION","EN_TRANSITO","ENTREGADO","CANCELADO"),
    allowNull: false,
    defaultValue: "EN_PREPARACION",
  },
  fecha_creacion: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
  fecha_entrega: { type: DataTypes.DATE },
  observaciones: { type: DataTypes.STRING(255) },
  url_imagen: { type: DataTypes.STRING, allowNull: true }
}, {
  tableName: "envios",
  timestamps: false,
});

export default Envio;
