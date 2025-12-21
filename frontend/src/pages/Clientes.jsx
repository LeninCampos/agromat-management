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
  nombre_contacto: "",
  // ✅ NUEVO
  cuit: "",
  correo: "",
  telefono: "",
  direccion: "",
  comentarios: "",
};

export default function Clientes() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const processedData = useMemo(() => {
    let result = [...items];
    const query = q.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (x) =>
          x.nombre_cliente?.toLowerCase().includes(query) ||
          x.nombre_contacto?.toLowerCase().includes(query) ||
          x.correo?.toLowerCase().includes(query) ||
          // ✅ NUEVO: buscar por CUIT también
          String(x.cuit || "").toLowerCase().includes(query) ||
          x._productos_busqueda?.includes(query)
      );
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [q, items, sortConfig]);

  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === 'asc' ? "↑" : "↓";
  };

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

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_cliente);
    setForm({
      nombre_cliente: row.nombre_cliente ?? "",
      nombre_contacto: row.nombre_contacto ?? "",
      // ✅ NUEVO
      cuit: row.cuit ?? "",
      correo: row.correo ?? "",
      telefono: row.telefono ?? "",
      direccion: row.direccion ?? "",
      comentarios: row.comentarios ?? "",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    const payload = {
      nombre_cliente: form.nombre_cliente,
      nombre_contacto: form.nombre_contacto || null,
      // ✅ NUEVO
      cuit: form.cuit || null,
      correo_cliente: form.correo || null,
      telefono: form.telefono || null,
      direccion: form.direccion || null,
      comentarios: form.comentarios || null,
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

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar cliente?",
      text: row.nombre_cliente,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });

    if (!result.isConfirmed) return;

    try {
      await deleteCliente(row.id_cliente);
      Swal.fire(" Eliminado", "Cliente eliminado", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

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

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, CUIT, producto comprado o correo…"
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
              <th onClick={() => requestSort('nombre_cliente')} style={{ padding: "10px", cursor: "pointer" }}>
                Cliente {getSortIcon('nombre_cliente')}
              </th>
              <th onClick={() => requestSort('nombre_contacto')} style={{ padding: "10px", cursor: "pointer" }}>
                Contacto {getSortIcon('nombre_contacto')}
              </th>
              {/* ✅ NUEVO: CUIT (opcional mostrar) */}
              <th onClick={() => requestSort('cuit')} style={{ padding: "10px", cursor: "pointer" }}>
                CUIT {getSortIcon('cuit')}
              </th>

              <th onClick={() => requestSort('telefono')} style={{ padding: "10px", cursor: "pointer" }}>
                Teléfono {getSortIcon('telefono')}
              </th>
              <th onClick={() => requestSort('ultimo_pedido')} style={{ padding: "10px", cursor: "pointer" }}>
                Últ. Pedido {getSortIcon('ultimo_pedido')}
              </th>
              <th onClick={() => requestSort('pedidos_ultimo_anio')} style={{ padding: "10px", cursor: "pointer", textAlign: "center" }}>
                Pedidos (1 año) {getSortIcon('pedidos_ultimo_anio')}
              </th>
              <th style={{ padding: "10px" }}>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>Cargando…</td></tr>
            ) : processedData.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>Sin resultados</td></tr>
            ) : (
              processedData.map((row) => (
                <tr key={row.id_cliente} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>
                    <strong>{row.nombre_cliente}</strong><br/>
                    <span style={{fontSize: "0.85em", color:"#666"}}>{row.correo}</span>
                  </td>
                  <td style={{ padding: "10px" }}>{row.nombre_contacto || "-"}</td>

                  {/* ✅ NUEVO */}
                  <td style={{ padding: "10px" }}>{row.cuit || "-"}</td>

                  <td style={{ padding: "10px" }}>{row.telefono}</td>
                  <td style={{ padding: "10px" }}>{row.ultimo_pedido}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <span style={{background: "#e0e7ff", color:"#3730a3", padding:"4px 8px", borderRadius:"12px", fontSize:"0.85rem", fontWeight:"bold"}}>
                      {row.pedidos_ultimo_anio}
                    </span>
                  </td>

                  <td style={{ padding: "10px" }}>
                    <button
                      onClick={() => openEdit(row)}
                      style={{
                        background: "#F59E0B", color: "white", padding: "5px 10px", borderRadius: "6px", border: "none", marginRight: "8px", cursor: "pointer"
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(row)}
                      style={{
                        background: "#DC2626", color: "white", padding: "5px 10px", borderRadius: "6px", border: "none", cursor: "pointer"
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
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card">
            <div className="agromat-modal-header">
              <div>
                <h2>{editingId ? "Editar cliente" : "Nuevo cliente"}</h2>
              </div>
              <button type="button" className="agromat-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={save} className="agromat-modal-body">
              <div className="agromat-form-grid">
                <div className="agromat-form-field agromat-full-row">
                  <label>Razón Social / Nombre Cliente</label>
                  <input
                    type="text"
                    value={form.nombre_cliente}
                    onChange={(e) => setForm((f) => ({ ...f, nombre_cliente: e.target.value }))}
                    required
                    className="agromat-input"
                    placeholder="Empresa S.A."
                  />
                </div>

                <div className="agromat-form-field">
                  <label>Nombre Contacto</label>
                  <input
                    type="text"
                    value={form.nombre_contacto}
                    onChange={(e) => setForm((f) => ({ ...f, nombre_contacto: e.target.value }))}
                    className="agromat-input"
                    placeholder="Persona de contacto"
                  />
                </div>

                {/* ✅ NUEVO: CUIT */}
                <div className="agromat-form-field">
                  <label>CUIT</label>
                  <input
                    type="text"
                    value={form.cuit}
                    onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))}
                    className="agromat-input"
                    placeholder="20-12345678-3"
                  />
                </div>

                <div className="agromat-form-field">
                  <label>Teléfono</label>
                  <input
                    type="text"
                    value={form.telefono}
                    onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))}
                    className="agromat-input"
                    placeholder="818 000 0000"
                  />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Correo</label>
                  <input
                    type="email"
                    value={form.correo}
                    onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))}
                    className="agromat-input"
                    placeholder="cliente@ejemplo.com"
                  />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Dirección</label>
                  <textarea
                    value={form.direccion}
                    onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))}
                    className="agromat-textarea"
                    rows={2}
                    placeholder="Dirección completa de entrega"
                  />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Comentarios / Notas</label>
                  <textarea
                    value={form.comentarios}
                    onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value }))}
                    className="agromat-textarea"
                    rows={2}
                    placeholder="Preferencias, horarios, etc."
                  />
                </div>
              </div>

              <div className="agromat-modal-footer">
                <button type="button" className="agromat-btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="agromat-btn-primary">Guardar cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
