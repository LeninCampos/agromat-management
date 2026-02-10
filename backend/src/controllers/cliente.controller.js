import { Cliente, Pedido, Contiene, Producto, sequelize } from "../models/index.js";
import { Op } from "sequelize";
import xlsx from "xlsx";
import fs from "fs";

export const getAllClientes = async (req, res, next) => {
  try {
    const clientes = await Cliente.findAll({
      include: [
        {
          model: Pedido,
          attributes: ["id_pedido", "fecha_pedido"],
          include: [
            {
              model: Producto,
              attributes: ["nombre_producto"],
              through: { attributes: [] }
            }
          ]
        }
      ],
      order: [["id_cliente", "ASC"]]
    });

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const rows = clientes.map(c => {
      const pedidos = c.Pedidos || [];

      let ultimoPedido = null;
      if (pedidos.length > 0) {
        const fechas = pedidos.map(p => new Date(p.fecha_pedido).getTime());
        ultimoPedido = new Date(Math.max(...fechas)).toISOString().split('T')[0];
      }

      const cantidadUltimoAnio = pedidos.filter(p => {
        return new Date(p.fecha_pedido) >= oneYearAgo;
      }).length;

      const productosSet = new Set();
      pedidos.forEach(p => {
        p.Productos?.forEach(prod => productosSet.add(prod.nombre_producto.toLowerCase()));
      });
      const productosCompradosStr = Array.from(productosSet).join(" ");

      return {
        id_cliente: c.id_cliente,
        codigo_cliente: c.codigo_cliente,
        nombre_cliente: c.nombre_cliente,
        nombre_contacto: c.nombre_contacto,
        cuit: c.cuit,
        telefono: c.telefono,
        fax: c.fax,
        correo: c.correo_cliente,
        direccion: c.direccion,
        codigo_postal: c.codigo_postal,
        localidad: c.localidad,
        zona: c.zona,
        provincia: c.provincia,
        comentarios: c.comentarios,
        fecha_alta: c.fecha_alta,

        ultimo_pedido: ultimoPedido || "Sin pedidos",
        pedidos_ultimo_anio: cantidadUltimoAnio,
        _productos_busqueda: productosCompradosStr
      };
    });

    res.json(rows);
  } catch (err) { next(err); }
};

export const getClienteById = async (req, res, next) => {
  try {
    const row = await Cliente.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Cliente no encontrado" });
    res.json(row);
  } catch (err) { next(err); }
};

export const createCliente = async (req, res, next) => {
  const auditOptions = {
    userId: req.empleado?.id,
    ipAddress: req.ip,
  };

  try {
    const nuevo = await Cliente.create(req.body, auditOptions);
    res.status(201).json(nuevo);
  } catch (err) { next(err); }
};

export const updateCliente = async (req, res, next) => {
  const auditOptions = {
    userId: req.empleado?.id,
    ipAddress: req.ip,
  };

  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });

    await cliente.update(req.body, auditOptions);
    res.json(cliente);
  } catch (err) { next(err); }
};

export const deleteCliente = async (req, res, next) => {
  const auditOptions = {
    userId: req.empleado?.id,
    ipAddress: req.ip,
  };

  try {
    const row = await Cliente.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Cliente no encontrado" });

    await row.destroy(auditOptions);
    res.json({ ok: true, mensaje: "Cliente eliminado" });
  } catch (err) { next(err); }
};

// ─────────────────────────────────────────────────────────────────────
// IMPORTAR CLIENTES DESDE EXCEL (.xlsx)
// ─────────────────────────────────────────────────────────────────────

/**
 * Convierte un valor a string limpio o null.
 */
function toStr(val) {
  if (val === undefined || val === null) return null;
  const s = String(val).trim();
  return s === "" ? null : s;
}

/**
 * Normaliza texto para comparación: quita tildes, lowercase, quita puntos/espacios extras.
 */
function normalize(str) {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // quitar tildes
    .toLowerCase()
    .replace(/[^a-z0-9]/g, ""); // solo letras y numeros
}

/**
 * Busca el valor de una fila Excel soportando múltiples variantes de nombre de columna.
 * 1) Match exacto
 * 2) Match case-insensitive
 * 3) Match normalizado (sin tildes, sin puntos, sin espacios)
 * 4) Match parcial: si alguna keyword está contenida en el header
 */
