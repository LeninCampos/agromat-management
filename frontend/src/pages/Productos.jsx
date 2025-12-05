// frontend/src/pages/Productos.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import { getProveedores } from "../api/proveedores";
import { getZonas } from "../api/zonas";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
  bulkDeleteProductos,
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

export default function Productos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");

  // 🔽 NUEVOS ESTADOS PARA FILTROS Y ORDEN
  const [showNoStock, setShowNoStock] = useState(false);
  const [filterZona, setFilterZona] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [zonas, setZonas] = useState([]);

  // Selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fileInputRef = useRef(null);

  // 🔍 FILTRO Y ORDENAMIENTO (Lógica central mejorada)
  const filtered = useMemo(() => {
    let result = [...items];

    // 1. Búsqueda de texto
    const query = q.trim().toLowerCase();
    if (query) {
      result = result.filter(
        (x) =>
          x.id_producto?.toLowerCase().includes(query) ||
          x.nombre_producto?.toLowerCase().includes(query) ||
          x.descripcion?.toLowerCase().includes(query)
      );
    }

    // 2. Filtro "Sin Stock"
    if (showNoStock) {
      result = result.filter((x) => Number(x.existencias) === 0);
    }

    // 3. Filtro por Zona
    if (filterZona) {
      result = result.filter((x) => String(x.zonaId) === String(filterZona));
    }

    // 4. Ordenamiento
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        // Manejo especial para números
        if (typeof valA === 'number' && typeof valB === 'number') {
          return sortConfig.direction === 'asc' ? valA - valB : valB - valA;
        }

        // Manejo de strings
        const strA = String(valA).toLowerCase();
        const strB = String(valB).toLowerCase();
        if (strA < strB) return sortConfig.direction === 'asc' ? -1 : 1;
        if (strA > strB) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [q, items, showNoStock, filterZona, sortConfig]);

  // Función para pedir ordenamiento al hacer clic en header
  const requestSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Helper para mostrar flechita
  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "↕"; // neutro
    return sortConfig.direction === 'asc' ? "↑" : "↓";
  };

  // 📦 Cargar datos
  const load = async () => {
    setLoading(true);
    try {
      const [resProductos, resProveedores, resZonas] = await Promise.all([
        getProductos(),
        getProveedores(),
        getZonas(),
      ]);

      setProveedores(resProveedores.data);
      setZonas(resZonas.data);

      const normalizados = resProductos.data.map((p) => {
        const ubicacion = p.SeUbicas?.[0];
        const id_zona = ubicacion?.id_zona ?? null;
        const codigo_zona = ubicacion?.Zona?.codigo ?? null;

        let imagenUrl = p.imagen_url ?? "";
        if (imagenUrl && imagenUrl.startsWith("/")) {
          imagenUrl = `${BACKEND_URL}${imagenUrl}`;
        }

        return {
          id_producto: p.id_producto,
          nombre_producto: p.nombre_producto,
          descripcion: p.descripcion,
          precio: Number(p.precio), // asegurar número para sort
          existencias: Number(p.stock), // asegurar número para sort
          id_proveedor: p.id_proveedor,
          nombre_proveedor: p.Proveedor?.nombre_proveedor || "Sin proveedor",
          zonaId: id_zona ? String(id_zona) : "",
          codigo_zona,
          imagen_url: imagenUrl,
          // Fechas placeholder
          fecha_ultimo_ingreso: "N/A",
          fecha_ultimo_egreso: "N/A",
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

  useEffect(() => {
    load();
  }, []);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_producto);
    setForm({
      id_producto: row.id_producto,
      nombre_producto: row.nombre_producto ?? "",
      descripcion: row.descripcion ?? "",
      precio: row.precio ?? "",
      existencias: row.existencias ?? "",
      id_proveedor: row.id_proveedor ?? "",
      zonaId: row.zonaId ?? "",
      imagen_url: row.imagen_url ?? "",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();

    if (!form.id_proveedor) {
      Swal.fire("Error", "Selecciona un proveedor", "warning");
      return;
    }

    // Validar ID único al crear
    if (!editingId) {
      const existeId = items.some(
        (item) => item.id_producto.toLowerCase() === form.id_producto.toLowerCase()
      );
      if (existeId) {
        Swal.fire("Error", `El código "${form.id_producto}" ya existe. Usa otro.`, "error");
        return;
      }
    }

    try {
      let zonaObj = null;
      if (form.zonaId) {
        zonaObj = { id_zona: Number(form.zonaId) };
      }

      const payload = {
        id_producto: form.id_producto,
        nombre_producto: form.nombre_producto,
        descripcion: form.descripcion || null,
        precio: Number(form.precio) || 0,
        stock: Number(form.existencias) || 0,
        id_proveedor: Number(form.id_proveedor),
        zona: zonaObj,
        imagen_url: form.imagen_url || null,
      };

      if (editingId) {
        await updateProducto(editingId, payload);
        Swal.fire("✅ Listo", "Producto actualizado correctamente", "success");
      } else {
        await createProducto(payload);
        Swal.fire("✅ Listo", "Producto creado correctamente", "success");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load();
    } catch (e) {
      console.error(e);
      const errorMsg = e.response?.data?.error || "No pude guardar el producto";
      Swal.fire("Error", errorMsg, "error");
    }
  };

  const toggleSelect = (id_producto) => {
    setSelectedIds((prev) =>
      prev.includes(id_producto)
        ? prev.filter((id) => id !== id_producto)
        : [...prev, id_producto]
    );
  };

  const toggleSelectAllVisible = () => {
    const visibleIds = filtered.map((p) => p.id_producto);
    const allSelected = visibleIds.every((id) => selectedIds.includes(id));

    if (allSelected) {
      setSelectedIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedIds((prev) => [
        ...prev,
        ...visibleIds.filter((id) => !prev.includes(id)),
      ]);
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `${row.nombre_producto}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });
    if (!result.isConfirmed) return;

    try {
      await deleteProducto(row.id_producto);
      Swal.fire("🗑️ Eliminado", "Producto eliminado correctamente", "success");
      await load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar el producto", "error");
    }
  };

  const removeSelected = async () => {
    if (selectedIds.length === 0) {
      Swal.fire("Nada seleccionado", "Selecciona al menos un producto", "info");
      return;
    }

    const result = await Swal.fire({
      title: `¿Eliminar ${selectedIds.length} productos?`,
      text: "Se eliminarán también sus movimientos relacionados.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!result.isConfirmed) return;

    try {
      await bulkDeleteProductos(selectedIds);
      Swal.fire("Eliminados", "Productos eliminados correctamente", "success");
      await load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar los productos seleccionados", "error");
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const res = await uploadProductoImagen(file);
      let url = res.data.url;

      if (url && url.startsWith("/")) {
        url = `${BACKEND_URL}${url}`;
      }

      setForm((f) => ({
        ...f,
        imagen_url: url,
      }));

      Swal.fire("✅ Listo", "Imagen subida correctamente", "success");
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No pude subir la imagen", "error");
    } finally {
      e.target.value = "";
    }
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div style={{ padding: "1.5rem" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111", marginBottom: "0.5rem" }}>
          📦 Inventario
        </h2>
        <p style={{ fontSize: "0.95rem", color: "#666" }}>
          Gestión de productos y existencias
        </p>
      </div>

      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "1.5rem" }}>

        {/* BUSCADOR */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Buscar por código, nombre..."
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "0.95rem",
          }}
        />

        {/* 13. FILTRO POR ZONA */}
        <select
          value={filterZona}
          onChange={(e) => setFilterZona(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            cursor: "pointer",
            backgroundColor: "white",
          }}
        >
          <option value="">🗺️ Todas las zonas</option>
          {zonas.map((z) => (
            <option key={z.id_zona} value={z.id_zona}>
              {z.codigo}
            </option>
          ))}
        </select>

        {/* 12. FILTRO SIN STOCK */}
        <button
          onClick={() => setShowNoStock(!showNoStock)}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: showNoStock ? "1px solid #ef4444" : "1px solid #ddd",
            backgroundColor: showNoStock ? "#fef2f2" : "white",
            color: showNoStock ? "#b91c1c" : "#374151",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          {showNoStock ? "🔴 Viendo Agotados" : "⚪ Ver Agotados"}
        </button>

        <button onClick={load} style={{ background: "#f3f4f6", padding: "10px 14px", border: "1px solid #ddd", borderRadius: "8px", cursor: "pointer" }}>
          🔄
        </button>

        {/* SELECCIÓN MÚLTIPLE */}
        <button
          onClick={() => setSelectionMode((v) => !v)}
          style={{
            background: selectionMode ? "#e5e7eb" : "#f3f4f6",
            color: "#111827",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #d1d5db",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          {selectionMode ? "Cancelar" : "Seleccionar"}
        </button>

        {selectionMode && (
          <button
            onClick={removeSelected}
            disabled={selectedIds.length === 0}
            style={{
              background: selectedIds.length === 0 ? "#fecaca" : "#DC2626",
              color: "white",
              padding: "10px 14px",
              borderRadius: "8px",
              border: "none",
              cursor: selectedIds.length === 0 ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            Eliminar ({selectedIds.length})
          </button>
        )}

        <button
          onClick={openCreate}
          style={{
            background: "#4F46E5",
            color: "white",
            padding: "10px 18px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          ➕ Nuevo
        </button>
      </div>

      {/* 14. CONTADOR DE RESULTADOS */}
      <div style={{ marginBottom: "10px", fontSize: "0.85rem", color: "#6b7280" }}>
        Mostrando <strong>{filtered.length}</strong> de <strong>{items.length}</strong> productos
      </div>

      {/* TABLA */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
          border: "1px solid #e5e7eb",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
            <tr>
              {selectionMode && (
                <th style={{ padding: "12px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    onChange={toggleSelectAllVisible}
                    checked={
                      filtered.length > 0 &&
                      filtered.every((p) => selectedIds.includes(p.id_producto))
                    }
                  />
                </th>
              )}
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Foto
              </th>
              {/* 11. ORDENAMIENTO CLICK EN HEADERS */}
              <th onClick={() => requestSort('id_producto')} style={{ cursor: "pointer", padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Código {getSortIcon('id_producto')}
              </th>
              <th onClick={() => requestSort('nombre_producto')} style={{ cursor: "pointer", padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Nombre {getSortIcon('nombre_producto')}
              </th>
              <th onClick={() => requestSort('nombre_proveedor')} style={{ cursor: "pointer", padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Proveedor {getSortIcon('nombre_proveedor')}
              </th>
              <th onClick={() => requestSort('codigo_zona')} style={{ cursor: "pointer", padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Zona {getSortIcon('codigo_zona')}
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Últ. Ingreso
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Últ. Egreso
              </th>
              <th onClick={() => requestSort('precio')} style={{ cursor: "pointer", padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Precio {getSortIcon('precio')}
              </th>
              <th onClick={() => requestSort('existencias')} style={{ cursor: "pointer", padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Stock {getSortIcon('existencias')}
              </th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <p>Cargando productos...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: "40px" }}>
                  <p style={{ fontWeight: 500 }}>No hay productos</p>
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id_producto}
                  style={{ borderTop: "1px solid #f3f4f6", transition: "background 0.15s" }}
                  onMouseEnter={(e) => e.currentTarget.style.background = "#f9fafb"}
                  onMouseLeave={(e) => e.currentTarget.style.background = "white"}
                >
                  {selectionMode && (
                    <td style={{ padding: "12px", textAlign: "center" }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(row.id_producto)}
                        onChange={() => toggleSelect(row.id_producto)}
                      />
                    </td>
                  )}
                  <td style={{ padding: "12px 16px" }}>
                    {/* 8. REDUCIR ESPACIO FOTO A 32px */}
                    {row.imagen_url ? (
                      <img
                        src={row.imagen_url}
                        alt="Foto"
                        style={{
                          width: "32px",
                          height: "32px",
                          objectFit: "cover",
                          borderRadius: "6px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "6px",
                          background: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.6rem",
                          color: "#9ca3af",
                        }}
                      >
                        📷
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.9rem", fontWeight: 500, color: "#111" }}>
                    {row.id_producto}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#111" }}>
                    {row.nombre_producto}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#6b7280" }}>
                    {row.nombre_proveedor}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#6b7280" }}>
                    {row.codigo_zona || "Sin asignar"}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#6b7280" }}>
                    {row.fecha_ultimo_ingreso}
                  </td>
                  <td style={{ padding: "12px 16px", fontSize: "0.9rem", color: "#6b7280" }}>
                    {row.fecha_ultimo_egreso}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.9rem", fontWeight: 500, color: "#111" }}>
                    ${Number(row.precio).toFixed(2)}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.9rem", fontWeight: 500, color: row.existencias === 0 ? "#ef4444" : "#111" }}>
                    {row.existencias}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      {/* ✅ CAMBIO: Botón Editar estandarizado */}
                      <button
                        onClick={() => openEdit(row)}
                        style={{
                          background: "#F59E0B",
                          color: "white",
                          padding: "5px 12px",
                          borderRadius: "999px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 500,
                        }}
                      >
                        Editar
                      </button>

                      {/* ✅ CAMBIO: Botón Eliminar estandarizado */}
                      <button
                        onClick={() => remove(row)}
                        style={{
                          background: "#DC2626",
                          color: "white",
                          padding: "5px 12px",
                          borderRadius: "999px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.8rem",
                          fontWeight: 500,
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
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
          onClick={() => setModalOpen(false)}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
            }}
          />

          {/* Modal */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "white",
              borderRadius: "16px",
              boxShadow: "0 25px 50px rgba(0,0,0,0.3)",
              width: "100%",
              maxWidth: "700px",
              maxHeight: "90vh",
              overflow: "auto",
            }}
          >
            {/* Header */}
            <div style={{ borderBottom: "1px solid #f3f4f6", padding: "20px 24px" }}>
              <h3 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#111", margin: 0 }}>
                {editingId ? "Editar producto" : "Nuevo producto"}
              </h3>
              <p style={{ marginTop: "4px", fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>
                {editingId ? "Actualiza la información del producto" : "Completa los datos del nuevo producto"}
              </p>
            </div>

            {/* Form */}
            <form onSubmit={save} style={{ padding: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Código (ID)
                  </label>
                  <input
                    type="text"
                    value={form.id_producto}
                    onChange={(e) => setForm((f) => ({ ...f, id_producto: e.target.value }))}
                    disabled={!!editingId}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      background: editingId ? "#f3f4f6" : "white",
                      cursor: editingId ? "not-allowed" : "text",
                    }}
                    placeholder="Ej: PROD001"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Proveedor
                  </label>
                  <select
                    value={form.id_proveedor}
                    onChange={(e) => setForm((f) => ({ ...f, id_proveedor: e.target.value }))}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                  >
                    <option value="">Selecciona...</option>
                    {proveedores.map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre_proveedor}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    value={form.nombre_producto}
                    onChange={(e) => setForm((f) => ({ ...f, nombre_producto: e.target.value }))}
                    required
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                    placeholder="Ej: Fertilizante NPK 20-20-20"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Zona de ubicación (opcional)
                  </label>
                  <select
                    value={form.zonaId}
                    onChange={(e) => setForm((f) => ({ ...f, zonaId: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                  >
                    <option value="">-- Sin asignar --</option>
                    {zonas.map((z) => (
                      <option key={z.id_zona} value={z.id_zona}>
                        {z.codigo} - Rack {z.rack}, módulo {z.modulo}, piso {z.piso}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) => setForm((f) => ({ ...f, descripcion: e.target.value }))}
                    rows={2}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                      fontFamily: "inherit",
                    }}
                    placeholder="Detalles adicionales..."
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Precio unitario
                  </label>
                  <input
                    type="number"
                    value={form.precio}
                    onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Existencias (Stock)
                  </label>
                  <input
                    type="number"
                    value={form.existencias}
                    onChange={(e) => setForm((f) => ({ ...f, existencias: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                    placeholder="0"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Imagen (Subir o URL)
                  </label>

                  <div style={{ display: "flex", gap: "10px", marginBottom: "8px" }}>
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      style={{
                        background: "#f3f4f6",
                        border: "1px solid #d1d5db",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                      }}
                    >
                      📂 Elegir archivo
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />
                    <input
                      type="text"
                      value={form.imagen_url}
                      onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
                      placeholder="O pega una URL aquí..."
                      style={{
                        flex: 1,
                        padding: "8px 12px",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        fontSize: "0.9rem",
                      }}
                    />
                  </div>
                  {form.imagen_url && (
                    <div style={{ marginTop: "10px" }}>
                      <img
                        src={form.imagen_url}
                        alt="Vista previa"
                        style={{
                          width: "80px",
                          height: "80px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #ddd",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div style={{ marginTop: "24px", display: "flex", justifyContent: "flex-end", gap: "12px" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    background: "white",
                    border: "1px solid #d1d5db",
                    padding: "10px 18px",
                    borderRadius: "8px",
                    color: "#374151",
                    fontWeight: 500,
                    cursor: "pointer",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    background: "#4F46E5",
                    border: "none",
                    padding: "10px 24px",
                    borderRadius: "8px",
                    color: "white",
                    fontWeight: 500,
                    cursor: "pointer",
                    boxShadow: "0 4px 6px -1px rgba(79, 70, 229, 0.2)",
                  }}
                >
                  Guardar producto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}