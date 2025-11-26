// src/pages/Zonas.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { getZonas, createZona, updateZona, deleteZona } from "../api/zonas";

const emptyForm = {
  nombre: "",
  numero: "",
  descripcion: "",
};

export default function Zonas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingKey, setEditingKey] = useState(null);

  // 🔍 Filtrar
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;

    return items.filter(
      (z) =>
        z.nombre.toLowerCase().includes(query) ||
        z.descripcion.toLowerCase().includes(query)
    );
  }, [q, items]);

  // 📌 Cargar datos REAL API
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getZonas();

      // Normalizamos usando key interno, porque NO hay id real
      const normalizados = data.map((z, index) => ({
        key: index + 1,
        nombre: z.nombre,
        numero: z.numero,
        descripcion: z.descripcion,
      }));

      setItems(normalizados);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar las zonas", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ➕ Nueva
  const openCreate = () => {
    setEditingKey(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ✏️ Editar
  const openEdit = (row) => {
    setEditingKey(row.key);
    setForm({
      nombre: row.nombre,
      numero: row.numero,
      descripcion: row.descripcion,
    });
    setModalOpen(true);
  };

  // 💾 Guardar
  const save = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        nombre: form.nombre,
        numero: Number(form.numero),
        descripcion: form.descripcion,
      };

      if (editingKey) {
        await updateZona(editingKey, payload);
        Swal.fire("✔️ Listo", "Zona actualizada", "success");
      } else {
        await createZona(payload);
        Swal.fire("✔️ Listo", "Zona creada", "success");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingKey(null);
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude guardar la zona", "error");
    }
  };

  // ❌ Eliminar
  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar zona?",
      text: `${row.nombre} (#${row.numero})`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteZona(row.key); // por ahora usamos key
      Swal.fire("🗑️ Eliminado", "Zona eliminada", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar la zona", "error");
    }
  };

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>🗺️ Zonas</h2>

        <button
          onClick={openCreate}
          style={{
            background: "#4F46E5",
            color: "white",
            padding: "8px 14px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            fontWeight: 500,
          }}
        >
          + Nueva
        </button>
      </div>

      {/* BUSCADOR */}
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar zonas…"
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            fontSize: "0.9rem",
          }}
        />
        <button
          onClick={load}
          style={{
            background: "#f3f4f6",
            padding: "8px 14px",
            border: "1px solid #e5e7eb",
            borderRadius: "999px",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          Recargar
        </button>
      </div>

      {/* TABLA */}
      <div
        style={{
          marginTop: "0.75rem",
          background: "white",
          borderRadius: "16px",
          boxShadow: "0 12px 30px rgba(15,23,42,0.08)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#f9fafb", color: "#6b7280" }}>
              <th style={{ padding: "12px 16px", fontSize: "0.8rem" }}>
                Número
              </th>
              <th style={{ padding: "12px 16px", fontSize: "0.8rem" }}>
                Nombre
              </th>
              <th style={{ padding: "12px 16px", fontSize: "0.8rem" }}>
                Descripción
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  fontSize: "0.8rem",
                  textAlign: "center",
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={4} style={{ textAlign: "center", padding: "20px" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.key} style={{ borderTop: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "10px 16px", fontSize: "0.9rem" }}>
                    {row.numero}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: "0.9rem" }}>
                    {row.nombre}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: "0.9rem" }}>
                    {row.descripcion}
                  </td>

                  <td style={{ padding: "10px 16px", textAlign: "center" }}>
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
                          padding: "5px 12px",
                          borderRadius: "999px",
                          border: "none",
                          fontSize: "0.8rem",
                        }}
                      >
                        Editar
                      </button>

                      <button
                        onClick={() => remove(row)}
                        style={{
                          background: "#DC2626",
                          color: "white",
                          padding: "5px 12px",
                          borderRadius: "999px",
                          border: "none",
                          fontSize: "0.8rem",
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

      {/* MODAL */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={save}
            style={{
              background: "white",
              padding: "1.75rem",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "520px",
              boxShadow: "0 20px 45px rgba(15,23,42,0.35)",
            }}
          >
            <h3
              style={{
                fontSize: "1.25rem",
                fontWeight: 600,
                marginBottom: "1rem",
              }}
            >
              {editingKey ? "Editar zona" : "Nueva zona"}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                  }}
                >
                  Nombre de la zona
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, nombre: e.target.value }))
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                  }}
                >
                  Número de zona
                </label>
                <input
                  type="number"
                  value={form.numero}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, numero: e.target.value }))
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    color: "#6b7280",
                    marginBottom: "0.25rem",
                  }}
                >
                  Descripción
                </label>
                <input
                  type="text"
                  value={form.descripcion}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, descripcion: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.9rem",
                  }}
                />
              </div>
            </div>

            {/* BOTONES */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "1.25rem",
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "999px",
                  border: "1px solid #e5e7eb",
                  background: "#f9fafb",
                  fontSize: "0.9rem",
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
                  padding: "8px 18px",
                  borderRadius: "999px",
                  border: "none",
                  fontSize: "0.9rem",
                  fontWeight: 500,
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
