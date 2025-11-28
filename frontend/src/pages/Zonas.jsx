// frontend/src/pages/Zonas.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { getZonas, createZona, updateZona, deleteZona } from "../api/zonas";

const emptyForm = {
  rack: "",
  modulo: "",
  piso: "",
  descripcion: "",
};

export default function Zonas() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null); // id_zona

  // 🔍 Filtrado
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;

    return items.filter((z) => {
      const rackStr = z.rack?.toString().toLowerCase() ?? "";
      const moduloStr = z.modulo?.toString().toLowerCase() ?? "";
      const pisoStr = z.piso?.toString().toLowerCase() ?? "";
      const codigoStr = z.codigo?.toString().toLowerCase() ?? "";
      const descStr = z.descripcion?.toLowerCase() ?? "";

      return (
        rackStr.includes(query) ||
        moduloStr.includes(query) ||
        pisoStr.includes(query) ||
        codigoStr.includes(query) ||
        descStr.includes(query)
      );
    });
  }, [q, items]);

  // 📌 Cargar datos reales desde API
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getZonas();
      // el backend ya regresa: id_zona, rack, modulo, piso, codigo, descripcion
      setItems(data);
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
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ✏️ Editar
  const openEdit = (row) => {
    setEditingId(row.id_zona);
    setForm({
      rack: row.rack ?? "",
      modulo: row.modulo ?? "",
      piso: row.piso ?? "",
      descripcion: row.descripcion ?? "",
    });
    setModalOpen(true);
  };

  // 💾 Guardar
  const save = async (e) => {
    e.preventDefault();

    if (!form.rack || !form.modulo || !form.piso) {
      Swal.fire(
        "Datos incompletos",
        "Selecciona rack, módulo y piso",
        "warning"
      );
      return;
    }

    try {
      const payload = {
        rack: form.rack,
        modulo: Number(form.modulo),
        piso: Number(form.piso),
        descripcion: form.descripcion || "",
        // codigo no es necesario mandarlo; el backend puede generarlo
      };

      if (editingId) {
        await updateZona(form.id_zona, payload); // PUT /zonas/:id_zona
        Swal.fire("✔️ Listo", "Zona actualizada", "success");
      } else {
        await createZona(payload); // POST /zonas
        Swal.fire("✔️ Listo", "Zona creada", "success");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
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
      text: `Rack ${row.rack} · Módulo ${row.modulo} · Piso ${row.piso}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteZona(row.id_zona); // DELETE /zonas/:id_zona
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
          placeholder="Buscar por código, rack, módulo, piso o descripción…"
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
                Código
              </th>
              <th style={{ padding: "12px 16px", fontSize: "0.8rem" }}>
                Rack
              </th>
              <th style={{ padding: "12px 16px", fontSize: "0.8rem" }}>
                Módulo
              </th>
              <th style={{ padding: "12px 16px", fontSize: "0.8rem" }}>
                Piso
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
                  key={row.id_zona}
                  style={{ borderTop: "1px solid #f3f4f6" }}
                >
                  <td style={{ padding: "10px 16px", fontSize: "0.9rem" }}>
                    {row.codigo}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: "0.9rem" }}>
                    {row.rack}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: "0.9rem" }}>
                    {row.modulo}
                  </td>
                  <td style={{ padding: "10px 16px", fontSize: "0.9rem" }}>
                    {row.piso}
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
                          padding: "5px 12px",
                          borderRadius: "999px",
                          border: "none",
                          fontSize: "0.8rem",
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
              {editingId ? "Editar zona" : "Nueva zona"}
            </h3>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {/* Rack */}
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
                  Rack
                </label>
                <select
                  value={form.rack}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, rack: e.target.value }))
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.9rem",
                  }}
                >
                  <option value="">Selecciona un rack…</option>
                  <option value="A">Rack A</option>
                  <option value="B">Rack B</option>
                  <option value="C">Rack C</option>
                  <option value="D">Rack D</option>
                </select>
              </div>

              {/* Módulo */}
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
                  Módulo
                </label>
                <input
                  type="number"
                  value={form.modulo}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, modulo: e.target.value }))
                  }
                  required
                  min="1"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              {/* Piso */}
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
                  Piso
                </label>
                <input
                  type="number"
                  value={form.piso}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, piso: e.target.value }))
                  }
                  required
                  min="1"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid #e5e7eb",
                    fontSize: "0.9rem",
                  }}
                />
              </div>

              {/* Descripción */}
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
                    setForm((f) => ({
                      ...f,
                      descripcion: e.target.value,
                    }))
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
