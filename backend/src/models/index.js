// src/models/index.js
import sequelize from "../config/db.js";

import Cliente from "./Cliente.js";
import Empleado from "./Empleado.js";
import Proveedor from "./Proveedor.js";
import Producto from "./Producto.js";
import Pedido from "./Pedido.js";
import Contiene from "./Contiene.js";
import Envio from "./Envio.js";
import EnvioDetalle from "./EnvioDetalle.js";
import Zona from "./Zona.js";
import SeUbica from "./SeUbica.js";
import Suministro from "./Suministro.js";
import Suministra from "./Suministra.js";

// ---- Relaciones Productos / Proveedor
Producto.belongsTo(Proveedor, { foreignKey: "id_proveedor" });
Proveedor.hasMany(Producto, { foreignKey: "id_proveedor" });

// ---- Pedidos con Clientes y Empleados
Pedido.belongsTo(Cliente, { foreignKey: "id_cliente" });
Cliente.hasMany(Pedido, { foreignKey: "id_cliente" });

Pedido.belongsTo(Empleado, { foreignKey: "id_empleado" });
Empleado.hasMany(Pedido, { foreignKey: "id_empleado" });

// ---- Lineas de pedido (Contiene) N:M
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

// ---- Envíos
Envio.belongsTo(Pedido, { foreignKey: "id_pedido" });
Pedido.hasMany(Envio, { foreignKey: "id_pedido" });

Envio.belongsTo(Empleado, { as: "responsable", foreignKey: "id_empleado_responsable" });
Empleado.hasMany(Envio, { as: "enviosAsignados", foreignKey: "id_empleado_responsable" });

Envio.hasMany(EnvioDetalle, { foreignKey: "id_envio" });
EnvioDetalle.belongsTo(Envio, { foreignKey: "id_envio" });

EnvioDetalle.belongsTo(Producto, { foreignKey: "id_producto" });
Producto.hasMany(EnvioDetalle, { foreignKey: "id_producto" });

SeUbica.belongsTo(Producto, { foreignKey: "id_producto" });
Producto.hasMany(SeUbica, { foreignKey: "id_producto" });

SeUbica.belongsTo(Zona, { foreignKey: "nombre", targetKey: "nombre", constraints: false });

// ---- Suministros (entradas)
Suministro.belongsTo(Proveedor, { foreignKey: "id_proveedor" });
Proveedor.hasMany(Suministro, { foreignKey: "id_proveedor" });

Suministra.belongsTo(Suministro, { foreignKey: "id_suministro" });
Suministro.hasMany(Suministra, { foreignKey: "id_suministro" });

Suministra.belongsTo(Producto, { foreignKey: "id_producto" });
Producto.hasMany(Suministra, { foreignKey: "id_producto" });

export {
  sequelize,
  Cliente,
  Empleado,
  Proveedor,
  Producto,
  Pedido,
  Contiene,
  Envio,
  EnvioDetalle,
  Zona,
  SeUbica,
  Suministro,
  Suministra,
};
