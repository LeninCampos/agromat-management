import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getProveedores,
  createProveedor,
  updateProveedor,
  deleteProveedor,
} from "../api/proveedores";

const emptyForm = {
  nombre_proveedor: "",
  nombre_contacto: "", // ✅ 2.12
  cuit: "",            // ✅ 2.14, 2.16
  telefono: "",
  correo: "",
  direccion: "",
  comentarios: "",     // ✅ 2.13
};

export default function Proveedores() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false); // ✅ 2.10, 2.11
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (x) =>
        x.nombre_proveedor?.toLowerCase().includes(query) ||
        x.nombre_contacto?.toLowerCase().includes(query) ||
        x.cuit?.includes(query)
    );
  }, [q, items]);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await getProveedores();
      setItems(data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar los proveedores", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_proveedor);
    setForm({
      nombre_proveedor: row.nombre_proveedor ?? "",
      nombre_contacto: row.nombre_contacto ?? "",
      cuit: row.cuit ?? "",
      telefono: row.telefono ?? "",
      correo: row.correo ?? "",
      direccion: row.direccion ?? "",
      comentarios: row.comentarios ?? "",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    try {
      if (editingId) {
        await updateProveedor(editingId, form);
        Swal.fire("✔️ Listo", "Proveedor actualizado", "success");
      } else {
        await createProveedor(form);
        Swal.fire("✔️ Listo", "Proveedor creado", "success");
      }
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.errors?.[0]?.mensaje || "Error al guardar";
      Swal.fire("Error", msg, "error");
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar proveedor?",
      text: row.nombre_proveedor,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteProveedor(row.id_proveedor);
      Swal.fire("🗑️ Eliminado", "Proveedor eliminado", "success");
      load();
    } catch (e) {
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  // ✅ Este es el return actualizado que pedías
  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>🏭 Proveedores</h2>
        <button onClick={openCreate} className="agromat-btn-primary">+ Nuevo</button>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, contacto o CUIT..."
          className="agromat-input"
          style={{ flex: 1 }}
        />
        <button onClick={load} className="agromat-btn-secondary">Recargar</button>
      </div>

      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", color: "#555" }}>
            <tr>
              <th style={{ padding: "10px", textAlign: "left" }}>Proveedor / CUIT</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Contacto</th>
              <th style={{ padding: "10px", textAlign: "left" }}>Info</th>
              {/* ✅ 2.17 Stats en grilla */}
              <th style={{ padding: "10px", textAlign: "center" }}>Entradas Hist.</th>
              <th style={{ padding: "10px", textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>Cargando...</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: "20px" }}>Sin resultados</td></tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id_proveedor} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>
                    <strong>{row.nombre_proveedor}</strong>
                    <div style={{ fontSize: "0.85em", color: "#666" }}>{row.cuit || "Sin CUIT"}</div>
                  </td>
                  <td style={{ padding: "10px" }}>
                    {row.nombre_contacto || "-"}
                  </td>
                  <td style={{ padding: "10px", fontSize: "0.9em" }}>
                    <div>📞 {row.telefono || "-"}</div>
                    <div>✉️ {row.correo || "-"}</div>
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <span style={{ background: "#dbeafe", color: "#1e40af", padding: "4px 8px", borderRadius: "10px", fontWeight: "bold" }}>
                      {row.total_suministros || 0}
                    </span>
                  </td>

                  {/* ✅ CAMBIO: Botones estandarizados */}
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
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
                          fontWeight: 500
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
                          fontWeight: 500
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

      {/* MODAL POPUP */}
      {modalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card">
            <div className="agromat-modal-header">
              <h2>{editingId ? "Editar Proveedor" : "Nuevo Proveedor"}</h2>
              <button onClick={() => setModalOpen(false)} className="agromat-modal-close">✕</button>
            </div>
            <form onSubmit={save} className="agromat-modal-body">
              <div className="agromat-form-grid">
                <div className="agromat-form-field agromat-full-row">
                  <label>Razón Social *</label>
                  <input className="agromat-input" required value={form.nombre_proveedor} onChange={e => setForm({ ...form, nombre_proveedor: e.target.value })} />
                </div>
                {/* ✅ 2.12 */}
                <div className="agromat-form-field">
                  <label>Nombre Contacto</label>
                  <input className="agromat-input" value={form.nombre_contacto} onChange={e => setForm({ ...form, nombre_contacto: e.target.value })} />
                </div>
                {/* ✅ 2.14 CUIT */}
                <div className="agromat-form-field">
                  <label>CUIT</label>
                  <input className="agromat-input" placeholder="20-12345678-9" value={form.cuit} onChange={e => setForm({ ...form, cuit: e.target.value })} />
                </div>
                <div className="agromat-form-field">
                  <label>Teléfono</label>
                  <input className="agromat-input" value={form.telefono} onChange={e => setForm({ ...form, telefono: e.target.value })} />
                </div>
                <div className="agromat-form-field">
                  <label>Correo</label>
                  <input type="email" className="agromat-input" value={form.correo} onChange={e => setForm({ ...form, correo: e.target.value })} />
                </div>
                <div className="agromat-form-field agromat-full-row">
                  <label>Dirección</label>
                  <input className="agromat-input" value={form.direccion} onChange={e => setForm({ ...form, direccion: e.target.value })} />
                </div>
                {/* ✅ 2.13 Comentarios */}
                <div className="agromat-form-field agromat-full-row">
                  <label>Comentarios</label>
                  <textarea className="agromat-textarea" rows="2" value={form.comentarios} onChange={e => setForm({ ...form, comentarios: e.target.value })} />
                </div>
              </div>
              <div className="agromat-modal-footer">
                <button type="button" className="agromat-btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="agromat-btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}