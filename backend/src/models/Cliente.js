import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Cliente = sequelize.define("Cliente", {
  id_cliente: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },

  codigo_cliente: { type: DataTypes.STRING(50), allowNull: true, unique: true },

  nombre_cliente: { type: DataTypes.STRING(100), allowNull: true },

  nombre_contacto: { type: DataTypes.STRING(100), allowNull: true },

  cuit: { type: DataTypes.STRING(20), allowNull: true, unique: true },

  telefono: { type: DataTypes.STRING(20), allowNull: true },
  fax: { type: DataTypes.STRING(20), allowNull: true },
  correo_cliente: { type: DataTypes.STRING(254) },
  direccion: { type: DataTypes.STRING(150), allowNull: true },

  codigo_postal: { type: DataTypes.STRING(20), allowNull: true },
  localidad: { type: DataTypes.STRING(100), allowNull: true },
  zona: { type: DataTypes.STRING(100), allowNull: true },
  provincia: { type: DataTypes.STRING(100), allowNull: true },

  comentarios: { type: DataTypes.TEXT, allowNull: true },

  fecha_alta: { type: DataTypes.DATEONLY },
}, {
  tableName: "clientes",
  timestamps: false,
});

export default Cliente;
