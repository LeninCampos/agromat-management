import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Proveedor = sequelize.define("Proveedor", {
  id_proveedor: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre_proveedor: { type: DataTypes.STRING(100), allowNull: false },
  
  nombre_contacto: { type: DataTypes.STRING(100), allowNull: true },
  cuit: { type: DataTypes.STRING(20), allowNull: true },
  comentarios: { type: DataTypes.TEXT, allowNull: true },

  telefono: { type: DataTypes.STRING(20), allowNull: true }, 
  correo: { type: DataTypes.STRING(254) },
  direccion: { type: DataTypes.STRING(150), allowNull: true },
}, {
  tableName: "proveedor",
  timestamps: false,
});

export default Proveedor;