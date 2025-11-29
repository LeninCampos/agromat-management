// backend/src/models/Envio.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Envio = sequelize.define(
  "Envio",
  {
    id_envio: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    codigo: {
      type: DataTypes.STRING(20),
      allowNull: false,
      unique: true,
    },

    id_pedido: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    id_empleado_responsable: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    status: {
      type: DataTypes.ENUM(
        "EN_PREPARACION",
        "EN_TRANSITO",
        "ENTREGADO",
        "CANCELADO"
      ),
      allowNull: false,
      defaultValue: "EN_PREPARACION",
    },

    // 🚚 Nuevos campos de conductor
    nombre_conductor: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },

    telefono_conductor: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    placa_vehiculo: {
      type: DataTypes.STRING(20),
      allowNull: true,
    },

    // Texto libre desde el modal
    observaciones: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    fecha_creacion: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

    fecha_entrega: {
      type: DataTypes.DATE,
      allowNull: true,
    },

    url_imagen: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "envios",
    timestamps: false,
  }
);

export default Envio;
