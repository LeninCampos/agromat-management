// src/pages/Clientes.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
} from "../api/clientes";

const emptyForm = {
  nombre_cliente: "",
  correo: "",
  telefono: "",
  direccion: "",
};

export default function Clientes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // 🔍 FILTRO
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;

    return items.filter(
      (x) =>
        x.nombre_cliente?.toLowerCase().includes(query) ||
        x.correo?.toLowerCase().includes(query)
    );
  }, [q, items]);

  // 📦 CARGAR CLIENTES
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getClientes();
      setItems(data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar los clientes", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ➕ NUEVO
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ✏️ EDITAR
  const openEdit = (row) => {
    setEditingId(row.id_cliente);
    setForm({
      nombre_cliente: row.nombre_cliente ?? "",
      correo: row.correo ?? "",
      telefono: row.telefono ?? "",
      direccion: row.direccion ?? "",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    const payload = {
      nombre_cliente: form.nombre_cliente,
      correo_cliente: form.correo || null,
      telefono: form.telefono || null,
      direccion: form.direccion || null,
    };

    try {
      if (editingId) {
        await updateCliente(editingId, payload);
        Swal.fire("✔️ Listo", "Cliente actualizado", "success");
      } else {
        await createCliente(payload);
        Swal.fire("✔️ Listo", "Cliente creado", "success");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude guardar el cliente", "error");
    }
  };

  // ❌ ELIMINAR
  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar cliente?",
      text: row.nombre_cliente,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteCliente(row.id_cliente);
      Swal.fire("🗑️ Eliminado", "Cliente eliminado", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  // 🧱 UI
  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>👥 Clientes</h2>

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
          placeholder="Buscar por nombre o correo…"
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
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Nombre</th>
              <th style={{ padding: "10px" }}>Correo</th>
              <th style={{ padding: "10px" }}>Teléfono</th>
              <th style={{ padding: "10px" }}>Dirección</th>
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
                <tr key={row.id_cliente} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.id_cliente}</td>
                  <td style={{ padding: "10px" }}>{row.nombre_cliente}</td>
                  <td style={{ padding: "10px" }}>{row.correo}</td>
                  <td style={{ padding: "10px" }}>{row.telefono}</td>
                  <td style={{ padding: "10px" }}>{row.direccion}</td>

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

      {/* MODAL moderno Clientes */}
      {modalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card">
            <div className="agromat-modal-header">
              <div>
                <h2>{editingId ? "Editar cliente" : "Nuevo cliente"}</h2>
                <p>
                  {editingId
                    ? "Modifica los datos del cliente."
                    : "Completa los datos para registrar un nuevo cliente."}
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
              <div className="agromat-form-grid">
                {/* Nombre */}
                <div className="agromat-form-field agromat-full-row">
                  <label>Nombre</label>
                  <input
                    type="text"
                    value={form.nombre_cliente}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        nombre_cliente: e.target.value,
                      }))
                    }
                    required
                    className="agromat-input"
                    placeholder="Ej. Juan Pérez"
                  />
                </div>

                {/* Correo */}
                <div className="agromat-form-field agromat-full-row">
                  <label>Correo</label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, correo: e.target.value }))
                    }
                    className="agromat-input"
                    placeholder="cliente@ejemplo.com"
                  />
                </div>

                {/* Teléfono */}
                <div className="agromat-form-field">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, telefono: e.target.value }))
                    }
                    className="agromat-input"
                    placeholder="818 000 0000"
                  />
                </div>

                {/* Dirección */}
                <div className="agromat-form-field agromat-full-row">
                  <label>Dirección</label>
                  <textarea
                    value={form.direccion}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, direccion: e.target.value }))
                    }
                    className="agromat-textarea"
                    rows={2}
                    placeholder="Calle, número, colonia, ciudad"
                  />
                </div>
              </div>

              <div className="agromat-modal-footer">
                <button
                  type="button"
                  className="agromat-btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="agromat-btn-primary">
                  Guardar cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
