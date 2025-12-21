// backend/src/models/FotoEnvio.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const FotoEnvio = sequelize.define(
  "FotoEnvio",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    id_envio: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
    },

    nombre_archivo: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },

    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "fotos_envio",
    timestamps: false,
  }
);

export default FotoEnvio;