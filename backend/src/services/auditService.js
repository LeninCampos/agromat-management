import AuditLog from "../models/AuditLog.js";

const EXCLUDED_TABLES = ["audit_log", "sessions", "SequelizeMeta"];

function getPrimaryKeyValue(instance) {
  const modelPK = instance.constructor.primaryKeyAttributes;
  if (modelPK.length === 1) {
    return String(instance[modelPK[0]]);
  }
  return modelPK.map((key) => instance[key]).join("|");
}

function sanitizeData(data) {
  if (!data) return null;
  const sanitized = { ...data };
  const sensitiveFields = ["password", "token", "refresh_token", "secret"];
  sensitiveFields.forEach((field) => {
    if (sanitized[field]) sanitized[field] = "[REDACTED]";
  });
  return sanitized;
}

export async function logAuditEvent({
  tabla,
  idRegistro,
  accion,
  datosAnteriores,
  datosNuevos,
  userId,
  ipAddress,
  clientTime, // ✅ Recibimos la hora del cliente
}) {
  try {
    await AuditLog.create({
      tabla_afectada: tabla,
      id_registro: idRegistro,
      accion,
      datos_anteriores: sanitizeData(datosAnteriores),
      datos_nuevos: sanitizeData(datosNuevos),
      id_empleado: userId || null,
      ip_address: ipAddress || null,
      fecha_cliente: clientTime || null, // ✅ Guardamos la hora del cliente
    });
  } catch (error) {
    console.error("❌ Error en audit log:", error.message);
  }
}

export function setupAuditHooks(model) {
  const tableName = model.getTableName();
  if (EXCLUDED_TABLES.includes(tableName)) return;

  // CREATE
  model.addHook("afterCreate", async (instance, options) => {
    await logAuditEvent({
      tabla: tableName,
      idRegistro: getPrimaryKeyValue(instance),
      accion: "CREATE",
      datosAnteriores: null,
      datosNuevos: instance.toJSON(),
      userId: options.userId,
      ipAddress: options.ipAddress,
      clientTime: options.clientTime, // ✅ Pasamos la opción
    });
  });

  // UPDATE
  model.addHook("afterUpdate", async (instance, options) => {
    const changedFields = instance.changed();
    if (!changedFields || changedFields.length === 0) return;

    const datosAnteriores = {};
    const datosNuevos = {};
    changedFields.forEach((field) => {
      datosAnteriores[field] = instance.previous(field);
      datosNuevos[field] = instance[field];
    });

    await logAuditEvent({
      tabla: tableName,
      idRegistro: getPrimaryKeyValue(instance),
      accion: "UPDATE",
      datosAnteriores,
      datosNuevos,
      userId: options.userId,
      ipAddress: options.ipAddress,
      clientTime: options.clientTime, // ✅ Pasamos la opción
    });
  });

  // DELETE
  model.addHook("afterDestroy", async (instance, options) => {
    await logAuditEvent({
      tabla: tableName,
      idRegistro: getPrimaryKeyValue(instance),
      accion: "DELETE",
      datosAnteriores: instance.toJSON(),
      datosNuevos: null,
      userId: options.userId,
      ipAddress: options.ipAddress,
      clientTime: options.clientTime, // ✅ Pasamos la opción
    });
  });
}

export default { setupAuditHooks, logAuditEvent };