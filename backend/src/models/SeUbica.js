// backend/src/models/SeUbica.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const SeUbica = sequelize.define(
  "SeUbica",
  {
    id_producto: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    nombre: {
      type: DataTypes.STRING(100),
      primaryKey: true,
      allowNull: false,
    },
    numero: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    }
  },
  {
    tableName: "seubica",
    timestamps: false,
  }
);

export default SeUbica;
