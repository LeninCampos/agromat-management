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
    id_zona: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },
  },
  {
    tableName: "seubica",
    timestamps: false,
  }
);

export default SeUbica;
