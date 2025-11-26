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
  id_producto: "",
  cantidad: 1,
  status: "EN_PREPARACION",
  observaciones: "",
};

export default function Envios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // 🔍 Filtro por código o status
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (x) =>
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
      codigo: row.codigo,
      id_pedido: row.id_pedido,
      id_empleado_responsable: row.id_empleado_responsable,
      id_producto: "", // para editar detalles sería otro flujo
      cantidad: 1,
      status: row.status,
      observaciones: row.observaciones ?? "",
    });
    setModalOpen(true);
  };

  // 💾 Guardar
  const save = async (e) => {
    e.preventDefault();

    const payloadCreate = {
      codigo: form.codigo,
      id_pedido: Number(form.id_pedido),
      id_empleado_responsable: Number(form.id_empleado_responsable),
      status: form.status,
      observaciones: form.observaciones,
      detalles: [
        {
          id_producto: form.id_producto,
          cantidad: Number(form.cantidad),
        },
      ],
    };

    const payloadUpdate = {
      status: form.status,
      id_empleado_responsable: Number(form.id_empleado_responsable),
      observaciones: form.observaciones,
    };

    try {
      if (editingId) {
        await updateEnvio(editingId, payloadUpdate);
        Swal.fire("✔️", "Envío actualizado", "success");
      } else {
        await createEnvio(payloadCreate);
        Swal.fire("✔️", "Envío creado", "success");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (e) {
      console.error("ERROR:", e);
      Swal.fire(
        "Error",
        JSON.stringify(e.response?.data || "No pude guardar"),
        "error"
      );
    }
  };

  // 🗑 Eliminar
  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar envío?",
      text: `Código: ${row.codigo}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteEnvio(row.id_envio);
      Swal.fire("✔️", "Envío eliminado", "success");
      load();
    } catch (e) {
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  const getStatusBadgeStyle = (status) => {
    const base = {
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: "999px",
      fontSize: "0.75rem",
      fontWeight: 500,
    };

    switch (status) {
      case "EN_PREPARACION":
        return {
          ...base,
          background: "rgba(59,130,246,0.1)",
          color: "#1d4ed8",
        };
      case "EN_CAMINO":
        return {
          ...base,
          background: "rgba(245,158,11,0.1)",
          color: "#b45309",
        };
      case "ENTREGADO":
        return {
          ...base,
          background: "rgba(22,163,74,0.1)",
          color: "#15803d",
        };
      case "CANCELADO":
        return {
          ...base,
          background: "rgba(239,68,68,0.1)",
          color: "#b91c1c",
        };
      default:
        return {
          ...base,
          background: "rgba(107,114,128,0.1)",
          color: "#374151",
        };
    }
  };

  // 🧱 UI
  return (
    <div style={{ padding: "1.5rem" }}>
      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>📦 Envíos</h2>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", marginTop: 4 }}>
            Administra los envíos generados a partir de pedidos.
          </p>
        </div>
        <button
          onClick={openCreate}
          style={{
            background: "linear-gradient(135deg,#4F46E5,#6366F1)",
            color: "white",
            padding: "8px 16px",
            borderRadius: "999px",
            border: "none",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: 500,
            boxShadow: "0 8px 18px rgba(79,70,229,0.25)",
          }}
        >
          + Nuevo envío
        </button>
      </div>

      {/* BUSCADOR */}
      <div style={{ marginTop: 18, display: "flex", gap: 10 }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por código de envío o status…"
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "999px",
            border: "1px solid #e5e7eb",
            fontSize: "0.9rem",
            outline: "none",
          }}
        />
        <button
          onClick={load}
          style={{
            padding: "8px 16px",
            borderRadius: "999px",
            background: "#f3f4f6",
            border: "1px solid #e5e7eb",
            fontSize: "0.85rem",
            cursor: "pointer",
          }}
        >
          Recargar
        </button>
      </div>

      {/* TABLA */}
      <div
        style={{
          marginTop: 20,
          background: "white",
          borderRadius: "16px",
          boxShadow: "0px 10px 30px rgba(15,23,42,0.05)",
          overflow: "hidden",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead
            style={{
              background:
                "radial-gradient(circle at top left,#EEF2FF,#F9FAFB)",
              color: "#4b5563",
            }}
          >
            <tr>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>
                Código de Envío (ID)
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>
                ID Pedido
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>
                Responsable
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left" }}>
                Status
              </th>
              <th style={{ padding: "12px 16px", textAlign: "right" }}>
                Acciones
              </th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: "center" }}>
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 24, textAlign: "center" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row, idx) => (
                <tr
                  key={row.id_envio}
                  style={{
                    borderTop: "1px solid #F3F4F6",
                    background: idx % 2 === 0 ? "#ffffff" : "#F9FAFB",
                  }}
                >
                  <td style={{ padding: "10px 16px", fontWeight: 500 }}>
                    {row.codigo}
                  </td>
                  <td style={{ padding: "10px 16px" }}>#{row.id_pedido}</td>
                  <td style={{ padding: "10px 16px" }}>
                    #{row.id_empleado_responsable}
                  </td>
                  <td style={{ padding: "10px 16px" }}>
                    <span style={getStatusBadgeStyle(row.status)}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px 16px", textAlign: "right" }}>
                    <button
                      onClick={() => openEdit(row)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#F59E0B",
                        color: "white",
                        border: "none",
                        fontSize: "0.8rem",
                        marginRight: 6,
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(row)}
                      style={{
                        padding: "6px 10px",
                        borderRadius: 999,
                        background: "#DC2626",
                        color: "white",
                        border: "none",
                        fontSize: "0.8rem",
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
          className="agromat-modal-backdrop"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.35)",
            display: "grid",
            placeItems: "center",
            zIndex: 50,
          }}
        >
          <div
            className="agromat-modal-card"
            style={{
              background: "white",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "640px",
              boxShadow: "0 24px 60px rgba(15,23,42,0.25)",
              overflow: "hidden",
            }}
          >
            {/* Header del modal */}
            <div
              style={{
                padding: "16px 20px",
                background:
                  "linear-gradient(135deg,rgba(79,70,229,0.12),rgba(16,185,129,0.1))",
                borderBottom: "1px solid rgba(209,213,219,0.7)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "1.1rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  {editingId ? "Editar envío" : "Nuevo envío"}
                </h3>
                <p
                  style={{
                    margin: 0,
                    marginTop: 4,
                    fontSize: "0.8rem",
                    color: "#6b7280",
                  }}
                >
                  {editingId
                    ? "Actualiza el estado y los datos del envío."
                    : "Registra un envío asociado a un pedido y un producto."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  border: "none",
                  background: "transparent",
                  fontSize: "1.1rem",
                  cursor: "pointer",
                  color: "#6b7280",
                }}
              >
                ✕
              </button>
            </div>

            {/* Cuerpo del modal */}
            <form onSubmit={save} style={{ padding: "18px 20px 16px" }}>
              {/* Sección 1: Datos del envío */}
              <div
                style={{
                  padding: "14px 14px 10px",
                  borderRadius: "12px",
                  background: "#F9FAFB",
                  border: "1px solid #E5E7EB",
                  marginBottom: 14,
                }}
              >
                <h4
                  style={{
                    margin: 0,
                    marginBottom: 10,
                    fontSize: "0.9rem",
                    fontWeight: 600,
                    color: "#111827",
                  }}
                >
                  Datos del envío
                </h4>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "2fr 1fr",
                    gap: 10,
                  }}
                >
                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      style={{ fontSize: "0.8rem", color: "#4b5563" }}
                    >
                      Código de Envío (ID)
                    </label>
                    <input
                      type="text"
                      value={form.codigo}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, codigo: e.target.value }))
                      }
                      required
                      placeholder="Ej. ENV-001"
                      style={{
                        width: "100%",
                        marginTop: 4,
                        marginBottom: 6,
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{ fontSize: "0.8rem", color: "#4b5563" }}
                    >
                      ID Pedido
                    </label>
                    <input
                      type="number"
                      value={form.id_pedido}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, id_pedido: e.target.value }))
                      }
                      required
                      placeholder="ID del pedido"
                      style={{
                        width: "100%",
                        marginTop: 4,
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  <div>
                    <label
                      style={{ fontSize: "0.8rem", color: "#4b5563" }}
                    >
                      ID Responsable
                    </label>
                    <input
                      type="number"
                      value={form.id_empleado_responsable}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          id_empleado_responsable: e.target.value,
                        }))
                      }
                      required
                      placeholder="ID del empleado"
                      style={{
                        width: "100%",
                        marginTop: 4,
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>

                  <div style={{ gridColumn: "1 / -1" }}>
                    <label
                      style={{ fontSize: "0.8rem", color: "#4b5563" }}
                    >
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, status: e.target.value }))
                      }
                      style={{
                        width: "100%",
                        marginTop: 4,
                        padding: "8px 10px",
                        borderRadius: "8px",
                        border: "1px solid #D1D5DB",
                        fontSize: "0.9rem",
                      }}
                    >
                      <option value="EN_PREPARACION">EN_PREPARACION</option>
                      <option value="EN_CAMINO">EN_CAMINO</option>
                      <option value="ENTREGADO">ENTREGADO</option>
                      <option value="CANCELADO">CANCELADO</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Sección 2: Producto enviado (solo al crear) */}
              {!editingId && (
                <div
                  style={{
                    padding: "14px 14px 10px",
                    borderRadius: "12px",
                    background: "#F3F4FF",
                    border: "1px solid #E0E7FF",
                    marginBottom: 14,
                  }}
                >
                  <h4
                    style={{
                      margin: 0,
                      marginBottom: 10,
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#111827",
                    }}
                  >
                    Producto enviado
                  </h4>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "2fr 1fr",
                      gap: 10,
                    }}
                  >
                    <div>
                      <label
                        style={{ fontSize: "0.8rem", color: "#4b5563" }}
                      >
                        ID Producto
                      </label>
                      <input
                        type="number"
                        value={form.id_producto}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            id_producto: e.target.value,
                          }))
                        }
                        required
                        placeholder="ID del producto"
                        style={{
                          width: "100%",
                          marginTop: 4,
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>

                    <div>
                      <label
                        style={{ fontSize: "0.8rem", color: "#4b5563" }}
                      >
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min={1}
                        value={form.cantidad}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            cantidad: e.target.value,
                          }))
                        }
                        required
                        style={{
                          width: "100%",
                          marginTop: 4,
                          padding: "8px 10px",
                          borderRadius: "8px",
                          border: "1px solid #D1D5DB",
                          fontSize: "0.9rem",
                        }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Observaciones */}
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: "0.8rem", color: "#4b5563" }}>
                  Observaciones
                </label>
                <textarea
                  rows={3}
                  value={form.observaciones}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      observaciones: e.target.value,
                    }))
                  }
                  placeholder="Notas del envío: daños, instrucciones especiales, etc."
                  style={{
                    width: "100%",
                    marginTop: 4,
                    padding: "8px 10px",
                    borderRadius: "10px",
                    border: "1px solid #D1D5DB",
                    fontSize: "0.9rem",
                    resize: "vertical",
                  }}
                />
              </div>

              {/* Footer botones */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 4,
                }}
              >
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "999px",
                    border: "1px solid #E5E7EB",
                    background: "#F9FAFB",
                    fontSize: "0.85rem",
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "8px 16px",
                    borderRadius: "999px",
                    border: "none",
                    background: "linear-gradient(135deg,#4F46E5,#6366F1)",
                    color: "white",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow: "0 10px 24px rgba(79,70,229,0.35)",
                  }}
                >
                  Guardar envío
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
