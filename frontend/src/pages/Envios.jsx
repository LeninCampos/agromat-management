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
  observaciones: ""
};

export default function Envios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((x) =>
      x.codigo?.toLowerCase().includes(query) ||
      x.status?.toLowerCase().includes(query)
    );
  }, [q, items]);

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
      id_producto: "",      // editar detalles sería otro modal extra
      cantidad: 1,
      status: row.status,
      observaciones: row.observaciones ?? ""
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    const payloadCreate = {
      codigo: form.codigo,
      id_pedido: Number(form.id_pedido),
      id_empleado_responsable: Number(form.id_empleado_responsable),
      observaciones: form.observaciones,
      detalles: [
        {
          id_producto: form.id_producto,
          cantidad: Number(form.cantidad),
        }
      ]
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
      Swal.fire("Error", JSON.stringify(e.response?.data || "Error al guardar"), "error");
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
            background: "#eee"
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
              <th>Código</th>
              <th>ID Pedido</th>
              <th>Responsable</th>
              <th>Status</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center" }}>
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ textAlign: "center" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id_envio} style={{ borderTop: "1px solid #eee" }}>
                  <td>{row.codigo}</td>
                  <td>{row.id_pedido}</td>
                  <td>{row.id_empleado_responsable}</td>
                  <td>{row.status}</td>
                  <td>
                    <button
                      onClick={() => openEdit(row)}
                      style={{
                        padding: "5px 10px",
                        borderRadius: 6,
                        background: "#F59E0B",
                        color: "white",
                        marginRight: 6,
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
            }}
          >
            <h3 style={{ marginBottom: 10 }}>
              {editingId ? "Editar envío" : "Nuevo envío"}
            </h3>

            <label>Código</label>
            <input
              type="text"
              value={form.codigo}
              onChange={(e) => setForm(f => ({ ...f, codigo: e.target.value }))}
              required
            />

            <label>ID Pedido</label>
            <input
              type="number"
              value={form.id_pedido}
              onChange={(e) => setForm(f => ({ ...f, id_pedido: e.target.value }))}
              required
            />

            <label>ID Responsable</label>
            <input
              type="number"
              value={form.id_empleado_responsable}
              onChange={(e) => setForm(f => ({ ...f, id_empleado_responsable: e.target.value }))}
              required
            />

            {!editingId && (
              <>
                <label>ID Producto</label>
                <input
                  type="number"
                  value={form.id_producto}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, id_producto: e.target.value }))
                  }
                  required
                />

                <label>Cantidad</label>
                <input
                  type="number"
                  value={form.cantidad}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, cantidad: e.target.value }))
                  }
                  required
                />
              </>
            )}

            <label>Observaciones</label>
            <textarea
              value={form.observaciones}
              onChange={(e) =>
                setForm((f) => ({ ...f, observaciones: e.target.value }))
              }
            />

            <button type="submit" style={{ marginTop: 10, background: "#4F46E5", color: "white", padding: 10, borderRadius: 6 }}>
              Guardar
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
