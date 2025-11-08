// src/models/Empleado.js
import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";
import bcrypt from "bcryptjs";

const Empleado = sequelize.define("Empleado", {
  id_empleado: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  nombre_empleado: { type: DataTypes.STRING(100), allowNull: false },
  numero_empleado: { type: DataTypes.STRING(50), allowNull: false },
  correo: {
    type: DataTypes.STRING(254),
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    }
  },
  fecha_alta: { type: DataTypes.DATEONLY, allowNull: false },
  
  password: {
    type: DataTypes.STRING(60),
    allowNull: false
  },
  rol: {
    type: DataTypes.ENUM("admin", "empleado"),
    allowNull: false,
    defaultValue: "empleado"
  }
  
}, {
  tableName: "empleados",
  timestamps: false,
  
  hooks: {
    beforeCreate: async (empleado) => {
      if (empleado.password) {
        const salt = await bcrypt.genSalt(10);
        empleado.password = await bcrypt.hash(empleado.password, salt);
      }
    },
    beforeUpdate: async (empleado) => {
      if (empleado.changed('password')) {
        const salt = await bcrypt.genSalt(10);
        empleado.password = await bcrypt.hash(empleado.password, salt);
      }
    }
  }
});

Empleado.prototype.compararPassword = function (passwordFormulario) {
  return bcrypt.compare(passwordFormulario, this.password);
};

export default Empleado;