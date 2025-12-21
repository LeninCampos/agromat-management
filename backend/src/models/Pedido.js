// backend/src/models/Pedido.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Pedido = sequelize.define(
  "Pedido",
  {
    id_pedido: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    fecha_pedido: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    fecha_entrega_estimada: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    hora_pedido: {
      type: DataTypes.TIME,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    id_empleado: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    id_cliente: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    quien_pidio: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    direccion_envio: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    observaciones: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    // ✅ NUEVO: Número de remito
    numero_remito: {
      type: DataTypes.STRING(50),
      allowNull: true,
    },
    subtotal: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    descuento_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    impuesto_total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    total: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
    },
    last_change: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    sequelize,
    tableName: "pedidos",
    timestamps: true,
    createdAt: false,
    updatedAt: "updated_at",
  }
);

export default Pedido;