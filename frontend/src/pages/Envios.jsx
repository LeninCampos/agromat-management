// src/pages/Envios.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getEnvios,
  createEnvio,
  updateEnvio,
  deleteEnvio,
} from "../api/envios";

const emptyForm = {
  codigo: "",
  id_pedido: "",
  id_empleado_responsable: "",
  status: "EN_PREPARACION",
  fecha_entrega: "",
  observaciones: "",
  url_imagen: "" // 👈 NUEVO
};

export default function Envios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // 🔍 Filtro rápido
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;

    return items.filter((x) =>
      x.codigo?.toLowerCase().includes(query) ||
      x.status?.toLowerCase().includes(query)
    );
  }, [q, items]);

  // 📦 Cargar envíos
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getEnvios();
      setItems(data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar los envíos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ➕ Nuevo envío
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ✏️ Editar envío
  const openEdit = (row) => {
    setEditingId(row.id_envio);
    setForm({
      codigo: row.codigo ?? "",
      id_pedido: row.id_pedido ?? "",
      id_empleado_responsable: row.id_empleado_responsable ?? "",
      status: row.status ?? "EN_PREPARACION",
      fecha_entrega: row.fecha_entrega ?? "",
      observaciones: row.observaciones ?? "",
      url_imagen: row.url_imagen ?? "" // 👈 YA SE MUESTRA
    });
    setModalOpen(true);
  };

  // 💾 Guardar envío
  const save = async (e) => {
    e.preventDefault();

    const payload = {
      codigo: form.codigo,
      id_pedido: Number(form.id_pedido),
      id_empleado_responsable: Number(form.id_empleado_responsable),
      status: form.status,
      fecha_entrega: form.fecha_entrega || null,
      observaciones: form.observaciones || null,
      url_imagen: form.url_imagen || null // 👈 SE GUARDA
    };

    try {
      if (editingId) {
        await updateEnvio(editingId, payload);
        Swal.fire("✔️ Listo", "Envío actualizado", "success");
      } else {
        await createEnvio(payload);
        Swal.fire("✔️ Listo", "Envío creado", "success");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude guardar el envío", "error");
    }
  };

  // ❌ Eliminar
  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar envío?",
      text: `#${row.codigo}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteEnvio(row.id_envio);
      Swal.fire("🗑️ Eliminado", "Envío eliminado", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar el envío", "error");
    }
  };

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>📦 Envíos</h2>

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
          placeholder="Buscar por código o status…"
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
            padding: "8px 14px",
            background: "#f3f4f6",
            borderRadius: "6px",
            border: "1px solid #ddd",
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
              <th style={{ padding: "10px" }}>Código</th>
              <th style={{ padding: "10px" }}>Pedido</th>
              <th style={{ padding: "10px" }}>Responsable</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Imagen</th>
              <th style={{ padding: "10px" }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id_envio} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.codigo}</td>
                  <td style={{ padding: "10px" }}>#{row.id_pedido}</td>
                  <td style={{ padding: "10px" }}>#{row.id_empleado_responsable}</td>
                  <td style={{ padding: "10px" }}>{row.status}</td>

                  <td style={{ padding: "10px" }}>
                    {row.url_imagen ? (
                      <a href={row.url_imagen} target="_blank" rel="noreferrer">
                        🖼️ Ver
                      </a>
                    ) : (
                      "—"
                    )}
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
                        marginRight: "8px",
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
            zIndex: 50,
          }}
        >
          <form
            onSubmit={save}
            style={{
              background: "white",
              padding: "1.5rem",
              borderRadius: "12px",
              width: "100%",
              maxWidth: "500px",
              boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ marginBottom: "1rem", fontSize: "1.2rem" }}>
              {editingId ? "Editar envío" : "Nuevo envío"}
            </h3>

            <label>Código:</label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))}
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>ID Pedido:</label>
            <input
              type="number"
              value={form.id_pedido}
              onChange={(e) => setForm((f) => ({ ...f, id_pedido: e.target.value }))}
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>ID Responsable:</label>
            <input
              type="number"
              value={form.id_empleado_responsable}
              onChange={(e) =>
                setForm((f) => ({ ...f, id_empleado_responsable: e.target.value }))
              }
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>Status:</label>
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))}
              style={{ width: "100%", marginBottom: "10px" }}
            >
              <option value="EN_PREPARACION">EN_PREPARACION</option>
              <option value="EN_TRANSITO">EN_TRANSITO</option>
              <option value="ENTREGADO">ENTREGADO</option>
              <option value="CANCELADO">CANCELADO</option>
            </select>

            <label>URL Imagen:</label>
            <input
              type="text"
              value={form.url_imagen}
              onChange={(e) =>
                setForm((f) => ({ ...f, url_imagen: e.target.value }))
              }
              placeholder="https://example.com/imagen.jpg"
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>Observaciones:</label>
            <textarea
              value={form.observaciones}
              onChange={(e) =>
                setForm((f) => ({ ...f, observaciones: e.target.value }))
              }
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
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
