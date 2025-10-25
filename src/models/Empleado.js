// src/models/Empleado.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Empleado = sequelize.define("Empleado", {
  id_empleado: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre_empleado: { type: DataTypes.STRING(100), allowNull: false },
  numero_empleado: { type: DataTypes.STRING(50), allowNull: false },
  correo: { type: DataTypes.STRING(254), allowNull: false },
  fecha_alta: { type: DataTypes.DATEONLY, allowNull: false },
}, {
  tableName: "empleados",
  timestamps: false,
});

export default Empleado;
