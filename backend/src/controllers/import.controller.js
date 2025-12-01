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

    // data será un array de objetos: [{ "item code": "00107092", "Quantity": "16 pcs", ... }]

    const { id_proveedor, fecha_llegada, hora_llegada } = req.body;

    // 1️⃣ Crear el Suministro (Cabecera)
    const suministro = await Suministro.create(
      {
        fecha_llegada,
        hora_llegada,
        id_proveedor,
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
        row["Item Code"] ||
        row["Item ID"];

      const descripcionRaw =
        row["item description"] ||
        row["Description"] ||
        row["Descripcion"] ||
        "Producto Nuevo";

      const cantidadRaw = row["Quantity"] || row["Cantidad"];

      if (!codigoRaw || !cantidadRaw) continue;

      const id_producto = String(codigoRaw).trim();
      const cantidad = parseInt(String(cantidadRaw).replace(/\D/g, ""), 10);

      if (!cantidad) continue;

      // 3️⃣ Buscar si existe el producto
      let producto = await Producto.findByPk(id_producto, { transaction: t });

      // ---- SI NO EXISTE, LO CREAMOS (SIN TOCAR imagen_url) ----
      if (!producto) {
        producto = await Producto.create(
          {
            id_producto: id_producto,
            nombre_producto: descripcionRaw,      // descripción del Excel
            id_proveedor: id_proveedor,          // proveedor elegido en el modal
            precio: 0,                           // sin precio por ahora
            stock: 0,
            descripcion: "Importado automáticamente desde Excel",
            imagen_url: null,                    // 👈 NUEVO: sin foto al inicio
          },
          { transaction: t }
        );
        productosCreados++;
      }
      // ⚠️ Importante: si el producto YA EXISTE, NO lo actualizamos aquí
      // (no tocamos imagen_url, ni descripción) → conserva la foto que ya tenía.

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
      detalles: `Se procesaron ${productosProcesados} items. Se crearon ${productosCreados} productos nuevos (revisar precios).`,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    next(error);
  }
};
