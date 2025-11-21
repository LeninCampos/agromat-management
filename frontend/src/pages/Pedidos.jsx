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
              maxWidth: "550px",
              boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              {editingId ? "Editar pedido" : "Nuevo pedido"}
            </h3>

            <label>Fecha:</label>
            <input
              type="date"
              value={form.fecha_pedido}
              onChange={(e) => setForm((f) => ({ ...f, fecha_pedido: e.target.value }))}
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>Hora:</label>
            <input
              type="time"
              value={form.hora_pedido}
              onChange={(e) => setForm((f) => ({ ...f, hora_pedido: e.target.value }))}
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>Status:</label>
            <input
              type="text"
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>ID Cliente:</label>
            <input
              type="number"
              value={form.id_cliente}
              onChange={(e) => setForm((f) => ({ ...f, id_cliente: e.target.value }))}
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>ID Empleado:</label>
            <input
              type="number"
              value={form.id_empleado}
              onChange={(e) => setForm((f) => ({ ...f, id_empleado: e.target.value }))}
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <h4 style={{ marginTop: "1rem", fontWeight: 600 }}>
              Agregar producto
            </h4>

            <select
              value={nuevoItem.id_producto}
              onChange={(e) =>
                setNuevoItem((i) => ({ ...i, id_producto: e.target.value }))
              }
              style={{ width: "100%", marginBottom: "10px" }}
            >
              <option value="">Selecciona producto</option>
              {productos.map((p) => (
                <option key={p.id_producto} value={p.id_producto}>
                  {p.nombre_producto} - ${p.precio}
                </option>
              ))}
            </select>

            <label>Cantidad:</label>
            <input
              type="number"
              value={nuevoItem.cantidad}
              onChange={(e) =>
                setNuevoItem((i) => ({ ...i, cantidad: e.target.value }))
              }
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <button
              type="button"
              onClick={agregarItem}
              style={{
                background: "#4F46E5",
                color: "white",
                padding: "6px 12px",
                borderRadius: "6px",
                border: "none",
                marginBottom: "15px",
              }}
            >
              + Agregar producto
            </button>

            <table style={{ width: "100%", marginBottom: "10px" }}>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cant</th>
                  <th>Precio</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((it) => (
                  <tr key={it.id_producto}>
                    <td>{it.id_producto}</td>
                    <td>{it.cantidad}</td>
                    <td>${it.precio_unitario}</td>
                    <td>
                      <button
                        type="button"
                        onClick={() => eliminarItem(it.id_producto)}
                        style={{
                          background: "#DC2626",
                          color: "white",
                          padding: "3px 8px",
                          borderRadius: "6px",
                          border: "none",
                        }}
                      >
                        X
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* BOTONES FINALES */}
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "#e5e7eb",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "none",
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
                }}
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
