import { Cliente, Pedido, Contiene, Producto } from "../models/index.js";
import { Op } from "sequelize";

export const getAllClientes = async (req, res, next) => {
  try {
    // Obtenemos clientes con sus pedidos y los productos de esos pedidos
    const clientes = await Cliente.findAll({
      include: [
        {
          model: Pedido,
          attributes: ["id_pedido", "fecha_pedido"],
          include: [
            {
              model: Producto,
              attributes: ["nombre_producto"], // Para el buscador por producto
              through: { attributes: [] } // No necesitamos datos de la tabla intermedia
            }
          ]
        }
      ],
      order: [["id_cliente", "ASC"]]
    });

    // Procesamos la data para el frontend
    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

    const rows = clientes.map(c => {
      const pedidos = c.Pedidos || [];
      
      // 2.5 Fecha último pedido
      let ultimoPedido = null;
      if (pedidos.length > 0) {
        // Ordenar fechas descendente y tomar la primera
        const fechas = pedidos.map(p => new Date(p.fecha_pedido).getTime());
        ultimoPedido = new Date(Math.max(...fechas)).toISOString().split('T')[0];
      }

      // 2.6 Cantidad pedidos último año
      const cantidadUltimoAnio = pedidos.filter(p => {
        return new Date(p.fecha_pedido) >= oneYearAgo;
      }).length;

      // 2.8 Preparar string de productos comprados para el buscador
      const productosSet = new Set();
      pedidos.forEach(p => {
        p.Productos?.forEach(prod => productosSet.add(prod.nombre_producto.toLowerCase()));
      });
      const productosCompradosStr = Array.from(productosSet).join(" ");

      return {
        id_cliente: c.id_cliente,
        nombre_cliente: c.nombre_cliente,
        nombre_contacto: c.nombre_contacto, // Nuevo
        telefono: c.telefono,
        correo: c.correo_cliente,
        direccion: c.direccion,
        comentarios: c.comentarios, // Nuevo
        fecha_alta: c.fecha_alta,
        // Campos calculados:
        ultimo_pedido: ultimoPedido || "Sin pedidos",
        pedidos_ultimo_anio: cantidadUltimoAnio,
        _productos_busqueda: productosCompradosStr // Campo oculto para filtrar
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
  try {
    // Validar duplicados de correo si es necesario
    const nuevo = await Cliente.create(req.body);
    res.status(201).json(nuevo);
  } catch (err) { next(err); }
};

export const updateCliente = async (req, res, next) => {
  try {
    const { id } = req.params;
    const cliente = await Cliente.findByPk(id);
    if (!cliente) return res.status(404).json({ error: "Cliente no encontrado" });
    await cliente.update(req.body);
    res.json(cliente);
  } catch (err) { next(err); }
};

export const deleteCliente = async (req, res, next) => {
  try {
    const row = await Cliente.findByPk(req.params.id);
    if (!row) return res.status(404).json({ error: "Cliente no encontrado" });
    await row.destroy();
    res.json({ ok: true, mensaje: "Cliente eliminado" });
  } catch (err) { next(err); }
};