function getCol(row, variants, rowKeys, keywords) {
  // 1. Match exacto
  for (const v of variants) {
    if (row[v] !== undefined && row[v] !== null) return row[v];
  }
  // 2. Match case-insensitive
  const variantsLower = variants.map(v => v.toLowerCase().trim());
  for (const key of rowKeys) {
    if (variantsLower.includes(key.toLowerCase().trim())) return row[key];
  }
  // 3. Match normalizado (sin tildes, sin signos, sin espacios)
  const variantsNorm = variants.map(v => normalize(v));
  for (const key of rowKeys) {
    if (variantsNorm.includes(normalize(key))) return row[key];
  }
  // 4. Match parcial por keywords
  if (keywords) {
    for (const key of rowKeys) {
      const keyNorm = normalize(key);
      for (const kw of keywords) {
        if (keyNorm.includes(kw)) return row[key];
      }
    }
  }
  return null;
}

/**
 * Normaliza CUIT: solo dígitos
 */
function normalizeCuit(val) {
  if (!val) return null;
  const digits = String(val).replace(/\D/g, "");
  return digits.length === 11 ? digits : null;
}

/**
 * Keywords que identifican una fila como header de clientes.
 */
const HEADER_KEYWORDS = [
  "razon", "social", "domicilio", "postal", "localidad",
  "zona", "telefono", "fax", "provincia", "cuit", "mail",
  "contacto", "codigo", "nombre", "direccion", "correo", "email",
];

/**
 * Detecta si una fila de array parece ser un header (contiene keywords conocidas).
 */
function isHeaderRow(rowArray) {
  let matches = 0;
  for (const cell of rowArray) {
    if (cell === undefined || cell === null) continue;
    const cellNorm = normalize(String(cell));
    for (const kw of HEADER_KEYWORDS) {
      if (cellNorm.includes(kw)) { matches++; break; }
    }
  }
  return matches >= 3; // al menos 3 columnas matchean keywords
}

