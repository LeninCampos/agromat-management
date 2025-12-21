// backend/src/models/index.js
import sequelize from "../config/db.js";

import Cliente from "./Cliente.js";
import Empleado from "./Empleado.js";
import Proveedor from "./Proveedor.js";
import Producto from "./Producto.js";
import Pedido from "./Pedido.js";
import Contiene from "./Contiene.js";
import Envio from "./Envio.js";
import Zona from "./Zona.js";
import SeUbica from "./SeUbica.js";
import Suministro from "./Suministro.js";
import Suministra from "./Suministra.js";
import FotoEnvio from "./FotoEnvio.js"; // ✅ NUEVO
import AuditLog from "./AuditLog.js";
import { setupAuditHooks } from "../services/auditService.js";

// ===============================
// Productos / Proveedor
// ===============================
Producto.belongsTo(Proveedor, {
  foreignKey: "id_proveedor",
});
Proveedor.hasMany(Producto, {
  foreignKey: "id_proveedor",
});

// ===============================
// Pedidos con Clientes y Empleados
// ===============================
Pedido.belongsTo(Cliente, {
  foreignKey: "id_cliente",
});
Cliente.hasMany(Pedido, {
  foreignKey: "id_cliente",
});

Pedido.belongsTo(Empleado, {
  foreignKey: "id_empleado",
});
Empleado.hasMany(Pedido, {
  foreignKey: "id_empleado",
});

// ===============================
// Líneas de pedido (Contiene) N:M
// ===============================
Producto.belongsToMany(Pedido, {
  through: Contiene,
  foreignKey: "id_producto",
  otherKey: "id_pedido",
});

Pedido.belongsToMany(Producto, {
  through: Contiene,
  foreignKey: "id_pedido",
  otherKey: "id_producto",
});

// ===============================
// Envíos / Despachos
// ===============================
Envio.belongsTo(Pedido, {
  foreignKey: "id_pedido",
});
Pedido.hasMany(Envio, {
  foreignKey: "id_pedido",
});

Envio.belongsTo(Empleado, {
  as: "responsable",
  foreignKey: "id_empleado_responsable",
});
Empleado.hasMany(Envio, {
  as: "enviosAsignados",
  foreignKey: "id_empleado_responsable",
});

// ✅ NUEVO: Fotos de Envío (1 envío tiene muchas fotos)
Envio.hasMany(FotoEnvio, {
  foreignKey: "id_envio",
  as: "fotos",
  onDelete: "CASCADE",
});
FotoEnvio.belongsTo(Envio, {
  foreignKey: "id_envio",
});

// ===============================
// Ubicación de productos (SeUbica)
// ===============================
Producto.hasMany(SeUbica, {
  foreignKey: "id_producto",
  as: "SeUbicas",
});

SeUbica.belongsTo(Producto, {
  foreignKey: "id_producto",
});

Zona.hasMany(SeUbica, {
  foreignKey: "id_zona",
  as: "SeUbicasZona",
});

SeUbica.belongsTo(Zona, {
  foreignKey: "id_zona",
  as: "Zona",
});

// ===============================
// Suministros (entradas)
// ===============================
Suministro.belongsTo(Proveedor, {
  foreignKey: "id_proveedor",
});
Proveedor.hasMany(Suministro, {
  foreignKey: "id_proveedor",
});

Suministra.belongsTo(Suministro, {
  foreignKey: "id_suministro",
});
Suministro.hasMany(Suministra, {
  foreignKey: "id_suministro",
});

Suministra.belongsTo(Producto, {
  foreignKey: "id_producto",
});
Producto.hasMany(Suministra, {
  foreignKey: "id_producto",
});

Suministro.belongsTo(Empleado, {
  foreignKey: "id_empleado",
});
Empleado.hasMany(Suministro, {
  foreignKey: "id_empleado",
});

// ─────────────────────────────────────────────────────────────────────────────
// ASOCIACIÓN AUDIT LOG ↔ EMPLEADO
// ─────────────────────────────────────────────────────────────────────────────
Empleado.hasMany(AuditLog, { foreignKey: "id_empleado", as: "auditLogs" });
AuditLog.belongsTo(Empleado, { foreignKey: "id_empleado", as: "empleado" });

// ─────────────────────────────────────────────────────────────────────────────
// CONFIGURAR HOOKS DE AUDITORÍA
// ─────────────────────────────────────────────────────────────────────────────
const modelosAuditables = [
  Cliente,
  Contiene,
  Empleado,
  Envio,
  Pedido,
  Producto,
  Proveedor,
  SeUbica,
  Suministra,
  Suministro,
  Zona
];

modelosAuditables.forEach(modelo => {
  setupAuditHooks(modelo);
});

console.log("✅ Hooks de auditoría configurados para", modelosAuditables.length, "modelos");

export {
  sequelize,
  Cliente,
  Empleado,
  Proveedor,
  Producto,
  Pedido,
  Contiene,
  Envio,
  Zona,
  SeUbica,
  Suministro,
  Suministra,
  FotoEnvio, // ✅ NUEVO
  AuditLog,
};