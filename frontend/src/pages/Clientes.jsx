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

  // 🔍 filtro rápido
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (x) =>
        x.nombre_cliente?.toLowerCase().includes(query) ||
        x.correo?.toLowerCase().includes(query)
    );
  }, [q, items]);

  // 📦 cargar clientes
const load = async () => {
  setLoading(true);
  try {
    const { data } = await getClientes();

    const normalizados = data.map((c) => ({
      id_cliente: c.id_cliente,
      nombre_cliente: c.nombre_cliente,
      correo: c.correo || c.correo_cliente || "",  // 🔥 FIX
      telefono: c.telefono,
      direccion: c.direccion,
    }));

    setItems(normalizados);
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

  // ➕ nuevo
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ✏️ editar
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

  // 💾 guardar
  const save = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        nombre_cliente: form.nombre_cliente,
        correo: form.correo || null,
        telefono: form.telefono || null,
        direccion: form.direccion || null,
      };

      if (editingId) {
        await updateCliente(editingId, payload);
        Swal.fire("✅ Listo", "Cliente actualizado correctamente", "success");
      } else {
        await createCliente(payload);
        Swal.fire("✅ Listo", "Cliente creado correctamente", "success");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      console.error(e);

      // si viene de express-validator mostramos mensaje bonito
      if (e.response?.status === 400 && e.response.data?.errors) {
        const mensajes = e.response.data.errors
          .map((err) => `• ${err.mensaje}`)
          .join("<br>");
        Swal.fire({
          icon: "error",
          title: "Datos inválidos",
          html: mensajes,
        });
      } else {
        Swal.fire("Error", "No pude guardar el cliente", "error");
      }
    }
  };

  // 🗑️ eliminar
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
      Swal.fire("🗑️ Eliminado", "Cliente eliminado con éxito", "success");
      await load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar el cliente", "error");
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

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
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
            background: "#f3f4f6",
            padding: "8px 14px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          Recargar
        </button>
      </div>

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
              <th style={{ padding: "10px", width: "50px" }}>ID</th>
              <th style={{ padding: "10px", width: "220px" }}>Nombre</th>
              <th style={{ padding: "10px", width: "220px" }}>Correo</th>
              <th style={{ padding: "10px", width: "160px" }}>Teléfono</th>
              <th style={{ padding: "10px" }}>Dirección</th>
              <th style={{ padding: "10px", textAlign: "center" }}>Acciones</th>
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
                <tr
                  key={row.id_cliente}
                  style={{ borderTop: "1px solid #eee" }}
                >
                  <td style={{ padding: "10px" }}>{row.id_cliente}</td>
                  <td style={{ padding: "10px" }}>{row.nombre_cliente}</td>
                  <td style={{ padding: "10px" }}>{row.correo}</td>
                  <td style={{ padding: "10px" }}>{row.telefono}</td>
                  <td
                    style={{
                      padding: "10px",
                      wordBreak: "break-word",
                      maxWidth: "300px",
                    }}
                  >
                    {row.direccion}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
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
                          cursor: "pointer",
                        }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
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
              maxWidth: "520px",
              boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              {editingId ? "Editar cliente" : "Nuevo cliente"}
            </h3>

            <label style={{ display: "block", marginBottom: "10px" }}>
              <span>Nombre:</span>
              <input
                type="text"
                value={form.nombre_cliente}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre_cliente: e.target.value }))
                }
                required
                style={{ width: "100%" }}
              />
            </label>

            <label style={{ display: "block", marginBottom: "10px" }}>
              <span>Correo:</span>
              <input
                type="email"
                value={form.correo}
                onChange={(e) =>
                  setForm((f) => ({ ...f, correo: e.target.value }))
                }
                style={{ width: "100%" }}
              />
            </label>

            <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
              <label style={{ flex: 1 }}>
                <span>Teléfono:</span>
                <input
                  type="text"
                  value={form.telefono}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, telefono: e.target.value }))
                  }
                  style={{ width: "100%" }}
                />
              </label>

              <label style={{ flex: 1 }}>
                <span>Dirección:</span>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, direccion: e.target.value }))
                  }
                  style={{ width: "100%" }}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "15px",
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  background: "#f9fafb",
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
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