export const importarClientesExcel = async (req, res, next) => {
  let filePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió archivo" });
    }
    filePath = req.file.path;

    // 1. Leer Excel como array de arrays para auto-detectar headers
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) {
      return res.status(400).json({ error: "El archivo Excel está vacío" });
    }

    const sheet = workbook.Sheets[sheetName];
    const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 }); // array de arrays

    if (rawRows.length === 0) {
      return res.status(400).json({
        error: "El archivo no contiene filas de datos",
        reporte: { total: 0, creados: 0, duplicados: 0, errores: 0, detalle: [] }
      });
    }

    // Auto-detectar fila de headers (buscar en las primeras 10 filas)
    let headerRowIdx = 0;
    for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
      if (isHeaderRow(rawRows[i])) {
        headerRowIdx = i;
        break;
      }
    }

    // Re-leer con la fila correcta como header
    const headerRow = rawRows[headerRowIdx].map(h => h !== undefined && h !== null ? String(h).trim() : "");
    const data = [];
    for (let i = headerRowIdx + 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      if (!row || row.length === 0) continue;
      // Verificar que la fila no sea completamente vacía
      const hasData = row.some(cell => cell !== undefined && cell !== null && String(cell).trim() !== "");
      if (!hasData) continue;
      const obj = {};
      for (let j = 0; j < headerRow.length; j++) {
        if (headerRow[j]) {
          obj[headerRow[j]] = row[j] !== undefined ? row[j] : null;
        }
      }
      data.push(obj);
    }

    const headersReales = headerRow.filter(h => h !== "");
    console.log("[Import Clientes] Header row index:", headerRowIdx);
    console.log("[Import Clientes] Headers detectados:", headersReales);

    if (data.length === 0) {
      return res.status(400).json({
        error: "El archivo no contiene filas de datos después de los headers",
        reporte: { total: 0, creados: 0, duplicados: 0, errores: 0, detalle: [], headers_detectados: headersReales }
      });
    }

    // 2. Mapear y normalizar filas
    const errores = [];
    const filasValidas = [];

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const rowKeys = Object.keys(row);
      const fila = i + 2; // +2 porque fila 1 es header y es 0-indexed

      const nombreRaw = getCol(row, [
        "Razón Social", "Razon Social", "razon social", "RAZON SOCIAL",
        "nombre_cliente", "Nombre", "nombre", "Cliente", "Empresa",
      ], rowKeys, ["razonsocial", "razonsoc", "nombrecli", "empresa"]);

      const codigoRaw = getCol(row, [
        "Código", "Codigo", "codigo", "CODIGO", "Código o id", "Codigo o id",
        "codigo_cliente", "Cod", "COD", "ID", "id", "Nro",
      ], rowKeys, ["codigoid", "codigooid", "codcli"]);

      const domicilioRaw = getCol(row, [
        "Domicilio", "domicilio", "DOMICILIO", "Dirección", "Direccion",
        "direccion", "DIRECCION", "Calle", "calle",
      ], rowKeys, ["domicilio", "direccion"]);

      const cpRaw = getCol(row, [
        "C. Postal", "C.Postal", "CP", "cp", "Código Postal", "Codigo Postal",
        "codigo postal", "CODIGO POSTAL", "Cod Postal", "Cod. Postal",
      ], rowKeys, ["postal", "cpostal", "codpostal", "codigopostal"]);

      const localidadRaw = getCol(row, [
        "Localidad", "localidad", "LOCALIDAD", "Ciudad", "ciudad",
      ], rowKeys, ["localidad", "ciudad", "poblacion"]);

      const zonaRaw = getCol(row, [
        "Zona", "zona", "ZONA", "Region", "Región",
      ], rowKeys, ["zona", "region"]);

      const telRaw = getCol(row, [
        "Teléfono", "Telefono", "telefono", "TELEFONO", "Tel", "tel",
        "Tel.", "Celular", "Phone",
      ], rowKeys, ["telefono", "phone", "celular"]);

      const faxRaw = getCol(row, [
        "Fax", "fax", "FAX", "Fax.",
      ], rowKeys, ["fax", "facsimil"]);

      const provRaw = getCol(row, [
        "Provincia", "provincia", "PROVINCIA", "Prov", "Prov.",
      ], rowKeys, ["provincia", "prov"]);

      const cuitRaw = getCol(row, [
        "Nº CUIT", "N° CUIT", "CUIT", "cuit", "Cuit", "Nro CUIT",
        "Nro. CUIT", "Numero CUIT", "CUIT/CUIL",
      ], rowKeys, ["cuit", "cuil"]);

      const mailRaw = getCol(row, [
        "Mail", "mail", "MAIL", "Email", "email", "E-Mail", "e-mail",
        "Correo", "correo", "CORREO",
      ], rowKeys, ["mail", "email", "correo"]);

      const contactoRaw = getCol(row, [
        "Contacto", "contacto", "CONTACTO", "Nombre Contacto",
        "nombre_contacto", "Referente", "Encargado",
      ], rowKeys, ["contacto", "referente", "encargado"]);

      const cuitNorm = normalizeCuit(cuitRaw);
      const codigoCliente = toStr(codigoRaw);
      const nombreCliente = toStr(nombreRaw);

      // Si la fila está completamente vacía, saltar
      if (!nombreCliente && !cuitNorm && !codigoCliente) {
        errores.push({ fila, razon: "Fila vacía (sin nombre, CUIT ni código)" });
        continue;
      }

      filasValidas.push({
        fila,
        codigo_cliente: codigoCliente,
        nombre_cliente: nombreCliente,
        direccion: toStr(domicilioRaw),
        codigo_postal: toStr(cpRaw),
        localidad: toStr(localidadRaw),
        zona: toStr(zonaRaw),
        telefono: toStr(telRaw),
        fax: toStr(faxRaw),
        provincia: toStr(provRaw),
        cuit: cuitNorm,
        correo_cliente: mailRaw ? String(mailRaw).trim().toLowerCase() || null : null,
        nombre_contacto: toStr(contactoRaw),
        fecha_alta: new Date().toISOString().split("T")[0],
      });
    }

    // 3. Deduplicar dentro del archivo
    const vistosCuit = new Map();
    const vistosCodigo = new Map();
    const vistosNombre = new Map();
    const duplicadosInternos = [];
    const filasUnicas = [];

    for (const fila of filasValidas) {
      let esDup = false;

      // Dedup por CUIT
      if (fila.cuit) {
        if (vistosCuit.has(fila.cuit)) {
          duplicadosInternos.push({ fila: fila.fila, razon: `CUIT ${fila.cuit} duplicado en archivo (misma que fila ${vistosCuit.get(fila.cuit)})` });
          esDup = true;
        } else {
          vistosCuit.set(fila.cuit, fila.fila);
        }
      }

      // Dedup por codigo_cliente
      if (!esDup && fila.codigo_cliente) {
        if (vistosCodigo.has(fila.codigo_cliente)) {
          duplicadosInternos.push({ fila: fila.fila, razon: `Código ${fila.codigo_cliente} duplicado en archivo (misma que fila ${vistosCodigo.get(fila.codigo_cliente)})` });
          esDup = true;
        } else {
          vistosCodigo.set(fila.codigo_cliente, fila.fila);
        }
      }

      // Dedup por nombre SOLO si tiene nombre y no tiene CUIT ni código
      if (!esDup && !fila.cuit && !fila.codigo_cliente && fila.nombre_cliente) {
        const nombreNorm = fila.nombre_cliente.toLowerCase();
        if (vistosNombre.has(nombreNorm)) {
          duplicadosInternos.push({ fila: fila.fila, razon: `Nombre "${fila.nombre_cliente}" duplicado en archivo (misma que fila ${vistosNombre.get(nombreNorm)})` });
          esDup = true;
        } else {
          vistosNombre.set(nombreNorm, fila.fila);
        }
      }

      if (!esDup) filasUnicas.push(fila);
    }

    // 4. Verificar duplicados contra BD
    const cuitsArchivo = filasUnicas.filter(f => f.cuit).map(f => f.cuit);
    const codigosArchivo = filasUnicas.filter(f => f.codigo_cliente).map(f => f.codigo_cliente);
    const nombresArchivo = filasUnicas
      .filter(f => !f.cuit && !f.codigo_cliente && f.nombre_cliente)
      .map(f => f.nombre_cliente.toLowerCase());

    const existentesCuit = cuitsArchivo.length > 0
      ? await Cliente.findAll({ where: { cuit: { [Op.in]: cuitsArchivo } }, attributes: ["cuit"], raw: true })
      : [];
    const setCuitsExistentes = new Set(existentesCuit.map(c => c.cuit));

    const existentesCodigo = codigosArchivo.length > 0
      ? await Cliente.findAll({ where: { codigo_cliente: { [Op.in]: codigosArchivo } }, attributes: ["codigo_cliente"], raw: true })
      : [];
    const setCodigosExistentes = new Set(existentesCodigo.map(c => c.codigo_cliente));

    const existentesNombre = nombresArchivo.length > 0
      ? await Cliente.findAll({
          where: sequelize.where(
            sequelize.fn("LOWER", sequelize.col("nombre_cliente")),
            { [Op.in]: nombresArchivo }
          ),
          attributes: ["nombre_cliente"],
          raw: true
        })
      : [];
    const setNombresExistentes = new Set(existentesNombre.map(c => c.nombre_cliente.toLowerCase()));

    const duplicadosBD = [];
    const filasParaInsertar = [];

    for (const fila of filasUnicas) {
      if (fila.cuit && setCuitsExistentes.has(fila.cuit)) {
        duplicadosBD.push({ fila: fila.fila, razon: `CUIT ${fila.cuit} ya existe en la base de datos` });
      } else if (fila.codigo_cliente && setCodigosExistentes.has(fila.codigo_cliente)) {
        duplicadosBD.push({ fila: fila.fila, razon: `Código ${fila.codigo_cliente} ya existe en la base de datos` });
      } else if (!fila.cuit && !fila.codigo_cliente && fila.nombre_cliente && setNombresExistentes.has(fila.nombre_cliente.toLowerCase())) {
        duplicadosBD.push({ fila: fila.fila, razon: `Nombre "${fila.nombre_cliente}" ya existe en la base de datos` });
      } else {
        filasParaInsertar.push(fila);
      }
    }

    // 5. Insertar en chunks con transacción
    const CHUNK_SIZE = 50;
    let totalCreados = 0;

    if (filasParaInsertar.length > 0) {
      const t = await sequelize.transaction();
      try {
        for (let i = 0; i < filasParaInsertar.length; i += CHUNK_SIZE) {
          const chunk = filasParaInsertar.slice(i, i + CHUNK_SIZE);
          const records = chunk.map(({ fila, ...campos }) => campos);
          await Cliente.bulkCreate(records, {
            transaction: t,
            ignoreDuplicates: true,
          });
          totalCreados += records.length;
        }
        await t.commit();
      } catch (err) {
        await t.rollback();
        return res.status(500).json({
          error: "Error al insertar clientes en la base de datos",
          detalle: err.message,
        });
      }
    }

    // 6. Limpiar archivo temporal
    try { fs.unlinkSync(filePath); } catch { /* ignorar */ }

    // 7. Reporte
    const todosLosdup = [...duplicadosInternos, ...duplicadosBD];
    res.status(201).json({
      ok: true,
      reporte: {
        total_filas: data.length,
        creados: totalCreados,
        duplicados: todosLosdup.length,
        errores: errores.length,
        detalle_duplicados: todosLosdup,
        detalle_errores: errores,
        headers_detectados: headersReales,
      }
    });

  } catch (error) {
    // Limpiar archivo si existe
    if (filePath) {
      try { fs.unlinkSync(filePath); } catch { /* ignorar */ }
    }
    next(error);
  }
};
