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

    // 🔄 PASO PREVIO: Consolidar duplicados en un Map
    // Esto evita el error "Duplicate entry" si el Excel trae el mismo código varias veces
    const productosMap = new Map();

    for (const row of data) {
      // Normalización de nombres de columnas
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
        row["NOMBRE"];

      const cantidadRaw =
        row["Quantity"] !== undefined ? row["Quantity"] :
        row["cantidad"] !== undefined ? row["cantidad"] :
        row["CANTIDAD"] !== undefined ? row["CANTIDAD"] :
        row["STOCK"] !== undefined ? row["STOCK"] :
        row["stock"] !== undefined ? row["stock"] :
        row["Stock"] !== undefined ? row["Stock"] :
        row["Cantidad"];

      const precioRaw =
        row["Price"] ||
        row["Precio"] ||
        row["precio"] ||
        row["PRECIO"] ||
        row["Cost"] ||
        row["Costo"] ||
        row["Unit Price"];

      // Validaciones básicas
      if (!codigoRaw || cantidadRaw === undefined || cantidadRaw === null || String(cantidadRaw).trim() === "") {
        continue;
      }

      const id_producto = String(codigoRaw).trim();
      
      // Parsear cantidad
      let cantidad = parseInt(String(cantidadRaw).replace(/\D/g, ""), 10);
      if (isNaN(cantidad)) cantidad = 0;

      // Parsear precio
      let precioValidado = null;
      if (precioRaw !== undefined && precioRaw !== null && String(precioRaw).trim() !== "") {
        const precioLimpio = String(precioRaw).replace(/[^0-9.]/g, "");
        const parsed = parseFloat(precioLimpio);
        if (!isNaN(parsed)) {
          precioValidado = parsed;
        }
      }

      // ⚡ LÓGICA DE AGRUPACIÓN
      if (productosMap.has(id_producto)) {
        // Si ya existe en el mapa, sumamos la cantidad y actualizamos datos si es necesario
        const existente = productosMap.get(id_producto);
        existente.cantidad += cantidad;
        // Si encontramos un precio válido en esta fila (y no teníamos uno antes o queremos actualizar), lo guardamos
        if (precioValidado !== null) {
          existente.precio = precioValidado;
        }
        // Nos quedamos con la descripción más completa si la actual estaba vacía
        if (!existente.descripcion && descripcionRaw) {
          existente.descripcion = descripcionRaw;
        }
      } else {
        // Si es nuevo, lo agregamos al mapa
        productosMap.set(id_producto, {
          id_producto,
          descripcion: descripcionRaw,
          cantidad,
          precio: precioValidado
        });
      }
    }

    // 2️⃣ Iterar sobre los productos UNIFICADOS (ya sin duplicados)
    for (const item of productosMap.values()) {
      const { id_producto, descripcion, cantidad, precio } = item;

      // 3️⃣ Buscar si existe el producto en BD
      let producto = await Producto.findByPk(id_producto, { transaction: t });

      if (!producto) {
        // ---- SI NO EXISTE, LO CREAMOS ----
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
          { transaction: t }
        );
        productosCreados++;
      } else {
        // ---- SI YA EXISTE ----
        if (precio !== null) {
          await producto.update(
            { precio: precio },
            { transaction: t }
          );
        }
      }

      // 4️⃣ Registrar en Suministra (Siempre, aunque sea 0, para que salga en la lista)
      await Suministra.create(
        {
          id_suministro: suministro.id_suministro,
          id_producto,
          cantidad,
        },
        { transaction: t }
      );

      // 5️⃣ Actualizar stock (Solo si cantidad > 0)
      if (cantidad > 0) {
        await producto.increment("stock", { by: cantidad, transaction: t });
      }

      productosProcesados++;
    }

    await t.commit();

    res.status(201).json({
      ok: true,
      mensaje: "Proceso finalizado.",
      detalles: `Se procesaron ${productosProcesados} items únicos. Se crearon ${productosCreados} productos nuevos.`,
    });
  } catch (error) {
    if (!t.finished) await t.rollback();
    next(error);
  }
};