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

    // ✅ NUEVO: Número de remito (copiado del pedido)
    numero_remito: {
      type: DataTypes.STRING(50),
      allowNull: true,
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

    // Mantenemos por compatibilidad pero usaremos la tabla fotos_envio
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