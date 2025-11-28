// backend/src/models/Zona.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Zona = sequelize.define(
  "Zona",
  {
    id_zona: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    codigo: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    rack: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    modulo: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    piso: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
  },
  {
    tableName: "zonas",
    timestamps: false,
  }
);

export default Zona;
