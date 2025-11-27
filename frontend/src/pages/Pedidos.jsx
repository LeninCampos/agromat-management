import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getPedidos,
  createPedido,
  updatePedido,
  deletePedido,
} from "../api/pedidos";
import { getProductos } from "../api/productos";
import { getClientes } from "../api/clientes";
import { getEmpleados } from "../api/empleados";

const emptyForm = {
  fecha_pedido: "",
  hora_pedido: "",
  status: "Pendiente",         // 👈 por defecto
  id_empleado: "",
  id_cliente: "",
  descuento_total: 0,
  impuesto_total: 0,
  items: [],
};

export default function Pedidos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // Catálogos
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Estado para el "mini formulario" de agregar item
  const [nuevoItem, setNuevoItem] = useState({
    id_producto: "",
    cantidad: 1,
    precio_unitario: 0,
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((x) => x.status.toLowerCase().includes(query));
  }, [q, items]);

  // 📥 CARGA DE DATOS CON TRANSFORMACIÓN
  const load = async () => {
    setLoading(true);
    try {
      const [resPedidos, resProductos, resClientes, resEmpleados] =
        await Promise.all([
          getPedidos(),
          getProductos(),
          getClientes(),
          getEmpleados(),
        ]);

      // Convertimos el formato del Backend al del Formulario
      const pedidosFormateados = resPedidos.data.map((pedido) => ({
        ...pedido,
        items: (pedido.Productos || []).map((prod) => ({
          id_producto: prod.id_producto,
          nombre_producto: prod.nombre_producto,
          cantidad: prod.Contiene?.cantidad || 0,
          precio_unitario: prod.Contiene?.precio_unitario || prod.precio,
        })),
      }));

      setItems(pedidosFormateados);
      setProductos(resProductos.data);
      setClientes(resClientes.data);
      setEmpleados(resEmpleados.data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar los datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm({ ...emptyForm, status: "Pendiente" }); // 👈 aseguramos valor inicial
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_pedido);
    setForm({
      fecha_pedido: row.fecha_pedido,
      hora_pedido: row.hora_pedido,
      status: row.status,
      id_empleado: row.id_empleado,
      id_cliente: row.id_cliente,
      descuento_total: row.descuento_total,
      impuesto_total: row.impuesto_total,
      items: row.items ?? [],
    });
    setModalOpen(true);
  };

  // ✅ Actualizar SOLO el status desde la tabla
  const updateStatus = async (row, nuevoStatus) => {
    try {
      const payload = {
        fecha_pedido: row.fecha_pedido,
        hora_pedido: row.hora_pedido,
        status: nuevoStatus,
        id_empleado: Number(row.id_empleado),
        id_cliente: Number(row.id_cliente),
        descuento_total: Number(row.descuento_total ?? 0),
        impuesto_total: Number(row.impuesto_total ?? 0),
        items: row.items ?? [],
      };

      await updatePedido(row.id_pedido, payload);

      // Actualizamos en memoria
      setItems((prev) =>
        prev.map((p) =>
          p.id_pedido === row.id_pedido ? { ...p, status: nuevoStatus } : p
        )
      );
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo actualizar el status", "error");
    }
  };

  // --- Lógica de Items (Agregar / Editar Cantidad / Eliminar) ---

  const agregarItem = () => {
    if (!nuevoItem.id_producto) {
      Swal.fire("Error", "Selecciona un producto", "error");
      return;
    }
    const cant = Number(nuevoItem.cantidad);
    if (cant <= 0) return;

    const productoInfo = productos.find(
      (p) => p.id_producto == nuevoItem.id_producto
    );
    const precio = Number(
      nuevoItem.precio_unitario || productoInfo?.precio || 0
    );

    setForm((prev) => {
      const existe = prev.items.find(
        (it) => it.id_producto == nuevoItem.id_producto
      );
      let nuevosItems;

      if (existe) {
        nuevosItems = prev.items.map((it) =>
          it.id_producto == nuevoItem.id_producto
            ? { ...it, cantidad: Number(it.cantidad) + cant }
            : it
        );
      } else {
        nuevosItems = [
          ...prev.items,
          {
            id_producto: nuevoItem.id_producto,
            cantidad: cant,
            precio_unitario: precio,
          },
        ];
      }
      return { ...prev, items: nuevosItems };
    });

    setNuevoItem({ id_producto: "", cantidad: 1, precio_unitario: 0 });
  };

  const actualizarCantidadItem = (idProd, nuevaCant) => {
    const cant = Number(nuevaCant);
    if (cant < 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id_producto === idProd ? { ...it, cantidad: cant } : it
      ),
    }));
  };

  const eliminarItem = (id) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((x) => x.id_producto !== id),
    }));
  };

  // Calcular total en tiempo real
  const totalCalculado = useMemo(() => {
    return form.items.reduce(
      (acc, it) => acc + it.cantidad * it.precio_unitario,
      0
    );
  }, [form.items]);

  // --- Guardar ---

  const save = async (e) => {
    e.preventDefault();

    if (form.items.length === 0) {
      Swal.fire("Error", "Agrega al menos un producto", "error");
      return;
    }
    if (!form.id_cliente || !form.id_empleado) {
      Swal.fire("Error", "Selecciona cliente y empleado", "error");
      return;
    }

    try {
      const payload = {
        fecha_pedido: form.fecha_pedido,
        hora_pedido: form.hora_pedido,
        status: form.status,
        id_empleado: Number(form.id_empleado),
        id_cliente: Number(form.id_cliente),
        descuento_total: Number(form.descuento_total),
        impuesto_total: Number(form.impuesto_total),
        items: form.items,
      };

      if (editingId) {
        await updatePedido(editingId, payload);
        Swal.fire("✔️ Listo", "Pedido actualizado", "success");
      } else {
        await createPedido(payload);
        Swal.fire("✔️ Listo", "Pedido creado", "success");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo guardar el pedido", "error");
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar pedido?",
      text: `Pedido #${row.id_pedido}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });
    if (!result.isConfirmed) return;
    try {
      await deletePedido(row.id_pedido);
      Swal.fire("🗑️ Eliminado", "Pedido eliminado", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>📦 Pedidos</h2>
        <button
          onClick={openCreate}
          style={{
            background: "#4F46E5",
            color: "white",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Nuevo
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por status..."
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ddd",
          }}
        />
        <button
          onClick={load}
          style={{
            background: "#f3f4f6",
            padding: "8px 14px",
            border: "1px solid #ddd",
            borderRadius: "6px",
          }}
        >
          Recargar
        </button>
      </div>

      {/* TABLA PRINCIPAL */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", color: "#555" }}>
            <tr>
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Fecha</th>
              <th style={{ padding: "10px" }}>Hora</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Cliente</th>
              <th style={{ padding: "10px" }}>Empleado</th>
              <th style={{ padding: "10px" }}>Total</th>
              <th style={{ padding: "10px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id_pedido}
                  style={{ borderTop: "1px solid #eee" }}
                >
                  <td style={{ padding: "10px" }}>{row.id_pedido}</td>
                  <td style={{ padding: "10px" }}>{row.fecha_pedido}</td>
                  <td style={{ padding: "10px" }}>{row.hora_pedido}</td>

                  {/* 👇 SELECT DE STATUS EN LA TABLA */}
                  <td style={{ padding: "10px" }}>
                    <select
                      value={row.status}
                      onChange={(e) => updateStatus(row, e.target.value)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                      }}
                    >
                      <option value="Pendiente">Pendiente</option>
                      <option value="En proceso">En proceso</option>
                      <option value="Entregado">Entregado</option>
                    </select>
                  </td>

                  <td style={{ padding: "10px" }}>
                    {row.Cliente?.nombre_cliente || `#${row.id_cliente}`}
                  </td>
                  <td style={{ padding: "10px" }}>
                    {row.Empleado?.nombre_empleado || `#${row.id_empleado}`}
                  </td>
                  <td style={{ padding: "10px" }}>
                    ${Number(row.total ?? 0).toFixed(2)}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <button
                      onClick={() => openEdit(row)}
                      style={{
                        background: "#F59E0B",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(row)}
                      style={{
                        background: "#DC2626",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "none",
                        marginLeft: "8px",
                        cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={save}
            style={{
              background: "white",
              padding: "1.5rem",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "650px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              {editingId ? "Editar pedido" : "Nuevo pedido"}
            </h3>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
              }}
            >
              <div>
                <label>Fecha:</label>
                <input
                  type="date"
                  value={form.fecha_pedido}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, fecha_pedido: e.target.value }))
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <div>
                <label>Hora:</label>
                <input
                  type="time"
                  value={form.hora_pedido}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, hora_pedido: e.target.value }))
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
              </div>
            </div>

            {/* 👇 SELECT DE STATUS EN EL MODAL */}
            <label
              style={{ display: "block", marginTop: "10px" }}
            >
              Status:
            </label>
            <select
              value={form.status}
              onChange={(e) =>
                setForm((f) => ({ ...f, status: e.target.value }))
              }
              required
              style={{
                width: "100%",
                padding: "8px",
                border: "1px solid #ddd",
                borderRadius: "4px",
              }}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="En Proceso">En proceso</option>
              <option value="Entregado">Entregado</option>
            </select>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "10px",
                marginTop: "10px",
              }}
            >
              <div>
                <label>Cliente:</label>
                <select
                  value={form.id_cliente}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id_cliente: e.target.value }))
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">-- Selecciona --</option>
                  {clientes.map((c) => (
                    <option key={c.id_cliente} value={c.id_cliente}>
                      {c.nombre_cliente}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label>Empleado:</label>
                <select
                  value={form.id_empleado}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id_empleado: e.target.value }))
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">-- Selecciona --</option>
                  {empleados.map((em) => (
                    <option
                      key={em.id_empleado}
                      value={em.id_empleado}
                    >
                      {em.nombre_empleado}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <hr
              style={{
                margin: "20px 0",
                border: "0",
                borderTop: "1px solid #eee",
              }}
            />

            {/* AGREGAR PRODUCTO */}
            <h4 style={{ marginBottom: "10px", fontWeight: 600 }}>
              Productos en el pedido
            </h4>
            <div
              style={{
                display: "flex",
                gap: "5px",
                alignItems: "flex-end",
              }}
            >
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: "0.85em" }}>Producto</label>
                <select
                  value={nuevoItem.id_producto}
                  onChange={(e) =>
                    setNuevoItem((i) => ({
                      ...i,
                      id_producto: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                >
                  <option value="">Buscar...</option>
                  {productos.map((p) => (
                    <option
                      key={p.id_producto}
                      value={p.id_producto}
                    >
                      {p.nombre_producto} ($
                      {Number(p.precio).toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: "0.85em" }}>Cant</label>
                <input
                  type="number"
                  value={nuevoItem.cantidad}
                  min="1"
                  onChange={(e) =>
                    setNuevoItem((i) => ({
                      ...i,
                      cantidad: e.target.value,
                    }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px",
                    border: "1px solid #ddd",
                    borderRadius: "4px",
                  }}
                />
              </div>
              <button
                type="button"
                onClick={agregarItem}
                style={{
                  background: "#4F46E5",
                  color: "white",
                  padding: "9px 12px",
                  borderRadius: "4px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Agregar
              </button>
            </div>

            {/* TABLA RESUMEN DE ITEMS */}
            <div
              style={{
                marginTop: "15px",
                background: "#f9fafb",
                padding: "10px",
                borderRadius: "8px",
              }}
            >
              <table
                style={{ width: "100%", fontSize: "0.9rem" }}
              >
                <thead>
                  <tr
                    style={{
                      borderBottom: "1px solid #ddd",
                    }}
                  >
                    <th style={{ textAlign: "left" }}>Producto</th>
                    <th style={{ width: "80px" }}>Cant.</th>
                    <th style={{ textAlign: "right" }}>Precio</th>
                    <th style={{ textAlign: "right" }}>
                      Subtotal
                    </th>
                    <th style={{ width: "40px" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {form.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        style={{
                          textAlign: "center",
                          padding: "10px",
                          color: "#888",
                        }}
                      >
                        Carrito vacío
                      </td>
                    </tr>
                  )}
                  {form.items.map((it) => {
                    const prodInfo = productos.find(
                      (p) => p.id_producto == it.id_producto
                    );
                    const nombreMostrar = prodInfo
                      ? prodInfo.nombre_producto
                      : it.nombre_producto || it.id_producto;

                    return (
                      <tr
                        key={it.id_producto}
                        style={{
                          borderBottom: "1px solid #eee",
                        }}
                      >
                        <td style={{ padding: "8px 0" }}>
                          {nombreMostrar}
                        </td>
                        <td>
                          <input
                            type="number"
                            value={it.cantidad}
                            min="1"
                            onChange={(e) =>
                              actualizarCantidadItem(
                                it.id_producto,
                                e.target.value
                              )
                            }
                            style={{
                              width: "60px",
                              padding: "4px",
                              borderRadius: "4px",
                              border: "1px solid #ddd",
                            }}
                          />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          $
                          {Number(
                            it.precio_unitario
                          ).toFixed(2)}
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <strong>
                            $
                            {(
                              it.cantidad *
                              it.precio_unitario
                            ).toFixed(2)}
                          </strong>
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            onClick={() =>
                              eliminarItem(it.id_producto)
                            }
                            style={{
                              color: "#DC2626",
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              fontWeight: "bold",
                            }}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div
                style={{
                  textAlign: "right",
                  marginTop: "10px",
                  fontSize: "1.1rem",
                }}
              >
                Total estimado:{" "}
                <strong>
                  ${totalCalculado.toFixed(2)}
                </strong>
              </div>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "#e5e7eb",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: "#4F46E5",
                  color: "white",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Guardar Pedido
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
