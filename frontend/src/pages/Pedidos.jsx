import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getPedidos,
  createPedido,
  updatePedido,
  deletePedido,
} from "../api/pedidos";
import { getProductos } from "../api/productos";

const emptyForm = {
  fecha_pedido: "",
  hora_pedido: "",
  status: "",
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

  const [productos, setProductos] = useState([]);

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

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getPedidos();
      setItems(data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar los pedidos", "error");
    } finally {
      setLoading(false);
    }
  };

  const loadProductos = async () => {
    try {
      const { data } = await getProductos();
      setProductos(data);
    } catch (e) {
      console.error("Error cargando productos: ", e);
    }
  };

  useEffect(() => {
    load();
    loadProductos();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
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

  const agregarItem = () => {
    if (!nuevoItem.id_producto) {
      Swal.fire("Error", "Selecciona un producto", "error");
      return;
    }

    const producto = productos.find(
      (p) => p.id_producto == nuevoItem.id_producto
    );

    const itemFinal = {
      id_producto: producto.id_producto,
      cantidad: Number(nuevoItem.cantidad),
      precio_unitario: Number(nuevoItem.precio_unitario || producto.precio),
    };

    setForm((f) => ({
      ...f,
      items: [...f.items, itemFinal],
    }));

    setNuevoItem({ id_producto: "", cantidad: 1, precio_unitario: 0 });
  };

  const eliminarItem = (id) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((x) => x.id_producto !== id),
    }));
  };

  const save = async (e) => {
    e.preventDefault();

    if (form.items.length === 0) {
      Swal.fire("Error", "Agrega al menos un producto", "error");
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

      Swal.fire(
        "Error",
        "No se pudo guardar el pedido (probablemente falta login)",
        "error"
      );
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
      {/* HEADER */}
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

      {/* BUSCADOR */}
      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por status…"
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

      {/* TABLA */}
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
                <td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id_pedido} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.id_pedido}</td>
                  <td style={{ padding: "10px" }}>{row.fecha_pedido}</td>
                  <td style={{ padding: "10px" }}>{row.hora_pedido}</td>
                  <td style={{ padding: "10px" }}>{row.status}</td>
                  <td style={{ padding: "10px" }}>#{row.id_cliente}</td>
                  <td style={{ padding: "10px" }}>#{row.id_empleado}</td>
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

      {/* MODAL moderno */}
      {modalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card" style={{ maxWidth: "720px" }}>
            <div className="agromat-modal-header">
              <div>
                <h2>{editingId ? "Editar pedido" : "Nuevo pedido"}</h2>
                <p>
                  {editingId
                    ? "Actualiza la información del pedido."
                    : "Registra un nuevo pedido con sus productos y cantidades."}
                </p>
              </div>
              <button
                type="button"
                className="agromat-modal-close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={save} className="agromat-modal-body">
              {/* Datos generales del pedido */}
              <div className="agromat-form-grid">
                {/* Fecha */}
                <div className="agromat-form-field">
                  <label>Fecha</label>
                  <input
                    type="date"
                    className="agromat-input"
                    value={form.fecha_pedido}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        fecha_pedido: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                {/* Hora */}
                <div className="agromat-form-field">
                  <label>Hora</label>
                  <input
                    type="time"
                    className="agromat-input"
                    value={form.hora_pedido}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        hora_pedido: e.target.value,
                      }))
                    }
                    required
                  />
                </div>

                {/* Status */}
                <div className="agromat-form-field agromat-full-row">
                  <label>Status</label>
                  <input
                    type="text"
                    className="agromat-input"
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    placeholder="Pendiente, En proceso, Completado…"
                    required
                  />
                </div>

                {/* Cliente */}
                <div className="agromat-form-field">
                  <label>ID Cliente</label>
                  <input
                    type="number"
                    className="agromat-input"
                    value={form.id_cliente}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id_cliente: e.target.value }))
                    }
                    placeholder="ID del cliente"
                    required
                  />
                </div>

                {/* Empleado */}
                <div className="agromat-form-field">
                  <label>ID Empleado</label>
                  <input
                    type="number"
                    className="agromat-input"
                    value={form.id_empleado}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id_empleado: e.target.value }))
                    }
                    placeholder="ID del empleado"
                    required
                  />
                </div>
              </div>

              {/* Sección de productos del pedido */}
              <div
                style={{
                  marginTop: "18px",
                  padding: "14px 14px 10px",
                  borderRadius: "14px",
                  border: "1px solid #e5e7eb",
                  background: "#eef2ff", // 💜 más contraste
                }}
              >
                <h4
                  style={{
                    margin: "0 0 10px",
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  Agregar producto
                </h4>

                <div className="agromat-form-grid">
                  {/* Select producto */}
                  <div className="agromat-form-field agromat-full-row">
                    <label>Producto</label>
                    <select
                      className="agromat-select"
                      value={nuevoItem.id_producto}
                      onChange={(e) =>
                        setNuevoItem((i) => ({
                          ...i,
                          id_producto: e.target.value,
                        }))
                      }
                    >
                      <option value="">Selecciona producto</option>
                      {productos.map((p) => (
                        <option key={p.id_producto} value={p.id_producto}>
                          {p.nombre_producto} (${Number(p.precio).toFixed(2)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Cantidad */}
                  <div className="agromat-form-field">
                    <label>Cantidad</label>
                    <input
                      type="number"
                      className="agromat-input"
                      min="1"
                      value={nuevoItem.cantidad}
                      onChange={(e) =>
                        setNuevoItem((i) => ({
                          ...i,
                          cantidad: e.target.value,
                        }))
                      }
                    />
                  </div>

                  {/* Precio unitario */}
                  <div className="agromat-form-field">
                    <label>Precio unitario</label>
                    <input
                      type="number"
                      className="agromat-input"
                      min="0"
                      step="0.01"
                      value={nuevoItem.precio_unitario}
                      onChange={(e) =>
                        setNuevoItem((i) => ({
                          ...i,
                          precio_unitario: e.target.value,
                        }))
                      }
                      placeholder="Si lo dejas vacío usa el precio del producto"
                    />
                  </div>

                  <div
                    className="agromat-form-field"
                    style={{ alignSelf: "flex-end" }}
                  >
                    <button
                      type="button"
                      className="agromat-btn-primary"
                      onClick={agregarItem}
                    >
                      + Agregar producto
                    </button>
                  </div>
                </div>

                {/* Tabla de productos agregados */}
                <div
                  style={{
                    marginTop: "14px",
                    background: "white",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <table
                    style={{ width: "100%", borderCollapse: "collapse" }}
                  >
                    <thead style={{ background: "#f3f4f6", fontSize: "0.8rem" }}>
                      <tr>
                        <th
                          style={{ padding: "8px 10px", textAlign: "left" }}
                        >
                          Producto
                        </th>
                        <th
                          style={{ padding: "8px 10px", textAlign: "center" }}
                        >
                          Cant.
                        </th>
                        <th
                          style={{ padding: "8px 10px", textAlign: "right" }}
                        >
                          Precio
                        </th>
                        <th
                          style={{ padding: "8px 10px", textAlign: "center" }}
                        >
                          Acción
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {form.items.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            style={{
                              padding: "10px",
                              textAlign: "center",
                              fontSize: "0.8rem",
                              color: "#9ca3af",
                            }}
                          >
                            Aún no has agregado productos a este pedido.
                          </td>
                        </tr>
                      ) : (
                        form.items.map((it) => (
                          <tr
                            key={it.id_producto}
                            style={{ borderTop: "1px solid #e5e7eb" }}
                          >
                            <td style={{ padding: "8px 10px" }}>
                              {productos.find(
                                (p) => p.id_producto == it.id_producto
                              )?.nombre_producto || `ID ${it.id_producto}`}
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                textAlign: "center",
                              }}
                            >
                              {it.cantidad}
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                textAlign: "right",
                              }}
                            >
                              ${Number(it.precio_unitario).toFixed(2)}
                            </td>
                            <td
                              style={{
                                padding: "8px 10px",
                                textAlign: "center",
                              }}
                            >
                              <button
                                type="button"
                                className="agromat-btn-secondary"
                                onClick={() => eliminarItem(it.id_producto)}
                              >
                                Quitar
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Footer botones */}
              <div className="agromat-modal-footer">
                <button
                  type="button"
                  className="agromat-btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="agromat-btn-primary">
                  Guardar pedido
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
