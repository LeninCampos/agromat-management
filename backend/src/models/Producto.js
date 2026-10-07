// src/models/Producto.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const Producto = sequelize.define(
  "Producto",
  {
    // CAMBIO: Ahora es STRING, sin autoIncrement y tú lo asignas manualmente
    id_producto: {
      type: DataTypes.STRING(50),
      primaryKey: true,
      allowNull: false,
    },
    nombre_producto: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    descripcion: {
      type: DataTypes.STRING(255),
    },
    id_proveedor: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    precio: {
      type: DataTypes.DECIMAL(10, 2), // Precio en la moneda del producto (ver `moneda`)
      allowNull: false,
    },
    moneda: {
      type: DataTypes.STRING(3), // 'EUR' | 'USD' — moneda de origen del precio
      allowNull: false,
      defaultValue: "EUR",
    },
    stock: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    // 🔥 Campo para la imagen del producto (URL o ruta)
    imagen_url: {
      type: DataTypes.TEXT, // antes STRING(255)
      allowNull: true,
    },
  },
  {
    tableName: "productos",
    timestamps: false,
  }
);

export default Producto;
