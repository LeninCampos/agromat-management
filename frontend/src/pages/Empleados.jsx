import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getEmpleados,
  createEmpleado,
  updateEmpleado,
  deleteEmpleado,
} from "../api/empleados";

const emptyForm = {
  nombre_empleado: "",
  numero_empleado: "",
  correo: "",
  fecha_alta: "",
  password: "",
};

export default function Empleados() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // 🔎 FILTRO
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;

    return items.filter(
      (x) =>
        x.nombre_empleado?.toLowerCase().includes(query) ||
        x.numero_empleado?.toLowerCase().includes(query) ||
        x.correo?.toLowerCase().includes(query)
    );
  }, [q, items]);

  // 📦 Cargar empleados
  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getEmpleados();
      setItems(data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar los empleados", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ➕ Nuevo
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ✏ Editar
  const openEdit = (row) => {
    setEditingId(row.id_empleado);
    setForm({
      nombre_empleado: row.nombre_empleado ?? "",
      numero_empleado: row.numero_empleado ?? "",
      correo: row.correo ?? "",
      fecha_alta: row.fecha_alta ?? "",
    });
    setModalOpen(true);
  };

  // 💾 Guardar
  const save = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        nombre_empleado: form.nombre_empleado,
        numero_empleado: form.numero_empleado,
        correo: form.correo,
        fecha_alta: form.fecha_alta,
        ...(form.password ? { password: form.password } : {}),
      };

      if (editingId) {
        await updateEmpleado(editingId, payload);
        Swal.fire("✔️ Listo", "Empleado actualizado", "success");
      } else {
        await createEmpleado(payload);
        Swal.fire("✔️ Listo", "Empleado creado", "success");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude guardar el empleado", "error");
    }
  };

  // 🗑 Eliminar
  const remove = async (row) => {
    const confirm = await Swal.fire({
      title: "¿Eliminar empleado?",
      text: row.nombre_empleado,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirm.isConfirmed) return;

    try {
      await deleteEmpleado(row.id_empleado);
      Swal.fire("🗑 Eliminado", "Empleado eliminado", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar el empleado", "error");
    }
  };

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>👤 Empleados</h2>
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
          placeholder="Buscar por nombre, número o correo…"
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
              <th style={{ padding: "10px" }}>Nombre</th>
              <th style={{ padding: "10px" }}>Número</th>
              <th style={{ padding: "10px" }}>Correo</th>
              <th style={{ padding: "10px" }}>Fecha Alta</th>
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
                <tr key={row.id_empleado} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.id_empleado}</td>
                  <td style={{ padding: "10px" }}>{row.nombre_empleado}</td>
                  <td style={{ padding: "10px" }}>{row.numero_empleado}</td>
                  <td style={{ padding: "10px" }}>{row.correo}</td>
                  <td style={{ padding: "10px" }}>{row.fecha_alta}</td>

                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
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
              maxWidth: "480px",
              boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              {editingId ? "Editar empleado" : "Nuevo empleado"}
            </h3>

            <label>Nombre:</label>
            <input
              type="text"
              value={form.nombre_empleado}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre_empleado: e.target.value }))
              }
              required
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>Número empleado:</label>
            <input
              type="text"
              value={form.numero_empleado}
              onChange={(e) =>
                setForm((f) => ({ ...f, numero_empleado: e.target.value }))
              }
              style={{ width: "100%", marginBottom: "10px" }}
            />

            <label>Correo:</label>
            <input
              type="email"
              value={form.correo}
              onChange={(e) =>
                setForm((f) => ({ ...f, correo: e.target.value }))
              }
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Contraseña:</label>
            <input
              type="password"
              value={form.password || ""}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              placeholder={editingId ? "Dejar en blanco para no cambiar" : "Mínimo 6 caracteres"}
              required={!editingId}
              style={{ width: "100%", marginBottom: "10px" }}
            />
            <label>Fecha alta:</label>
            <input
              type="date"
              value={form.fecha_alta}
              onChange={(e) =>
                setForm((f) => ({ ...f, fecha_alta: e.target.value }))
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
                  background: "#f9fafb",
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
