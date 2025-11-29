// backend/src/models/Pedido.js
import { DataTypes, Model } from "sequelize";
import sequelize from "../config/db.js";

class Pedido extends Model {}

Pedido.init(
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

    // 👉 Campo nuevo para guardar la dirección específica del pedido
    direccion_envio: {
      type: DataTypes.STRING(255),
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
    tableName: "pedidos", // nombre real de la tabla en la BD
    modelName: "Pedido",
    timestamps: true,
    createdAt: false,
    updatedAt: "updated_at",
  }
);

export default Pedido;
