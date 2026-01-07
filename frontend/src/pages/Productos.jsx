// frontend/src/pages/Productos.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { getProveedores } from "../api/proveedores";
import { getZonas } from "../api/zonas";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  bulkDeleteProductos,
  descargarInventarioExcel,
} from "../api/productos";
import { uploadProductoImagen } from "../api/upload.js";

const BACKEND_URL = import.meta.env.VITE_API_URL;

const emptyForm = {
  id_producto: "",
  nombre_producto: "",
  descripcion: "",
  precio: "",
  existencias: "",
  id_proveedor: "",
  zonaId: "",
  imagen_url: "",
};

/* --- COMPONENTES AUXILIARES --- */
const StatCard = ({ title, value, colorText, colorValue, borderColor }) => (
  <div style={{ background: "white", borderRadius: "12px", padding: "12px 14px", border: `1px solid ${borderColor}`, boxShadow: "0 1px 3px rgba(0,0,0,0.04)" }}>
    <p style={{ margin: 0, fontSize: "0.8rem", color: colorText, textTransform: "uppercase", letterSpacing: "0.04em" }}>{title}</p>
    <p style={{ margin: "4px 0 0", fontSize: isNaN(Number(value)) ? "1.2rem" : "1.4rem", fontWeight: 700, color: colorValue }}>{value}</p>
  </div>
);

const SortableTh = ({ label, sortKey, currentSort, onSort, align = "left" }) => {
  const isActive = currentSort.key === sortKey;
  const icon = !isActive ? "↕" : currentSort.direction === "asc" ? "↑" : "↓";
  return (
    <th onClick={() => onSort(sortKey)} style={{ cursor: "pointer", padding: "12px 16px", textAlign: align, fontSize: "0.75rem", fontWeight: 600, color: isActive ? "#111827" : "#6b7280", textTransform: "uppercase", userSelect: "none", whiteSpace: "nowrap", background: isActive ? "#f3f4f6" : "transparent" }}>
      {label} <span style={{ fontSize: "0.8em", marginLeft: "4px" }}>{icon}</span>
    </th>
  );
};

