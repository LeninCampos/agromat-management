import { sequelize, Producto, Suministro, Suministra } from "../models/index.js";
import xlsx from "xlsx";

export const importarSuministroExcel = async (req, res, next) => {
  const t = await sequelize.transaction();
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No se subió archivo" });
    }

    const workbook = xlsx.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    // data será un array de objetos: [{ "item code": "00107092", "Quantity": "16 pcs", "Price": 150.50 ... }]

    // 👇 Recibimos datos del body
    const { id_proveedor, fecha_llegada, hora_llegada, id_empleado } = req.body;

    // 1️⃣ Crear el Suministro (Cabecera)
    const suministro = await Suministro.create(
      {
        fecha_llegada,
        hora_llegada,
        id_proveedor,
        id_empleado,
      },
      { transaction: t }
    );

    let productosProcesados = 0;
    let productosCreados = 0;

    // 2️⃣ Iterar filas del Excel
    for (const row of data) {
      // Obtener datos del Excel (normalizando nombres de columnas)
      const codigoRaw =
        row["item code"] ||
        row["Codigo"] ||
        row["codigo"] ||
        row["Item Code"] ||
        row["ID"] ||
        row["id"] ||
        row["Item ID"];

      const descripcionRaw =
        row["item description"] ||
        row["Description"] ||
        row["Descripcion"] ||
        row["nombre"] ||
        row["Nombre"] ||
        "Producto Nuevo";

      const cantidadRaw = row["Quantity"] || row["Cantidad"];

      // 👇 NUEVO: Detectar columnas de Precio o Costo
      const precioRaw =
        row["Price"] ||
        row["Precio"] ||
        row["precio"] ||
        row["PRECIO"] ||
        row["Cost"] ||
        row["Costo"] ||
        row["Unit Price"];

      if (!codigoRaw || !cantidadRaw) continue;

      const id_producto = String(codigoRaw).trim();
      const cantidad = parseInt(String(cantidadRaw).replace(/\D/g, ""), 10);

      // 👇 Lógica de validación del precio
      let precioValidado = null;
      if (precioRaw !== undefined && precioRaw !== null && String(precioRaw).trim() !== "") {
        // Limpiamos caracteres no numéricos excepto el punto (por si viene como "$150.00")
        const precioLimpio = String(precioRaw).replace(/[^0-9.]/g, "");
        const parsed = parseFloat(precioLimpio);
        if (!isNaN(parsed)) {
          precioValidado = parsed;
        }
      }

      if (!cantidad) continue;

      // 3️⃣ Buscar si existe el producto
      let producto = await Producto.findByPk(id_producto, { transaction: t });

      if (!producto) {
        // ---- SI NO EXISTE, LO CREAMOS ----
        producto = await Producto.create(
          {
            id_producto: id_producto,
            nombre_producto: descripcionRaw,
            id_proveedor: id_proveedor,
            // 👇 CAMBIO: Si hay precio validado úsalo, si no, usa 0
            precio: precioValidado !== null ? precioValidado : 0,
            stock: 0,
            descripcion: "Importado automáticamente desde Excel",
            imagen_url: null,
          },
          { transaction: t }
        );
        productosCreados++;
      } else {
        // ---- SI YA EXISTE ----
        // 👇 CAMBIO: Solo actualizamos si el Excel trae un precio válido
        if (precioValidado !== null) {
          await producto.update(
            { precio: precioValidado },
            { transaction: t }
          );
        }
        // Si precioValidado es null, NO hacemos update, preservando el precio actual.
      }

      // 4️⃣ Registrar el detalle en Suministra
      await Suministra.create(
        {
          id_suministro: suministro.id_suministro,
          id_producto,
          cantidad,
        },
        { transaction: t }
      );

      // 5️⃣ Actualizar stock del producto
      await producto.increment("stock", { by: cantidad, transaction: t });
      productosProcesados++;
    }

    await t.commit();

    res.status(201).json({
      ok: true,
      mensaje: "Proceso finalizado.",
      detalles: `Se procesaron ${productosProcesados} items. Se crearon ${productosCreados} productos nuevos.`,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    next(error);
  }
};