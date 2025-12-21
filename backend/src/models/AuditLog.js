import { DataTypes } from "sequelize";
import sequelize from "../config/db.js";

const AuditLog = sequelize.define("AuditLog", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  tabla_afectada: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  id_registro: {
    type: DataTypes.STRING(50),
    allowNull: false
  },
  accion: {
    type: DataTypes.ENUM("CREATE", "UPDATE", "DELETE"),
    allowNull: false
  },
  datos_anteriores: {
    type: DataTypes.JSON,
    allowNull: true
  },
  datos_nuevos: {
    type: DataTypes.JSON,
    allowNull: true
  },
  id_empleado: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  ip_address: {
    type: DataTypes.STRING(45),
    allowNull: true
  },
  // ✅ NUEVO: Hora reportada por el cliente (computadora del usuario)
  fecha_cliente: {
    type: DataTypes.DATE,
    allowNull: true
  },
  created_at: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: "audit_log",
  timestamps: false
});

export default AuditLog;