/* --- COMPONENTE PRINCIPAL --- */
export default function Productos() {
  const navigate = useNavigate();

  // Estados de datos
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Estados de Moneda
  const [currency, setCurrency] = useState("USD");
  const [exchangeRate, setExchangeRate] = useState(0.92);

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD&to=EUR")
      .then((res) => res.json())
      .then((data) => { if (data?.rates?.EUR) setExchangeRate(data.rates.EUR); })
      .catch((err) => console.error("Error tasa cambio:", err));
  }, []);

  // Filtros
  const [q, setQ] = useState("");
  const [showNoStock, setShowNoStock] = useState(false);
  const [filterZona, setFilterZona] = useState("");
  const [filterProveedor, setFilterProveedor] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  
  // RESTAURADO: Estado para el umbral de bajo stock
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);
  const [isCustomPagination, setIsCustomPagination] = useState(false);

  // Formularios
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [zonas, setZonas] = useState([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  // Helpers
  const formatCurrency = (value) => {
    const num = Number(value || 0);
    if (currency === "EUR") {
      return (num * exchangeRate).toLocaleString("es-ES", { style: "currency", currency: "EUR", minimumFractionDigits: 2 });
    }
    return num.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  };

  const stats = useMemo(() => {
    const total = items.length;
    let sinStock = 0, bajoStock = 0, valor = 0;
    for (const p of items) {
      const stock = Number(p.existencias) || 0;
      const precio = Number(p.precio) || 0;
      if (stock === 0) sinStock++;
      else if (stock > 0 && stock <= lowStockThreshold) bajoStock++;
      valor += stock * precio;
    }
    if (currency === "EUR") valor *= exchangeRate;
    return { total, sinStock, bajoStock, valor };
  }, [items, lowStockThreshold, currency, exchangeRate]);

  // Filtrado y Ordenamiento
  const filtered = useMemo(() => {
    let result = [...items];
    const query = q.trim().toLowerCase();
    if (query) {
      result = result.filter(x => 
        x.id_producto?.toLowerCase().includes(query) || 
        x.nombre_producto?.toLowerCase().includes(query) || 
        x.descripcion?.toLowerCase().includes(query)
      );
    }
    if (showNoStock) result = result.filter(x => Number(x.existencias) === 0);
    if (filterZona) result = result.filter(x => String(x.zonaId) === String(filterZona));
    if (filterProveedor) result = result.filter(x => String(x.id_proveedor) === String(filterProveedor));

    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];
        if (typeof valA === "number" && typeof valB === "number") return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        const strA = String(valA ?? "").toLowerCase();
        const strB = String(valB ?? "").toLowerCase();
        if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
        if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [q, items, showNoStock, filterZona, filterProveedor, sortConfig]);

  // Lógica Paginación
  useEffect(() => setCurrentPage(1), [q, showNoStock, filterZona, filterProveedor, itemsPerPage]);

  const handleItemsPerPageChange = (e) => {
    const val = e.target.value;
    if (val === "custom") {
      setIsCustomPagination(true);
      setItemsPerPage((prev) => (typeof prev === 'number' ? prev : 50));
    } else if (val === "all") {
      setIsCustomPagination(false);
      setItemsPerPage("all");
    } else {
      setIsCustomPagination(false);
      setItemsPerPage(Number(val));
    }
  };

  const paginatedData = useMemo(() => {
    if (itemsPerPage === "all") return filtered;
    const lastIndex = currentPage * itemsPerPage;
    return filtered.slice(lastIndex - itemsPerPage, lastIndex);
  }, [filtered, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (itemsPerPage === "all") return 1;
    return Math.ceil(filtered.length / itemsPerPage);
  }, [filtered.length, itemsPerPage]);

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key, direction });
  };

  // Carga de datos
  const load = async () => {
    setLoading(true);
    try {
      const [resProductos, resProveedores, resZonas] = await Promise.all([getProductos(), getProveedores(), getZonas()]);
      setProveedores(resProveedores.data);
      setZonas(resZonas.data);
      const normalizados = resProductos.data.map(p => {
        const ubicacion = p.SeUbicas?.[0];
        let imagenUrl = p.imagen_url ?? "";
        if (imagenUrl && imagenUrl.startsWith("/")) imagenUrl = `${BACKEND_URL}${imagenUrl}`;
        return {
          id_producto: p.id_producto,
          nombre_producto: p.nombre_producto,
          descripcion: p.descripcion,
          precio: Number(p.precio ?? p.precio_unitario ?? 0),
          existencias: Number(p.stock),
          id_proveedor: p.id_proveedor,
          nombre_proveedor: p.Proveedor?.nombre_proveedor || "Sin proveedor",
          zonaId: ubicacion?.id_zona ? String(ubicacion.id_zona) : "",
          codigo_zona: ubicacion?.Zona?.codigo ?? null,
          imagen_url: imagenUrl,
          fecha_ultimo_ingreso: p.fecha_ultimo_ingreso || "N/A",
          fecha_ultimo_egreso: p.fecha_ultimo_egreso || "N/A",
        };
      });
      setItems(normalizados);
      setSelectedIds([]);
      setSelectionMode(false);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar los datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // Handlers CRUD y Exportar
  const handleExport = async () => {
    try {
      const response = await descargarInventarioExcel(currency, exchangeRate);
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const now = new Date();
      const fileName = `INVENTARIO_${currency}_${now.toISOString().slice(0, 10)}.xlsx`;
      const link = document.createElement("a");
      link.href = url; link.setAttribute("download", fileName); document.body.appendChild(link); link.click(); link.parentNode.removeChild(link);
      Swal.fire({ icon: 'success', title: 'Descarga iniciada', toast: true, position: 'top-end', timer: 3000, showConfirmButton: false });
    } catch (error) { console.error(error); Swal.fire("Error", "No se pudo descargar", "error"); }
  };

  const openCreate = () => { setEditingId(null); setForm(emptyForm); setModalOpen(true); };
  const openEdit = (row) => { setEditingId(row.id_producto); setForm({ ...emptyForm, ...row, zonaId: row.zonaId || "", imagen_url: row.imagen_url || "" }); setModalOpen(true); };

  const save = async (e) => {
    e.preventDefault();
    if (!form.id_proveedor) return Swal.fire("Error", "Selecciona proveedor", "warning");
    try {
      const payload = { ...form, precio: Number(form.precio), stock: Number(form.existencias), id_proveedor: Number(form.id_proveedor), zona: form.zonaId ? { id_zona: Number(form.zonaId) } : null };
      if (editingId) { await updateProducto(editingId, payload); Swal.fire("Actualizado", "", "success"); } 
      else { await createProducto(payload); Swal.fire("Creado", "", "success"); }
      setModalOpen(false); load();
    } catch (e) { Swal.fire("Error", e.response?.data?.error || "Error al guardar", "error"); }
  };

  const remove = async (row) => {
    const res = await Swal.fire({ title: "¿Eliminar?", text: row.nombre_producto, icon: "warning", showCancelButton: true });
    if (res.isConfirmed) { await deleteProducto(row.id_producto); load(); Swal.fire("Eliminado", "", "success"); }
  };

  const removeSelected = async () => {
    const res = await Swal.fire({ title: `¿Eliminar ${selectedIds.length}?`, icon: "warning", showCancelButton: true });
    if (res.isConfirmed) { await bulkDeleteProductos(selectedIds); load(); Swal.fire("Eliminados", "", "success"); }
  };

  const toggleSelect = (id) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleSelectAll = () => {
    const visible = paginatedData.map(p => p.id_producto);
    const all = visible.every(id => selectedIds.includes(id));
    setSelectedIds(prev => all ? prev.filter(id => !visible.includes(id)) : [...prev, ...visible.filter(id => !prev.includes(id))]);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const res = await uploadProductoImagen(file);
      setForm(f => ({ ...f, imagen_url: `${BACKEND_URL}${res.data.url}` }));
    }
  };

  const PaginationControls = () => {
    if (itemsPerPage === 'all' || filtered.length === 0) return null;
    return (
      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <button onClick={() => setCurrentPage(p => Math.max(p - 1, 1))} disabled={currentPage === 1} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: currentPage === 1 ? "#f3f4f6" : "white", cursor: currentPage === 1 ? "not-allowed" : "pointer" }}>&larr;</button>
        <span style={{ fontSize: "0.85rem", color: "#374151" }}>{currentPage} / {totalPages}</span>
        <button onClick={() => setCurrentPage(p => Math.min(p + 1, totalPages))} disabled={currentPage === totalPages} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", background: currentPage === totalPages ? "#f3f4f6" : "white", cursor: currentPage === totalPages ? "not-allowed" : "pointer" }}>&rarr;</button>
      </div>
    );
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* 1. Header */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111", marginBottom: "0.35rem" }}>📦 Inventario</h2>
        <p style={{ fontSize: "0.95rem", color: "#666" }}>Gestión de productos y existencias</p>
      </div>

      {/* 2. Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "12px", marginBottom: "1.5rem" }}>
        <StatCard title="Total productos" value={stats.total} colorText="#6b7280" colorValue="#111827" borderColor="#e5e7eb" />
        <StatCard title="Sin stock" value={stats.sinStock} colorText="#b91c1c" colorValue="#b91c1c" borderColor="#fee2e2" />
        <StatCard title={`Bajo stock (≤${lowStockThreshold})`} value={stats.bajoStock} colorText="#92400e" colorValue="#92400e" borderColor="#fef3c7" />
        <StatCard title={`Valor (${currency})`} value={formatCurrency(stats.valor)} colorText="#047857" colorValue="#047857" borderColor="#d1fae5" />
      </div>

      {/* 3. Toolbar */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "1.5rem" }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="🔍 Buscar..." style={{ flex: 1, minWidth: "200px", padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd" }} />
        <div style={{ display: "flex", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
          {["USD", "EUR"].map(m => (
            <button key={m} onClick={() => setCurrency(m)} style={{ padding: "10px 14px", border: "none", background: currency === m ? "#eff6ff" : "white", color: currency === m ? "#1d4ed8" : "#6b7280", fontWeight: currency === m ? "bold" : "normal", cursor: "pointer" }}>{m === "USD" ? "🇺🇸" : "🇪🇺"} {m}</button>
          ))}
        </div>
        {currency === "EUR" && <input type="number" step="0.01" value={exchangeRate} onChange={(e) => setExchangeRate(Number(e.target.value))} placeholder="Tasa" style={{ width: "70px", padding: "10px", borderRadius: "8px", border: "1px solid #ddd" }} />}
        
        <select value={filterZona} onChange={(e) => setFilterZona(e.target.value)} style={{ padding: "10px 14px", borderRadius: "8px", border: "1px solid #ddd", backgroundColor: "white" }}>
          <option value="">🗺️ Zonas</option>
          {zonas.map(z => <option key={z.id_zona} value={z.id_zona}>{z.codigo}</option>)}
        </select>
        
        <button onClick={() => setShowNoStock(!showNoStock)} style={{ padding: "10px 14px", borderRadius: "8px", border: showNoStock ? "1px solid #ef4444" : "1px solid #ddd", background: showNoStock ? "#fef2f2" : "white", color: showNoStock ? "#b91c1c" : "#374151", cursor: "pointer" }}>{showNoStock ? "🔴 Agotados" : "⚪ Agotados"}</button>

        {/* --- RESTAURADO: INPUT PARA CONFIGURAR STOCK BAJO --- */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", padding: "0 8px", background: "white", border: "1px solid #ddd", borderRadius: "8px", height: "38px" }}>
            <span style={{ fontSize: "0.8rem", color: "#6b7280", whiteSpace: "nowrap" }}>Bajo stock:</span>
            <input 
                type="number" 
                min="0" 
                value={lowStockThreshold} 
                onChange={(e) => { const val = Number(e.target.value); if (!Number.isNaN(val)) setLowStockThreshold(val < 0 ? 0 : val); }}
                style={{ width: "40px", border: "none", outline: "none", fontWeight: "bold", color: "#d97706", textAlign: "center", background: "transparent" }} 
            />
        </div>
        {/* --------------------------------------------------- */}
        
        <button onClick={load} style={{ background: "#f3f4f6", padding: "10px 14px", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer" }}>🔄</button>
        <button onClick={() => setSelectionMode(!selectionMode)} style={{ background: selectionMode ? "#e5e7eb" : "#f3f4f6", padding: "10px 14px", borderRadius: "8px", border: "1px solid #d1d5db", cursor: "pointer" }}>{selectionMode ? "Cancelar" : "Seleccionar"}</button>
        {selectionMode && <button onClick={removeSelected} disabled={!selectedIds.length} style={{ background: "#DC2626", color: "white", padding: "10px 14px", borderRadius: "8px", border: "none", cursor: "pointer" }}>Eliminar ({selectedIds.length})</button>}
        <button onClick={handleExport} style={{ background: "#10B981", color: "white", padding: "10px 14px", borderRadius: "8px", border: "none", cursor: "pointer" }}>Excel</button>
        <button onClick={openCreate} style={{ background: "#4F46E5", color: "white", padding: "10px 18px", borderRadius: "8px", border: "none", cursor: "pointer", fontWeight: 500 }}>➕ Nuevo</button>
      </div>

      {/* 4. Controls Paginación Top */}
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", background: "#f9fafb", padding: "10px", borderRadius: "8px", border: "1px solid #e5e7eb", flexWrap: "wrap", gap: "10px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
           <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Mostrando {itemsPerPage === 'all' ? filtered.length : Math.min(itemsPerPage * currentPage, filtered.length)} de {filtered.length}</span>
           <select value={isCustomPagination ? "custom" : itemsPerPage} onChange={handleItemsPerPageChange} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
              {[50, 100, 200, "all"].map(v => <option key={v} value={v}>{v === "all" ? "Todos" : v}</option>)}
           </select>
        </div>
        <PaginationControls />
      </div>

      {/* 5. Tabla */}
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)", border: "1px solid #e5e7eb", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
            <tr>
              {selectionMode && <th style={{ padding: "12px" }}><input type="checkbox" onChange={toggleSelectAll} /></th>}
              <th style={{ padding: "12px 16px", fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>FOTO</th>
              <SortableTh label="Código" sortKey="id_producto" currentSort={sortConfig} onSort={requestSort} />
              <SortableTh label="Nombre" sortKey="nombre_producto" currentSort={sortConfig} onSort={requestSort} />
              <SortableTh label="Proveedor" sortKey="nombre_proveedor" currentSort={sortConfig} onSort={requestSort} />
              <SortableTh label="Zona" sortKey="codigo_zona" currentSort={sortConfig} onSort={requestSort} />
              <SortableTh label="Últ. Ingreso" sortKey="fecha_ultimo_ingreso" currentSort={sortConfig} onSort={requestSort} />
              <SortableTh label="Últ. Egreso" sortKey="fecha_ultimo_egreso" currentSort={sortConfig} onSort={requestSort} />
              <SortableTh label="Precio" sortKey="precio" currentSort={sortConfig} onSort={requestSort} align="right" />
              <SortableTh label="Stock" sortKey="existencias" currentSort={sortConfig} onSort={requestSort} align="right" />
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.75rem", color: "#6b7280", textTransform: "uppercase" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? <tr><td colSpan={12} style={{ padding: "40px", textAlign: "center" }}>Cargando...</td></tr> : 
             paginatedData.length === 0 ? <tr><td colSpan={12} style={{ padding: "40px", textAlign: "center" }}>No hay productos</td></tr> :
             paginatedData.map((row) => {
               const stock = Number(row.existencias) || 0;
               const stockColor = stock === 0 ? "#b91c1c" : stock > 0 && stock <= lowStockThreshold ? "#92400e" : "#111827";
               const stockBg = stock === 0 ? "#fee2e2" : stock > 0 && stock <= lowStockThreshold ? "#fef3c7" : "transparent";

               return (
                <tr key={row.id_producto} style={{ borderTop: "1px solid #f3f4f6" }}>
                  {selectionMode && <td style={{ textAlign: "center" }}><input type="checkbox" checked={selectedIds.includes(row.id_producto)} onChange={() => toggleSelect(row.id_producto)} /></td>}
                  <td style={{ padding: "12px 16px" }}>{row.imagen_url ? <img src={row.imagen_url} style={{ width: 32, height: 32, borderRadius: 6, objectFit: "cover" }} /> : "📷"}</td>
                  <td style={{ padding: "12px 16px", fontWeight: 500 }}>{row.id_producto}</td>
                  <td style={{ padding: "12px 16px", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.nombre_producto}>{row.nombre_producto}</td>
                  <td style={{ padding: "12px 16px", maxWidth: 150, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#6b7280" }}>{row.nombre_proveedor}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{row.codigo_zona || "-"}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{row.fecha_ultimo_ingreso}</td>
                  <td style={{ padding: "12px 16px", color: "#6b7280" }}>{row.fecha_ultimo_egreso}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontWeight: 500 }}>{formatCurrency(row.precio)}</td>
                  <td style={{ padding: "12px 16px", textAlign: "right" }}><span style={{ padding: "4px 8px", borderRadius: 999, backgroundColor: stockBg, color: stockColor, fontSize: "0.85rem", fontWeight: 600 }}>{stock}</span></td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button onClick={() => navigate(`/app/productos/${row.id_producto}/historial`)} style={{ background: "#2563EB", color: "white", border: "none", borderRadius: 999, padding: "4px 10px", fontSize: "0.8rem", cursor: "pointer" }}>Historial</button>
                      <button onClick={() => openEdit(row)} style={{ background: "#F59E0B", color: "white", border: "none", borderRadius: 999, padding: "4px 10px", fontSize: "0.8rem", cursor: "pointer" }}>Editar</button>
                      <button onClick={() => remove(row)} style={{ background: "#DC2626", color: "white", border: "none", borderRadius: 999, padding: "4px 10px", fontSize: "0.8rem", cursor: "pointer" }}>Eliminar</button>
                    </div>
                  </td>
                </tr>
               )
             })}
          </tbody>
        </table>
        <div style={{ padding: "10px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}><PaginationControls /></div>
      </div>

      {/* 6. Modal */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.5)" }} onClick={() => setModalOpen(false)}>
          <div style={{ background: "white", borderRadius: "16px", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflow: "auto", padding: "20px" }} onClick={e => e.stopPropagation()}>
            <h3 style={{ fontSize: "1.25rem", margin: "0 0 20px 0" }}>{editingId ? "Editar" : "Nuevo"} Producto</h3>
            <form onSubmit={save} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <input placeholder="Código" value={form.id_producto} onChange={e => setForm({...form, id_producto: e.target.value})} disabled={!!editingId} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "8px", background: editingId ? "#f3f4f6" : "white" }} />
                <select value={form.id_proveedor} onChange={e => setForm({...form, id_proveedor: e.target.value})} required style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "8px" }}>
                  <option value="">Proveedor...</option>
                  {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor}</option>)}
                </select>
                <input placeholder="Nombre" value={form.nombre_producto} onChange={e => setForm({...form, nombre_producto: e.target.value})} required style={{ gridColumn: "1 / -1", padding: "10px", border: "1px solid #ddd", borderRadius: "8px" }} />
                <select value={form.zonaId} onChange={e => setForm({...form, zonaId: e.target.value})} style={{ gridColumn: "1 / -1", padding: "10px", border: "1px solid #ddd", borderRadius: "8px" }}>
                  <option value="">Zona (Opcional)</option>
                  {zonas.map(z => <option key={z.id_zona} value={z.id_zona}>{z.codigo}</option>)}
                </select>
                <input type="number" placeholder="Precio (USD)" value={form.precio} onChange={e => setForm({...form, precio: e.target.value})} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "8px" }} />
                <input type="number" placeholder="Stock" value={form.existencias} onChange={e => setForm({...form, existencias: e.target.value})} style={{ padding: "10px", border: "1px solid #ddd", borderRadius: "8px" }} />
                <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", alignItems: "center" }}>
                   <button type="button" onClick={() => fileInputRef.current.click()} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}>📂 Archivo</button>
                   <button type="button" onClick={() => cameraInputRef.current.click()} style={{ padding: "8px", border: "1px solid #ddd", borderRadius: "6px", cursor: "pointer" }}>📷 Cámara</button>
                   <input type="text" placeholder="URL imagen..." value={form.imagen_url} onChange={e => setForm({...form, imagen_url: e.target.value})} style={{ flex: 1, padding: "8px", border: "1px solid #ddd", borderRadius: "6px" }} />
                   <input type="file" ref={fileInputRef} hidden accept="image/*" onChange={handleFileChange} />
                   <input type="file" ref={cameraInputRef} hidden accept="image/*" capture onChange={handleFileChange} />
                </div>
                {form.imagen_url && <img src={form.imagen_url} style={{ width: 60, height: 60, borderRadius: 6, objectFit: "cover" }} />}
                <div style={{ gridColumn: "1 / -1", display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "10px" }}>
                   <button type="button" onClick={() => setModalOpen(false)} style={{ padding: "10px 20px", border: "1px solid #ddd", borderRadius: "8px", background: "white", cursor: "pointer" }}>Cancelar</button>
                   <button type="submit" style={{ padding: "10px 20px", border: "none", borderRadius: "8px", background: "#4F46E5", color: "white", cursor: "pointer" }}>Guardar</button>
                </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}