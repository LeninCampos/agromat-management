import { sequelize, Producto, Suministro, Suministra, Zona, SeUbica } from "../models/index.js";
import xlsx from "xlsx";

// Valores válidos para ubicación
const RACKS_VALIDOS = ['A', 'B', 'C'];
const LARGO_MIN = 1, LARGO_MAX = 6;
const PISO_MIN = 1, PISO_MAX = 3;

function getAuditOptions(req) {
  const clientTimeHeader = req.headers['x-client-time'];
  return {
    userId: req.empleado?.id || null,
    ipAddress: req.ip || req.connection?.remoteAddress || null,
    clientTime: clientTimeHeader ? new Date(clientTimeHeader) : null,
  };
}

export const importarSuministroExcel = async (req, res, next) => {
  const t = await sequelize.transaction();
  const auditOptions = getAuditOptions(req);
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió archivo" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // 👇 Recibimos datos del body, incluyendo moneda y tasa
    const { id_proveedor, fecha_llegada, hora_llegada, id_empleado, moneda, tasa_cambio } = req.body;

    // 1️⃣ Crear el Suministro (Cabecera)
    const suministro = await Suministro.create(
      {
        fecha_llegada,
        hora_llegada,
        id_proveedor,
        id_empleado,
      },
      { transaction: t, ...auditOptions }
    );

    let productosProcesados = 0;
    let productosCreados = 0;
    let ubicacionesAsignadas = 0;
    const erroresUbicacion = [];

    const productosMap = new Map();

    for (let i = 0; i < data.length; i++) {
      const row = data[i];
      const numFila = i + 2; // fila 1 = encabezado, array 0-indexed

      // Normalización de nombres de columnas
      const codigoRaw =
        row["item code"] || row["Codigo"] || row["codigo"] || row["Item Code"] || row["ID"] || row["id"] || row["Item ID"];

      const descripcionRaw =
        row["item description"] || row["Description"] || row["Descripcion"] || row["nombre"] || row["Nombre"] || row["NOMBRE"];

      const cantidadRaw =
        row["Quantity"] !== undefined ? row["Quantity"] :
        row["cantidad"] !== undefined ? row["cantidad"] :
        row["CANTIDAD"] !== undefined ? row["CANTIDAD"] :
        row["STOCK"] !== undefined ? row["STOCK"] :
        row["stock"] !== undefined ? row["stock"] :
        row["Stock"] !== undefined ? row["Stock"] :
        row["Cantidad"];

      const precioRaw =
        row["Price"] || row["Precio"] || row["precio"] || row["PRECIO"] || row["Cost"] || row["Costo"] || row["Unit Price"];

      // 📍 Nuevas columnas de ubicación
      const rackRaw = row["Rack"] ?? row["rack"] ?? row["RACK"];
      const largoRaw = row["Largo"] ?? row["largo"] ?? row["LARGO"] ?? row["Modulo"] ?? row["modulo"] ?? row["MODULO"];
      const pisoRaw = row["Piso"] ?? row["piso"] ?? row["PISO"];

      if (!codigoRaw || cantidadRaw === undefined || cantidadRaw === null || String(cantidadRaw).trim() === "") {
        continue;
      }

      const id_producto = String(codigoRaw).trim();

      let cantidad = parseInt(String(cantidadRaw).replace(/\D/g, ""), 10);
      if (isNaN(cantidad)) cantidad = 0;

      let precioValidado = null;
      if (precioRaw !== undefined && precioRaw !== null && String(precioRaw).trim() !== "") {
        const precioLimpio = String(precioRaw).replace(/[^0-9.]/g, "");
        const parsed = parseFloat(precioLimpio);
        if (!isNaN(parsed)) {
          precioValidado = parsed;

          // 💶 CONVERSIÓN DE DIVISA
          if (moneda === 'USD' && tasa_cambio) {
            const tasa = parseFloat(tasa_cambio);
            if (!isNaN(tasa) && tasa > 0) {
              precioValidado = precioValidado / tasa;
            }
          }
        }
      }

      // 📍 Validación de ubicación (solo si al menos una columna viene)
      let ubicacion = null;
      const tieneAlgunaUbicacion = rackRaw !== undefined || largoRaw !== undefined || pisoRaw !== undefined;

      if (tieneAlgunaUbicacion) {
        const rack = String(rackRaw || '').trim().toUpperCase();
        const largo = parseInt(String(largoRaw || ''), 10);
        const piso = parseInt(String(pisoRaw || ''), 10);

        const erroresFila = [];
        if (!RACKS_VALIDOS.includes(rack)) {
          erroresFila.push(`Rack "${rackRaw ?? ''}" inválido (debe ser A, B o C)`);
        }
        if (isNaN(largo) || largo < LARGO_MIN || largo > LARGO_MAX) {
          erroresFila.push(`Largo "${largoRaw ?? ''}" inválido (debe ser 1-6)`);
        }
        if (isNaN(piso) || piso < PISO_MIN || piso > PISO_MAX) {
          erroresFila.push(`Piso "${pisoRaw ?? ''}" inválido (debe ser 1-3)`);
        }

        if (erroresFila.length > 0) {
          erroresUbicacion.push({ fila: numFila, id_producto, errores: erroresFila });
        } else {
          ubicacion = { rack, modulo: largo, piso, codigo: `${rack}${largo}${piso}` };
        }
      }

      // ⚡ LÓGICA DE AGRUPACIÓN
      if (productosMap.has(id_producto)) {
        const existente = productosMap.get(id_producto);
        existente.cantidad += cantidad;
        if (precioValidado !== null) {
          existente.precio = precioValidado;
        }
        if (!existente.descripcion && descripcionRaw) {
          existente.descripcion = descripcionRaw;
        }
        // Si no tenía ubicación, tomar la de esta fila
        if (ubicacion && !existente.ubicacion) {
          existente.ubicacion = ubicacion;
        }
      } else {
        productosMap.set(id_producto, {
          id_producto,
          descripcion: descripcionRaw,
          cantidad,
          precio: precioValidado,
          ubicacion
        });
      }
    }

    // 2️⃣ Iterar sobre los productos UNIFICADOS
    for (const item of productosMap.values()) {
      const { id_producto, descripcion, cantidad, precio, ubicacion } = item;

      let producto = await Producto.findByPk(id_producto, { transaction: t });

      if (!producto) {
        producto = await Producto.create(
          {
            id_producto: id_producto,
            nombre_producto: descripcion || "Producto Importado",
            id_proveedor: id_proveedor,
            precio: precio !== null ? precio : 0,
            stock: 0,
            descripcion: "Importado automáticamente desde Excel",
            imagen_url: null,
          },
          { transaction: t, ...auditOptions }
        );
        productosCreados++;
      } else {
        if (precio !== null) {
          await producto.update(
            { precio: precio },
            { transaction: t, ...auditOptions }
          );
        }
      }

      await Suministra.create(
        {
          id_suministro: suministro.id_suministro,
          id_producto,
          cantidad,
        },
        { transaction: t, ...auditOptions }
      );

      if (cantidad > 0) {
        await producto.increment("stock", { by: cantidad, transaction: t, ...auditOptions });
      }

      // 📍 Asignar ubicación si existe y es válida
      if (ubicacion) {
        const [zona] = await Zona.findOrCreate({
          where: { rack: ubicacion.rack, modulo: ubicacion.modulo, piso: ubicacion.piso },
          defaults: {
            codigo: ubicacion.codigo,
            rack: ubicacion.rack,
            modulo: ubicacion.modulo,
            piso: ubicacion.piso,
            descripcion: `Rack ${ubicacion.rack}, Módulo ${ubicacion.modulo}, Piso ${ubicacion.piso}`
          },
          transaction: t,
          ...auditOptions
        });

        // Reemplazar ubicación anterior del producto (1 producto = 1 zona)
        await SeUbica.destroy({
          where: { id_producto },
          transaction: t,
          ...auditOptions
        });
        await SeUbica.create(
          { id_producto, id_zona: zona.id_zona },
          { transaction: t, ...auditOptions }
        );

        ubicacionesAsignadas++;
      }

      productosProcesados++;
    }

    await t.commit();

    res.status(201).json({
      ok: true,
      mensaje: "Importación finalizada.",
      detalles: `Se procesaron ${productosProcesados} items únicos. Se crearon ${productosCreados} productos nuevos. Se asignaron ${ubicacionesAsignadas} ubicaciones.`,
      resumen: {
        productosProcesados,
        productosCreados,
        ubicacionesAsignadas,
        totalErroresUbicacion: erroresUbicacion.length
      },
      erroresUbicacion: erroresUbicacion.length > 0 ? erroresUbicacion : undefined
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    next(error);
  }
};
