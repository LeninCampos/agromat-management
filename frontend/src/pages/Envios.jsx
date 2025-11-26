// src/pages/Envios.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getEnvios,
  createEnvio,
  updateEnvio,
  deleteEnvio,
} from "../api/envios";
// 1. IMPORTAMOS LAS OTRAS APIS
import { getPedidos } from "../api/pedidos";
import { getEmpleados } from "../api/empleados";

const emptyForm = {
  codigo: "",
  id_pedido: "",
  id_empleado_responsable: "",
  status: "EN_PREPARACION",
  observaciones: ""
};

export default function Envios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // 2. ESTADOS PARA LOS SELECTORES
  const [pedidos, setPedidos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((x) =>
      x.codigo?.toLowerCase().includes(query) ||
      x.status?.toLowerCase().includes(query)
    );
  }, [q, items]);

  // 3. CARGA DE DATOS UNIFICADA
  const load = async () => {
    setLoading(true);
    try {
      const [resEnvios, resPedidos, resEmpleados] = await Promise.all([
        getEnvios(),
        getPedidos(),
        getEmpleados(),
      ]);

      setItems(resEnvios.data);
      setPedidos(resPedidos.data);
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
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_envio);
    setForm({
      codigo: row.codigo,
      id_pedido: row.id_pedido,
      id_empleado_responsable: row.id_empleado_responsable,
      status: row.status,
      observaciones: row.observaciones ?? ""
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    // Validaciones básicas
    if (!form.id_pedido || !form.id_empleado_responsable) {
      Swal.fire("Error", "Selecciona pedido y responsable", "warning");
      return;
    }

    // Si es nuevo, validar producto
    if (!editingId && !form.id_producto) {
      Swal.fire("Error", "Selecciona un producto para el envío", "warning");
      return;
    }

    const payloadCreate = {
      codigo: form.codigo,
      id_pedido: Number(form.id_pedido),
      id_empleado_responsable: Number(form.id_empleado_responsable),
      observaciones: form.observaciones
    };

    const payloadUpdate = {
      status: form.status,
      id_empleado_responsable: Number(form.id_empleado_responsable),
      observaciones: form.observaciones
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
      load();
    } catch (e) {
      console.error("ERROR:", e);
      const msg = e.response?.data?.error || "Error al guardar";
      Swal.fire("Error", msg, "error");
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar?",
      text: `#${row.codigo}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteEnvio(row.id_envio);
      load();
      Swal.fire("✔️", "Eliminado", "success");
    } catch (e) {
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>📦 Envíos</h2>
        <button
          onClick={openCreate}
          style={{
            background: "#4F46E5",
            color: "white",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer"
          }}
        >
          + Nuevo
        </button>
      </div>

      <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
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
            borderRadius: 6,
            background: "#f3f4f6",
            border: "1px solid #ddd",
            cursor: "pointer"
          }}
        >
          Recargar
        </button>
      </div>

      <div
        style={{
          marginTop: 20,
          background: "white",
          borderRadius: "12px",
          boxShadow: "0px 2px 6px rgba(0,0,0,0.1)",
          padding: 10,
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={{ padding: "10px" }}>Código</th>
              <th style={{ padding: "10px" }}>Pedido</th>
              <th style={{ padding: "10px" }}>Responsable</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id_envio} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.codigo}</td>
                  {/* Mostramos info útil en lugar de solo ID */}
                  <td style={{ padding: "10px" }}>
                    Pedido #{row.id_pedido} <br />
                    <span style={{ fontSize: "0.85em", color: "#666" }}>
                      (${row.Pedido?.total || 0})
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    {row.responsable?.nombre_empleado || "Sin asignar"}
                  </td>
                  <td style={{ padding: "10px" }}>
                    <span style={{
                      padding: "4px 8px",
                      borderRadius: "4px",
                      background: row.status === "ENTREGADO" ? "#dcfce7" : "#f3f4f6",
                      color: row.status === "ENTREGADO" ? "#166534" : "#374151",
                      fontWeight: 500,
                      fontSize: "0.9em"
                    }}>
                      {row.status}
                    </span>
                  </td>
                  <td style={{ padding: "10px" }}>
                    <button
                      onClick={() => openEdit(row)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        background: "#F59E0B",
                        color: "white",
                        marginRight: 6,
                        border: "none",
                        cursor: "pointer"
                      }}
                    >
                      Editar
                    </button>

                    <button
                      onClick={() => remove(row)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        background: "#DC2626",
                        color: "white",
                        border: "none",
                        cursor: "pointer"
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
              borderRadius: 12,
              width: "100%",
              maxWidth: 500,
              boxShadow: "0 5px 20px rgba(0,0,0,0.2)"
            }}
          >
            <h3 style={{ marginBottom: 15, fontSize: "1.25rem" }}>
              {editingId ? "Editar envío" : "Nuevo envío"}
            </h3>

            <label style={{ display: "block", marginBottom: 5 }}>Código</label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value }))}
              // Sugerir un código por defecto si está vacío
              placeholder="Ej: ENV-2025-001"
              required={!editingId} // Obligatorio solo al crear (o opcional si el back lo genera)
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
            />

            {/* 5. SELECTOR DE PEDIDOS */}
            <label style={{ display: "block", marginBottom: 5 }}>Pedido</label>
            <select
              value={form.id_pedido}
              onChange={(e) => setForm(f => ({ ...f, id_pedido: e.target.value }))}
              required
              disabled={!!editingId} // No cambiar pedido al editar
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 6, border: "1px solid #ccc", background: editingId ? "#f3f4f6" : "white" }}
            >
              <option value="">-- Selecciona Pedido --</option>
              {pedidos.map(p => (
                <option key={p.id_pedido} value={p.id_pedido}>
                  #{p.id_pedido} - {p.fecha_pedido} ({p.status})
                </option>
              ))}
            </select>

            {/* 6. SELECTOR DE EMPLEADO */}
            <label style={{ display: "block", marginBottom: 5 }}>Responsable</label>
            <select
              value={form.id_empleado_responsable}
              onChange={(e) => setForm(f => ({ ...f, id_empleado_responsable: e.target.value }))}
              required
              style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
            >
              <option value="">-- Selecciona Responsable --</option>
              {empleados.map(e => (
                <option key={e.id_empleado} value={e.id_empleado}>
                  {e.nombre_empleado} ({e.rol})
                </option>
              ))}
            </select>

            {/* 7. SELECTOR DE PRODUCTO (Solo al crear) */}

            {editingId && (
              <>
                <label style={{ display: "block", marginBottom: 5 }}>Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm(f => ({ ...f, status: e.target.value }))}
                  style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 6, border: "1px solid #ccc" }}
                >
                  <option value="EN_PREPARACION">EN PREPARACION</option>
                  <option value="EN_TRANSITO">EN TRANSITO</option>
                  <option value="ENTREGADO">ENTREGADO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </>
            )}

            <label style={{ display: "block", marginBottom: 5 }}>Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) =>
                setForm((f) => ({ ...f, observaciones: e.target.value }))
              }
              style={{ width: "100%", marginBottom: 15, padding: 8, borderRadius: 6, border: "1px solid #ccc", minHeight: "80px" }}
            />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{ background: "#e5e7eb", padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer" }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{ background: "#4F46E5", color: "white", padding: "8px 16px", borderRadius: 6, border: "none", cursor: "pointer" }}
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