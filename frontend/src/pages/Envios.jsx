// frontend/src/pages/Envios.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getEnvios,
  createEnvio,
  updateEnvio,
  deleteEnvio,
} from "../api/envios";
import { getPedidos } from "../api/pedidos";
import { getEmpleados } from "../api/empleados";

const emptyForm = {
  codigo: "",
  id_pedido: "",
  id_empleado_responsable: "",
  status: "EN_PREPARACION",
  observaciones: "",
  direccion_envio: "",

  // 🚚 nuevos
  nombre_conductor: "",
  telefono_conductor: "",
  placa_vehiculo: "",
};

function getDireccionFromEnvioRow(row) {
  const dirPedido = row.Pedido?.direccion_envio;
  const dirCliente = row.Pedido?.Cliente?.direccion;
  return (dirPedido?.trim() || dirCliente?.trim() || "").trim();
}

export default function Envios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [pedidos, setPedidos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (x) =>
        x.codigo?.toLowerCase().includes(query) ||
        x.status?.toLowerCase().includes(query)
    );
  }, [q, items]);

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

  useEffect(() => {
    if (!form.id_pedido) return;
    const pedidoSel = pedidos.find(
      (p) => String(p.id_pedido) === String(form.id_pedido)
    );
    if (!pedidoSel) return;

    const dir = (pedidoSel.direccion_envio || "").trim();
    setForm((f) => ({ ...f, direccion_envio: dir }));
  }, [form.id_pedido, pedidos]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_envio);

    const direccion = getDireccionFromEnvioRow(row);

    setForm({
      codigo: row.codigo,
      id_pedido: row.id_pedido,
      id_empleado_responsable: row.id_empleado_responsable,
      status: row.status,
      observaciones: row.observaciones ?? "",
      direccion_envio: direccion,

      nombre_conductor: row.nombre_conductor || "",
      telefono_conductor: row.telefono_conductor || "",
      placa_vehiculo: row.placa_vehiculo || "",
    });

    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    if (!form.id_pedido || !form.id_empleado_responsable) {
      Swal.fire("Error", "Selecciona pedido y responsable", "warning");
      return;
    }

    const payload = {
      codigo: form.codigo,
      id_pedido: Number(form.id_pedido),
      id_empleado_responsable: Number(form.id_empleado_responsable),
      observaciones: form.observaciones,
      status: editingId ? form.status : "EN_PREPARACION",

      nombre_conductor: form.nombre_conductor || null,
      telefono_conductor: form.telefono_conductor || null,
      placa_vehiculo: form.placa_vehiculo || null,
    };

    try {
      if (editingId) {
        await updateEnvio(editingId, payload);
        Swal.fire("✔️", "Despacho actualizado", "success");
      } else {
        await createEnvio(payload);
        Swal.fire("✔️", "Despacho creado", "success");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (e) {
      console.error("ERROR:", e);
      const msg = e.response?.data?.error || "Error al guardar";
      Swal.fire("Error", msg, "error");
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar despacho?",
      text: `Código ${row.codigo}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteEnvio(row.id_envio);
      load();
      Swal.fire("✔️", "Despacho eliminado", "success");
    } catch (e) {
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>📦 Despachos</h2>
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
          borderRadius: "12px",
          boxShadow: "0px 2px 6px rgba(0,0,0,0.08)",
          padding: 10,
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={{ padding: "10px" }}>Código</th>
              <th style={{ padding: "10px" }}>Pedido</th>
              <th style={{ padding: "10px" }}>Dirección env.</th>
              <th style={{ padding: "10px" }}>Responsable / Conductor</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  style={{ textAlign: "center", padding: "20px" }}
                >
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => {
                const dirEnvio = getDireccionFromEnvioRow(row) || "-";
                const conductorText =
                  row.nombre_conductor ||
                  row.telefono_conductor ||
                  row.placa_vehiculo
                    ? `${row.nombre_conductor || "Conductor sin nombre"} · ${
                        row.telefono_conductor || "Sin tel."
                      } · ${row.placa_vehiculo || "Sin placas"}`
                    : "";

                return (
                  <tr
                    key={row.id_envio}
                    style={{ borderTop: "1px solid #eee" }}
                  >
                    <td style={{ padding: "10px" }}>{row.codigo}</td>

                    <td style={{ padding: "10px" }}>
                      Pedido #{row.id_pedido}
                      <br />
                      <span
                        style={{ fontSize: "0.82em", color: "#6b7280" }}
                      >
                        {row.Pedido?.Cliente
                          ? row.Pedido.Cliente.nombre_cliente
                          : ""}
                        {row.Pedido?.total != null &&
                          ` ($${Number(row.Pedido.total).toFixed(2)})`}
                      </span>
                    </td>

                    <td style={{ padding: "10px", fontSize: "0.86em" }}>
                      {dirEnvio || "-"}
                    </td>

                    <td style={{ padding: "10px", fontSize: "0.86em" }}>
                      <strong>
                        {row.responsable?.nombre_empleado || "Sin asignar"}
                      </strong>
                      {conductorText && (
                        <div style={{ color: "#6b7280", marginTop: 2 }}>
                          {conductorText}
                        </div>
                      )}
                    </td>

                    <td style={{ padding: "10px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: "4px",
                          background:
                            row.status === "ENTREGADO"
                              ? "#dcfce7"
                              : row.status === "EN_TRANSITO"
                              ? "#e0f2fe"
                              : "#f3f4f6",
                          color:
                            row.status === "ENTREGADO"
                              ? "#166534"
                              : row.status === "EN_TRANSITO"
                              ? "#075985"
                              : "#374151",
                          fontWeight: 500,
                          fontSize: "0.9em",
                        }}
                      >
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
                          cursor: "pointer",
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
                          cursor: "pointer",
                        }}
                      >
                        Eliminar
                      </button>
                    </td>
                  </tr>
                );
              })
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
              padding: "1.6rem",
              borderRadius: 16,
              width: "100%",
              maxWidth: 520,
              boxShadow: "0 16px 40px rgba(15,23,42,0.25)",
            }}
          >
            <h3
              style={{
                marginBottom: 15,
                fontSize: "1.25rem",
                fontWeight: 600,
              }}
            >
              {editingId ? "Editar despacho" : "Nuevo despacho"}
            </h3>

            {/* Código */}
            <label style={{ display: "block", marginBottom: 4 }}>
              Código del despacho
            </label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) =>
                setForm((f) => ({ ...f, codigo: e.target.value }))
              }
              placeholder="Ej: EN-2025-001"
              required={!editingId}
              style={{
                width: "100%",
                marginBottom: 10,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />

            {/* Pedido */}
            <label style={{ display: "block", marginBottom: 4 }}>Pedido</label>
            <select
              value={form.id_pedido}
              onChange={(e) =>
                setForm((f) => ({ ...f, id_pedido: e.target.value }))
              }
              required
              disabled={!!editingId}
              style={{
                width: "100%",
                marginBottom: 10,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                background: editingId ? "#f3f4f6" : "white",
              }}
            >
              <option value="">-- Selecciona pedido --</option>
              {pedidos.map((p) => (
                <option key={p.id_pedido} value={p.id_pedido}>
                  #{p.id_pedido} - {p.fecha_pedido} ({p.status})
                </option>
              ))}
            </select>

            {/* Dirección de envío */}
            <label style={{ display: "block", marginBottom: 4 }}>
              Dirección de envío (desde el pedido)
            </label>
            <textarea
              value={form.direccion_envio || ""}
              readOnly
              style={{
                width: "100%",
                marginBottom: 10,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                fontSize: "0.9rem",
                minHeight: 60,
              }}
              placeholder="Se tomará la dirección capturada en el pedido."
            />

            {/* Responsable */}
            <label style={{ display: "block", marginBottom: 4 }}>
              Responsable del despacho
            </label>
            <select
              value={form.id_empleado_responsable}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  id_empleado_responsable: e.target.value,
                }))
              }
              required
              style={{
                width: "100%",
                marginBottom: 10,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            >
              <option value="">-- Selecciona responsable --</option>
              {empleados.map((e) => (
                <option key={e.id_empleado} value={e.id_empleado}>
                  {e.nombre_empleado} {e.rol ? `(${e.rol})` : ""}
                </option>
              ))}
            </select>

            {/* 🚚 Datos del conductor */}
            <label style={{ display: "block", marginBottom: 4 }}>
              Nombre del conductor
            </label>
            <input
              type="text"
              value={form.nombre_conductor}
              onChange={(e) =>
                setForm((f) => ({ ...f, nombre_conductor: e.target.value }))
              }
              style={{
                width: "100%",
                marginBottom: 8,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />

            <label style={{ display: "block", marginBottom: 4 }}>
              Celular del conductor
            </label>
            <input
              type="text"
              value={form.telefono_conductor}
              onChange={(e) =>
                setForm((f) => ({ ...f, telefono_conductor: e.target.value }))
              }
              style={{
                width: "100%",
                marginBottom: 8,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />

            <label style={{ display: "block", marginBottom: 4 }}>
              Placas del vehículo
            </label>
            <input
              type="text"
              value={form.placa_vehiculo}
              onChange={(e) =>
                setForm((f) => ({ ...f, placa_vehiculo: e.target.value }))
              }
              style={{
                width: "100%",
                marginBottom: 10,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />

            {/* Status solo al editar */}
            {editingId && (
              <>
                <label style={{ display: "block", marginBottom: 4 }}>
                  Status del despacho
                </label>
                <select
                  value={form.status}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, status: e.target.value }))
                  }
                  style={{
                    width: "100%",
                    marginBottom: 10,
                    padding: 8,
                    borderRadius: 8,
                    border: "1px solid #d1d5db",
                  }}
                >
                  <option value="EN_PREPARACION">EN PREPARACIÓN</option>
                  <option value="EN_TRANSITO">EN TRÁNSITO</option>
                  <option value="ENTREGADO">ENTREGADO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </>
            )}

            {/* Observaciones */}
            <label style={{ display: "block", marginBottom: 4 }}>
              Observaciones
            </label>
            <textarea
              value={form.observaciones}
              onChange={(e) =>
                setForm((f) => ({ ...f, observaciones: e.target.value }))
              }
              style={{
                width: "100%",
                marginBottom: 16,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
                minHeight: 70,
              }}
            />

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: 10,
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "#e5e7eb",
                  padding: "8px 16px",
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.9rem",
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
                  borderRadius: 999,
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.9rem",
                  fontWeight: 500,
                }}
              >
                Guardar despacho
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
