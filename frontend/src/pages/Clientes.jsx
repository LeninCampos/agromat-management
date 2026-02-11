import { useEffect, useMemo, useState, useRef } from "react";
import Swal from "sweetalert2";
import {
  getClientes,
  createCliente,
  updateCliente,
  deleteCliente,
  importarClientesExcel,
} from "../api/clientes";
import { useAuth } from "../context/AuthContext";

const emptyForm = {
  codigo_cliente: "",
  nombre_cliente: "",
  nombre_contacto: "",
  cuit: "",
  correo: "",
  telefono: "",
  fax: "",
  direccion: "",
  codigo_postal: "",
  localidad: "",
  zona: "",
  provincia: "",
  comentarios: "",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, "Todos"];

export default function Clientes() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });

  // Import state
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importLoading, setImportLoading] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  // ─── Filtering, sorting, pagination ───

  const filteredData = useMemo(() => {
    let result = [...items];
    const query = q.trim().toLowerCase();

    if (query) {
      result = result.filter(
        (x) =>
          x.nombre_cliente?.toLowerCase().includes(query) ||
          x.nombre_contacto?.toLowerCase().includes(query) ||
          x.correo?.toLowerCase().includes(query) ||
          String(x.cuit || "").toLowerCase().includes(query) ||
          String(x.codigo_cliente || "").toLowerCase().includes(query) ||
          x.localidad?.toLowerCase().includes(query) ||
          x.provincia?.toLowerCase().includes(query) ||
          x._productos_busqueda?.includes(query)
      );
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (typeof valA === "number" && typeof valB === "number") {
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }
        const strA = String(valA || "").toLowerCase();
        const strB = String(valB || "").toLowerCase();
        if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
        if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [q, items, sortConfig]);

  const showAll = pageSize === "Todos";
  const totalPages = showAll ? 1 : Math.max(1, Math.ceil(filteredData.length / pageSize));
  const paginatedData = useMemo(() => {
    if (showAll) return filteredData;
    const start = (page - 1) * pageSize;
    return filteredData.slice(start, start + pageSize);
  }, [filteredData, page, pageSize, showAll]);

  // Reset page when filter/pageSize changes
  useEffect(() => { setPage(1); }, [q, sortConfig, pageSize]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "\u2195";
    return sortConfig.direction === "asc" ? "\u2191" : "\u2193";
  };

  // ─── Data loading ───

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

  useEffect(() => { load(); }, []);

  // ─── CRUD handlers ───

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_cliente);
    setForm({
      codigo_cliente: row.codigo_cliente ?? "",
      nombre_cliente: row.nombre_cliente ?? "",
      nombre_contacto: row.nombre_contacto ?? "",
      cuit: row.cuit ?? "",
      correo: row.correo ?? "",
      telefono: row.telefono ?? "",
      fax: row.fax ?? "",
      direccion: row.direccion ?? "",
      codigo_postal: row.codigo_postal ?? "",
      localidad: row.localidad ?? "",
      zona: row.zona ?? "",
      provincia: row.provincia ?? "",
      comentarios: row.comentarios ?? "",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    const payload = {
      codigo_cliente: form.codigo_cliente || null,
      nombre_cliente: form.nombre_cliente || null,
      nombre_contacto: form.nombre_contacto || null,
      cuit: form.cuit || null,
      correo_cliente: form.correo || null,
      telefono: form.telefono || null,
      fax: form.fax || null,
      direccion: form.direccion || null,
      codigo_postal: form.codigo_postal || null,
      localidad: form.localidad || null,
      zona: form.zona || null,
      provincia: form.provincia || null,
      comentarios: form.comentarios || null,
    };

    try {
      if (editingId) {
        await updateCliente(editingId, payload);
        Swal.fire("Listo", "Cliente actualizado", "success");
      } else {
        await createCliente(payload);
        Swal.fire("Listo", "Cliente creado", "success");
      }
      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.errors
        ? e.response.data.errors.map((er) => er.mensaje).join(", ")
        : "No pude guardar el cliente";
      Swal.fire("Error", msg, "error");
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "Eliminar cliente?",
      text: row.nombre_cliente || row.cuit || "Sin nombre",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Si, eliminar",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteCliente(row.id_cliente);
      Swal.fire("Eliminado", "Cliente eliminado", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  // ─── Import handlers ───

  const openImportModal = () => {
    setImportResult(null);
    setImportLoading(false);
    setImportModalOpen(true);
  };

  const handleImportFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportLoading(true);
    setImportResult(null);
    try {
      const { data } = await importarClientesExcel(file);
      setImportResult(data.reporte);
      load();
    } catch (err) {
      console.error(err);
      const msg = err.response?.data?.error || "Error al importar el archivo";
      setImportResult({ error: msg });
    } finally {
      setImportLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const downloadReporte = () => {
    if (!importResult) return;
    const blob = new Blob([JSON.stringify(importResult, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `reporte-importacion-clientes-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isAdmin = user?.rol === "admin";

  // ─── Styles ───

  const s = {
    page: { padding: "1rem 1.25rem", maxWidth: "100%" },
    header: { display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "12px", marginBottom: "16px" },
    title: { fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "#1e293b" },
    count: { fontSize: "0.85rem", color: "#64748b", fontWeight: 400 },
    btnGroup: { display: "flex", gap: "8px", flexWrap: "wrap" },
    btnImport: { background: "#059669", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.9rem", whiteSpace: "nowrap" },
    btnNew: { background: "#4F46E5", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500, fontSize: "0.9rem", whiteSpace: "nowrap" },
    searchRow: { display: "flex", gap: "8px", marginBottom: "16px", flexWrap: "wrap" },
    searchInput: { flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", fontSize: "0.9rem", background: "white" },
    btnReload: { padding: "10px 16px", background: "white", borderRadius: "8px", border: "1px solid #e2e8f0", cursor: "pointer", fontSize: "0.9rem", color: "#475569", whiteSpace: "nowrap" },
    tableWrap: { background: "white", borderRadius: "12px", boxShadow: "0 1px 6px rgba(0,0,0,0.06)", overflowX: "auto", border: "1px solid #f1f5f9" },
    table: { width: "100%", borderCollapse: "collapse", minWidth: "900px" },
    th: { padding: "12px 14px", cursor: "pointer", fontSize: "0.8rem", fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap", borderBottom: "2px solid #e2e8f0", textAlign: "left", userSelect: "none" },
    td: { padding: "12px 14px", fontSize: "0.9rem", color: "#334155", borderBottom: "1px solid #f1f5f9", verticalAlign: "top" },
    tdSub: { fontSize: "0.8rem", color: "#94a3b8", marginTop: "2px" },
    badge: { background: "#e0e7ff", color: "#3730a3", padding: "3px 10px", borderRadius: "20px", fontSize: "0.8rem", fontWeight: 600, display: "inline-block" },
    btnEdit: { background: "#F59E0B", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500 },
    btnDel: { background: "#DC2626", color: "white", padding: "6px 12px", borderRadius: "6px", border: "none", cursor: "pointer", fontSize: "0.8rem", fontWeight: 500, marginLeft: "6px" },
    pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", padding: "16px 0", flexWrap: "wrap" },
    pageBtn: { padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "white", cursor: "pointer", fontSize: "0.85rem", color: "#475569" },
    pageBtnActive: { padding: "6px 12px", borderRadius: "6px", border: "1px solid #4F46E5", background: "#4F46E5", color: "white", cursor: "pointer", fontSize: "0.85rem", fontWeight: 600 },
    pageBtnDisabled: { padding: "6px 12px", borderRadius: "6px", border: "1px solid #e2e8f0", background: "#f8fafc", color: "#cbd5e1", fontSize: "0.85rem", cursor: "default" },
    // Mobile cards
    card: { background: "white", borderRadius: "10px", padding: "14px 16px", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", border: "1px solid #f1f5f9" },
    cardName: { fontWeight: 600, fontSize: "0.95rem", color: "#1e293b", marginBottom: "4px" },
    cardRow: { display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "#64748b", padding: "2px 0" },
    cardActions: { display: "flex", gap: "8px", marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #f1f5f9" },
  };

  // ─── Render helpers ───

  const renderPagination = () => {
    if (totalPages <= 1) return null;
    const pages = [];
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, page + 2);

    return (
      <div style={s.pagination}>
        <button
          style={page === 1 ? s.pageBtnDisabled : s.pageBtn}
          onClick={() => page > 1 && setPage(page - 1)}
          disabled={page === 1}
        >
          Anterior
        </button>
        {start > 1 && <><button style={s.pageBtn} onClick={() => setPage(1)}>1</button>{start > 2 && <span style={{ color: "#94a3b8" }}>...</span>}</>}
        {Array.from({ length: end - start + 1 }, (_, i) => start + i).map((p) => (
          <button key={p} style={p === page ? s.pageBtnActive : s.pageBtn} onClick={() => setPage(p)}>{p}</button>
        ))}
        {end < totalPages && <>{end < totalPages - 1 && <span style={{ color: "#94a3b8" }}>...</span>}<button style={s.pageBtn} onClick={() => setPage(totalPages)}>{totalPages}</button></>}
        <button
          style={page === totalPages ? s.pageBtnDisabled : s.pageBtn}
          onClick={() => page < totalPages && setPage(page + 1)}
          disabled={page === totalPages}
        >
          Siguiente
        </button>
      </div>
    );
  };

  const renderMobileCards = () => (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {paginatedData.map((row) => (
        <div key={row.id_cliente} style={s.card}>
          <div style={s.cardName}>{row.nombre_cliente || row.cuit || `#${row.id_cliente}`}</div>
          {row.correo && <div style={{ fontSize: "0.8rem", color: "#64748b", marginBottom: "6px" }}>{row.correo}</div>}
          <div style={s.cardRow}><span>Codigo</span><span style={{ color: "#334155" }}>{row.codigo_cliente || "-"}</span></div>
          <div style={s.cardRow}><span>CUIT</span><span style={{ color: "#334155" }}>{row.cuit || "-"}</span></div>
          <div style={s.cardRow}><span>Telefono</span><span style={{ color: "#334155" }}>{row.telefono || "-"}</span></div>
          <div style={s.cardRow}><span>Localidad</span><span style={{ color: "#334155" }}>{row.localidad || "-"}</span></div>
          <div style={s.cardRow}><span>Provincia</span><span style={{ color: "#334155" }}>{row.provincia || "-"}</span></div>
          <div style={s.cardRow}><span>Ult. Pedido</span><span style={{ color: "#334155" }}>{row.ultimo_pedido}</span></div>
          <div style={s.cardActions}>
            <button style={{ ...s.btnEdit, flex: 1 }} onClick={() => openEdit(row)}>Editar</button>
            <button style={{ ...s.btnDel, flex: 1, marginLeft: 0 }} onClick={() => remove(row)}>Eliminar</button>
          </div>
        </div>
      ))}
    </div>
  );

  // ─── RENDER ───

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h2 style={s.title}>
            Clientes
            <span style={s.count}> ({filteredData.length})</span>
          </h2>
        </div>
        <div style={s.btnGroup}>
          {isAdmin && (
            <button onClick={openImportModal} style={s.btnImport}>Importar Excel</button>
          )}
          <button onClick={openCreate} style={s.btnNew}>+ Nuevo</button>
        </div>
      </div>

      {/* Search */}
      <div style={s.searchRow}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, CUIT, codigo, localidad, correo..."
          style={s.searchInput}
        />
        <button onClick={load} style={s.btnReload}>Recargar</button>
      </div>

      {/* Desktop Table */}
      <div className="clientes-desktop-only">
        <div style={s.tableWrap}>
          <table style={s.table}>
            <thead>
              <tr>
                <th onClick={() => requestSort("codigo_cliente")} style={s.th}>Cod. {getSortIcon("codigo_cliente")}</th>
                <th onClick={() => requestSort("nombre_cliente")} style={{ ...s.th, minWidth: "180px" }}>Cliente {getSortIcon("nombre_cliente")}</th>
                <th onClick={() => requestSort("cuit")} style={s.th}>CUIT {getSortIcon("cuit")}</th>
                <th onClick={() => requestSort("telefono")} style={s.th}>Telefono {getSortIcon("telefono")}</th>
                <th onClick={() => requestSort("localidad")} style={s.th}>Localidad {getSortIcon("localidad")}</th>
                <th onClick={() => requestSort("provincia")} style={s.th}>Provincia {getSortIcon("provincia")}</th>
                <th onClick={() => requestSort("ultimo_pedido")} style={s.th}>Ult. Pedido {getSortIcon("ultimo_pedido")}</th>
                <th onClick={() => requestSort("pedidos_ultimo_anio")} style={{ ...s.th, textAlign: "center" }}>Pedidos {getSortIcon("pedidos_ultimo_anio")}</th>
                <th style={{ ...s.th, cursor: "default", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Cargando...</td></tr>
              ) : paginatedData.length === 0 ? (
                <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Sin resultados</td></tr>
              ) : (
                paginatedData.map((row) => (
                  <tr key={row.id_cliente} className="clientes-table-row">
                    <td style={{ ...s.td, color: "#94a3b8", fontSize: "0.8rem" }}>{row.codigo_cliente || "-"}</td>
                    <td style={s.td}>
                      <div style={{ fontWeight: 500, color: "#1e293b" }}>{row.nombre_cliente || "-"}</div>
                      {row.correo && <div style={s.tdSub}>{row.correo}</div>}
                      {row.nombre_contacto && <div style={s.tdSub}>{row.nombre_contacto}</div>}
                    </td>
                    <td style={{ ...s.td, fontFamily: "monospace", fontSize: "0.85rem" }}>{row.cuit || "-"}</td>
                    <td style={s.td}>{row.telefono || "-"}</td>
                    <td style={s.td}>{row.localidad || "-"}</td>
                    <td style={s.td}>{row.provincia || "-"}</td>
                    <td style={s.td}>{row.ultimo_pedido}</td>
                    <td style={{ ...s.td, textAlign: "center" }}>
                      <span style={s.badge}>{row.pedidos_ultimo_anio}</span>
                    </td>
                    <td style={{ ...s.td, whiteSpace: "nowrap", textAlign: "center" }}>
                      <button style={s.btnEdit} onClick={() => openEdit(row)}>Editar</button>
                      <button style={s.btnDel} onClick={() => remove(row)}>Eliminar</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile Cards */}
      <div className="clientes-mobile-only">
        {loading ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Cargando...</div>
        ) : paginatedData.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>Sin resultados</div>
        ) : (
          renderMobileCards()
        )}
      </div>

      {/* Pagination + Page Size */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px", padding: "12px 0" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "0.85rem", color: "#64748b" }}>
          <span>Mostrar:</span>
          {PAGE_SIZE_OPTIONS.map(opt => (
            <button
              key={opt}
              onClick={() => setPageSize(opt)}
              style={{
                padding: "5px 12px", borderRadius: "6px", border: "1px solid #e2e8f0",
                background: pageSize === opt ? "#4F46E5" : "white",
                color: pageSize === opt ? "white" : "#475569",
                cursor: "pointer", fontSize: "0.85rem", fontWeight: pageSize === opt ? 600 : 400
              }}
            >
              {opt}
            </button>
          ))}
        </div>
        <div>{renderPagination()}</div>
      </div>

      {/* ─── Modal Crear/Editar ─── */}
      {modalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card" style={{ maxWidth: "680px" }}>
            <div className="agromat-modal-header">
              <div><h2>{editingId ? "Editar cliente" : "Nuevo cliente"}</h2></div>
              <button type="button" className="agromat-modal-close" onClick={() => setModalOpen(false)}>&#x2715;</button>
            </div>

            <form onSubmit={save} className="agromat-modal-body">
              <div className="agromat-form-grid" style={{ gap: "14px" }}>

                <div className="agromat-form-field">
                  <label>Codigo</label>
                  <input type="text" value={form.codigo_cliente} onChange={(e) => setForm((f) => ({ ...f, codigo_cliente: e.target.value }))} className="agromat-input" placeholder="Codigo externo" />
                </div>
                <div className="agromat-form-field">
                  <label>CUIT</label>
                  <input type="text" value={form.cuit} onChange={(e) => setForm((f) => ({ ...f, cuit: e.target.value }))} className="agromat-input" placeholder="20-12345678-3" />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Razon Social / Nombre</label>
                  <input type="text" value={form.nombre_cliente} onChange={(e) => setForm((f) => ({ ...f, nombre_cliente: e.target.value }))} className="agromat-input" placeholder="Empresa S.A." />
                </div>

                <div className="agromat-form-field">
                  <label>Contacto</label>
                  <input type="text" value={form.nombre_contacto} onChange={(e) => setForm((f) => ({ ...f, nombre_contacto: e.target.value }))} className="agromat-input" placeholder="Persona de contacto" />
                </div>
                <div className="agromat-form-field">
                  <label>Correo</label>
                  <input type="email" value={form.correo} onChange={(e) => setForm((f) => ({ ...f, correo: e.target.value }))} className="agromat-input" placeholder="cliente@ejemplo.com" />
                </div>

                <div className="agromat-form-field">
                  <label>Telefono</label>
                  <input type="text" value={form.telefono} onChange={(e) => setForm((f) => ({ ...f, telefono: e.target.value }))} className="agromat-input" placeholder="818 000 0000" />
                </div>
                <div className="agromat-form-field">
                  <label>Fax</label>
                  <input type="text" value={form.fax} onChange={(e) => setForm((f) => ({ ...f, fax: e.target.value }))} className="agromat-input" placeholder="Fax" />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Domicilio</label>
                  <input type="text" value={form.direccion} onChange={(e) => setForm((f) => ({ ...f, direccion: e.target.value }))} className="agromat-input" placeholder="Direccion completa" />
                </div>

                <div className="agromat-form-field">
                  <label>C. Postal</label>
                  <input type="text" value={form.codigo_postal} onChange={(e) => setForm((f) => ({ ...f, codigo_postal: e.target.value }))} className="agromat-input" placeholder="1000" />
                </div>
                <div className="agromat-form-field">
                  <label>Localidad</label>
                  <input type="text" value={form.localidad} onChange={(e) => setForm((f) => ({ ...f, localidad: e.target.value }))} className="agromat-input" placeholder="Localidad" />
                </div>
                <div className="agromat-form-field">
                  <label>Zona</label>
                  <input type="text" value={form.zona} onChange={(e) => setForm((f) => ({ ...f, zona: e.target.value }))} className="agromat-input" placeholder="Zona" />
                </div>
                <div className="agromat-form-field">
                  <label>Provincia</label>
                  <input type="text" value={form.provincia} onChange={(e) => setForm((f) => ({ ...f, provincia: e.target.value }))} className="agromat-input" placeholder="Provincia" />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Comentarios</label>
                  <textarea value={form.comentarios} onChange={(e) => setForm((f) => ({ ...f, comentarios: e.target.value }))} className="agromat-textarea" rows={2} placeholder="Preferencias, horarios, etc." />
                </div>
              </div>

              <div className="agromat-modal-footer" style={{ margin: "0 -1.5rem -1.5rem", padding: "1rem 1.5rem" }}>
                <button type="button" className="agromat-btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="agromat-btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Modal Importar Excel ─── */}
      {importModalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card" style={{ maxWidth: "560px" }}>
            <div className="agromat-modal-header">
              <div><h2>Importar Clientes</h2></div>
              <button type="button" className="agromat-modal-close" onClick={() => setImportModalOpen(false)}>&#x2715;</button>
            </div>

            <div className="agromat-modal-body">
              <div style={{ background: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px 14px", marginBottom: "16px", fontSize: "0.85rem", color: "#0369a1", lineHeight: 1.5 }}>
                <strong>Columnas del Excel:</strong> Codigo, Razon Social, Domicilio, C. Postal, Localidad, Zona, Telefono, Fax, Provincia, CUIT, Mail, Contacto<br />
                Todos los campos son opcionales. Duplicados se detectan por CUIT y Codigo.
              </div>

              {!importResult && (
                <div style={{ textAlign: "center", padding: "24px 0" }}>
                  <input ref={fileInputRef} type="file" accept=".xlsx" onChange={handleImportFile} disabled={importLoading} style={{ display: "none" }} />
                  {importLoading ? (
                    <div style={{ color: "#6b7280" }}>
                      <div style={{ fontSize: "1.1em", marginBottom: "6px" }}>Procesando archivo...</div>
                      <div style={{ fontSize: "0.85em" }}>Esto puede tardar unos segundos</div>
                    </div>
                  ) : (
                    <button onClick={() => fileInputRef.current?.click()} className="agromat-btn-primary" style={{ padding: "12px 28px", fontSize: "0.95rem" }}>
                      Seleccionar archivo .xlsx
                    </button>
                  )}
                </div>
              )}

              {importResult && !importResult.error && (
                <div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "14px" }}>
                    <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.8em", fontWeight: 700, color: "#16a34a" }}>{importResult.creados}</div>
                      <div style={{ fontSize: "0.8rem", color: "#166534" }}>Creados</div>
                    </div>
                    <div style={{ background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.8em", fontWeight: 700, color: "#d97706" }}>{importResult.duplicados}</div>
                      <div style={{ fontSize: "0.8rem", color: "#92400e" }}>Duplicados</div>
                    </div>
                    <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.8em", fontWeight: 700, color: "#dc2626" }}>{importResult.errores}</div>
                      <div style={{ fontSize: "0.8rem", color: "#991b1b" }}>Errores</div>
                    </div>
                    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "14px", textAlign: "center" }}>
                      <div style={{ fontSize: "1.8em", fontWeight: 700, color: "#475569" }}>{importResult.total_filas}</div>
                      <div style={{ fontSize: "0.8rem", color: "#64748b" }}>Total filas</div>
                    </div>
                  </div>

                  {importResult.detalle_duplicados?.length > 0 && (
                    <details style={{ marginBottom: "10px" }}>
                      <summary style={{ cursor: "pointer", fontWeight: 600, color: "#d97706", marginBottom: "6px", fontSize: "0.9rem" }}>
                        Ver duplicados ({importResult.detalle_duplicados.length})
                      </summary>
                      <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "0.8rem", background: "#fffbeb", borderRadius: "6px", padding: "8px" }}>
                        {importResult.detalle_duplicados.map((d, i) => (
                          <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #fde68a" }}>
                            <strong>Fila {d.fila}:</strong> {d.razon}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {importResult.detalle_errores?.length > 0 && (
                    <details style={{ marginBottom: "10px" }}>
                      <summary style={{ cursor: "pointer", fontWeight: 600, color: "#dc2626", marginBottom: "6px", fontSize: "0.9rem" }}>
                        Ver errores ({importResult.detalle_errores.length})
                      </summary>
                      <div style={{ maxHeight: "120px", overflowY: "auto", fontSize: "0.8rem", background: "#fef2f2", borderRadius: "6px", padding: "8px" }}>
                        {importResult.detalle_errores.map((d, i) => (
                          <div key={i} style={{ padding: "3px 0", borderBottom: "1px solid #fecaca" }}>
                            <strong>Fila {d.fila}:</strong> {d.razon}
                          </div>
                        ))}
                      </div>
                    </details>
                  )}

                  {importResult.headers_detectados?.length > 0 && (
                    <details style={{ marginBottom: "10px" }}>
                      <summary style={{ cursor: "pointer", fontWeight: 600, color: "#6366f1", marginBottom: "6px", fontSize: "0.9rem" }}>
                        Columnas detectadas ({importResult.headers_detectados.length})
                      </summary>
                      <div style={{ fontSize: "0.8rem", background: "#eef2ff", borderRadius: "6px", padding: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                        {importResult.headers_detectados.map((h, i) => (
                          <span key={i} style={{ background: "#c7d2fe", padding: "2px 8px", borderRadius: "4px", fontFamily: "monospace", fontSize: "0.75rem" }}>{h}</span>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}

              {importResult?.error && (
                <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "14px", color: "#dc2626", textAlign: "center", fontSize: "0.9rem" }}>
                  {importResult.error}
                </div>
              )}
            </div>

            <div className="agromat-modal-footer">
              {importResult && !importResult.error && (
                <button className="agromat-btn-secondary" onClick={downloadReporte}>Descargar reporte</button>
              )}
              {importResult && (
                <button className="agromat-btn-primary" onClick={() => setImportResult(null)}>Importar otro</button>
              )}
              <button className="agromat-btn-secondary" onClick={() => setImportModalOpen(false)}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .clientes-mobile-only { display: none; }
        .clientes-desktop-only { display: block; }
        .clientes-table-row:hover { background: #f8fafc; }
        @media (max-width: 768px) {
          .clientes-mobile-only { display: block; }
          .clientes-desktop-only { display: none; }
        }
      `}</style>
    </div>
  );
}
