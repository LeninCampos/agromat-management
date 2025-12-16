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

export default function Productos() {
  const navigate = useNavigate();

  // Estados de datos
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filtros y Búsqueda
  const [q, setQ] = useState("");
  const [showNoStock, setShowNoStock] = useState(false);
  const [filterZona, setFilterZona] = useState("");
  const [filterProveedor, setFilterProveedor] = useState(""); // <-- NUEVO: Filtro Proveedor
  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [lowStockThreshold, setLowStockThreshold] = useState(10);

  // --- ESTADOS DE PAGINACIÓN ---
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50); 
  const [isCustomPagination, setIsCustomPagination] = useState(false);

  // Modal y Formularios
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [zonas, setZonas] = useState([]);

  // Selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // Referencias para inputs de archivo
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString("es-MX", {
      style: "currency",
      currency: "MXN",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  // 🔢 Estadísticas generales
  const stats = useMemo(() => {
    const total = items.length;
    let sinStock = 0;
    let bajoStock = 0;
    let valor = 0;

    for (const p of items) {
      const stock = Number(p.existencias) || 0;
      const precio = Number(p.precio) || 0;

      if (stock === 0) {
        sinStock += 1;
      } else if (stock > 0 && stock <= lowStockThreshold) {
        bajoStock += 1;
      }

      valor += stock * precio;
    }

    return { total, sinStock, bajoStock, valor };
  }, [items, lowStockThreshold]);

  // 🔍 FILTRO Y ORDENAMIENTO
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

    // 4. Filtro por Proveedor (NUEVO)
    if (filterProveedor) {
      result = result.filter((x) => String(x.id_proveedor) === String(filterProveedor));
    }

    // 5. Ordenamiento
    if (sortConfig.key) {
      result.sort((a, b) => {
        const valA = a[sortConfig.key];
        const valB = b[sortConfig.key];

        if (typeof valA === "number" && typeof valB === "number") {
          return sortConfig.direction === "asc" ? valA - valB : valB - valA;
        }

        const strA = String(valA ?? "").toLowerCase();
        const strB = String(valB ?? "").toLowerCase();
        if (strA < strB) return sortConfig.direction === "asc" ? -1 : 1;
        if (strA > strB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [q, items, showNoStock, filterZona, filterProveedor, sortConfig]); // Agregado filterProveedor a dependencias

  // --- LÓGICA DE PAGINACIÓN ---
  
  // 1. Resetear página a 1 cuando cambian filtros
  useEffect(() => {
    setCurrentPage(1);
  }, [q, showNoStock, filterZona, filterProveedor, itemsPerPage]);

  // 2. Calcular datos de la página actual
  const paginatedData = useMemo(() => {
    if (itemsPerPage === "all") return filtered;
    
    const lastIndex = currentPage * itemsPerPage;
    const firstIndex = lastIndex - itemsPerPage;
    return filtered.slice(firstIndex, lastIndex);
  }, [filtered, currentPage, itemsPerPage]);

  // 3. Calcular total de páginas
  const totalPages = useMemo(() => {
    if (itemsPerPage === "all") return 1;
    return Math.ceil(filtered.length / itemsPerPage);
  }, [filtered.length, itemsPerPage]);

  // 4. Manejador del select "Items por página"
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

  const requestSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
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

        const precioRaw =
          p.precio !== undefined && p.precio !== null
            ? p.precio
            : p.precio_unitario ?? 0;

        return {
          id_producto: p.id_producto,
          nombre_producto: p.nombre_producto,
          descripcion: p.descripcion,
          precio: Number(precioRaw),
          existencias: Number(p.stock),
          id_proveedor: p.id_proveedor,
          nombre_proveedor: p.Proveedor?.nombre_proveedor || "Sin proveedor",
          zonaId: id_zona ? String(id_zona) : "",
          codigo_zona,
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

  useEffect(() => {
    load();
  }, []);

  const handleExport = async () => {
    try {
      const response = await descargarInventarioExcel();
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      const now = new Date();
      const mm = String(now.getMonth() + 1).padStart(2, '0');
      const dd = String(now.getDate()).padStart(2, '0');
      const aa = String(now.getFullYear()).slice(-2);
      
      const fileName = `INVENTARIO A DIA ${mm}-${dd}-${aa}.xlsx`;

      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      Swal.fire({
        icon: 'success',
        title: 'Descarga iniciada',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      });
    } catch (error) {
      console.error("Error descargando excel:", error);
      Swal.fire("Error", "No se pudo descargar el reporte", "error");
    }
  };

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

    if (!editingId) {
      const existeId = items.some(
        (item) =>
          item.id_producto.toLowerCase() === form.id_producto.toLowerCase()
      );
      if (existeId) {
        Swal.fire(
          "Error",
          `El código "${form.id_producto}" ya existe. Usa otro.`,
          "error"
        );
        return;
      }
    }

    try {
      let zonaObj = null;
      if (form.zonaId) zonaObj = { id_zona: Number(form.zonaId) };

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
    const visibleIds = paginatedData.map((p) => p.id_producto);
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
      Swal.fire(
        "Error",
        "No pude eliminar los productos seleccionados",
        "error"
      );
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

  const triggerCameraInput = () => {
    if (cameraInputRef.current) {
      cameraInputRef.current.click();
    }
  };

  // COMPONENTE O VARIABLE DE CONTROLES DE PAGINACIÓN (Para reutilizar Arriba y Abajo)
  const renderPaginationControls = () => {
    if (itemsPerPage === 'all' || filtered.length === 0) return null;

    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
            <button
                onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                disabled={currentPage === 1}
                style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: currentPage === 1 ? "#f3f4f6" : "white",
                    color: currentPage === 1 ? "#9ca3af" : "#374151",
                    cursor: currentPage === 1 ? "not-allowed" : "pointer",
                    fontSize: "0.85rem"
                }}
            >
                &larr; Ant
            </button>
            
            <span style={{ fontSize: "0.85rem", color: "#374151", whiteSpace: "nowrap" }}>
                Pág <strong>{currentPage}</strong> de <strong>{totalPages}</strong>
            </span>

            <button
                onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                disabled={currentPage === totalPages}
                style={{
                    padding: "6px 12px",
                    borderRadius: "6px",
                    border: "1px solid #d1d5db",
                    background: currentPage === totalPages ? "#f3f4f6" : "white",
                    color: currentPage === totalPages ? "#9ca3af" : "#374151",
                    cursor: currentPage === totalPages ? "not-allowed" : "pointer",
                    fontSize: "0.85rem"
                }}
            >
                Sig &rarr;
            </button>
        </div>
    );
  };

  // ========================= JSX =========================
  return (
    <div style={{ padding: "1.5rem" }}>
      {/* HEADER */}
      <div style={{ marginBottom: "1.25rem" }}>
        <h2
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            color: "#111",
            marginBottom: "0.35rem",
          }}
        >
          📦 Inventario
        </h2>
        <p style={{ fontSize: "0.95rem", color: "#666" }}>
          Gestión de productos y existencias
        </p>
      </div>

      {/* CARDS DE ESTADÍSTICAS */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", // Mejor responsividad en grid
          gap: "12px",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px 14px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "#6b7280",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Total productos
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#111827",
            }}
          >
            {stats.total}
          </p>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px 14px",
            border: "1px solid #fee2e2",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "#b91c1c",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Sin stock
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#b91c1c",
            }}
          >
            {stats.sinStock}
          </p>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px 14px",
            border: "1px solid #fef3c7",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "#92400e",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Bajo stock (≤{lowStockThreshold})
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#92400e",
            }}
          >
            {stats.bajoStock}
          </p>
        </div>

        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "12px 14px",
            border: "1px solid #d1fae5",
            boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "0.8rem",
              color: "#047857",
              textTransform: "uppercase",
              letterSpacing: "0.04em",
            }}
          >
            Valor inventario
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "1.2rem",
              fontWeight: 700,
              color: "#047857",
            }}
          >
            {formatCurrency(stats.valor)}
          </p>
        </div>
      </div>

      {/* BARRA DE HERRAMIENTAS SUPERIOR */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "12px",
          alignItems: "center",
          marginBottom: "1.5rem",
        }}
      >
        {/* BUSCADOR */}
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Buscar..."
          style={{
            flex: 1,
            minWidth: "200px",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "0.95rem",
          }}
        />

        {/* FILTRO POR ZONA */}
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
            maxWidth: "180px"
          }}
        >
          <option value="">🗺️ Zonas</option>
          {zonas.map((z) => (
            <option key={z.id_zona} value={z.id_zona}>
              {z.codigo}
            </option>
          ))}
        </select>

        {/* FILTRO POR PROVEEDOR (NUEVO) */}
        <select
          value={filterProveedor}
          onChange={(e) => setFilterProveedor(e.target.value)}
          style={{
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "0.9rem",
            cursor: "pointer",
            backgroundColor: "white",
            maxWidth: "180px"
          }}
        >
          <option value="">🏭 Proveedores</option>
          {proveedores.map((p) => (
            <option key={p.id_proveedor} value={p.id_proveedor}>
              {p.nombre_proveedor}
            </option>
          ))}
        </select>

        {/* FILTRO SIN STOCK */}
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
            whiteSpace: "nowrap"
          }}
        >
          {showNoStock ? "🔴 Agotados" : "⚪ Agotados"}
        </button>

        {/* INPUT PARA UMBRAL DE BAJO STOCK */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "0 4px",
            background: "white",
            border: "1px solid #eee",
            borderRadius: "8px",
            paddingRight: "8px"
          }}
        >
          <span
            style={{
              fontSize: "0.8rem",
              color: "#6b7280",
              whiteSpace: "nowrap",
              paddingLeft: "8px"
            }}
          >
            Bajo stock:
          </span>
          <input
            type="number"
            min={0}
            value={lowStockThreshold}
            onChange={(e) => {
              const val = Number(e.target.value);
              if (Number.isNaN(val)) return;
              setLowStockThreshold(val < 0 ? 0 : val);
            }}
            style={{
              width: "60px",
              padding: "6px 4px",
              border: "none",
              background: "transparent",
              fontSize: "0.85rem",
              textAlign: "center"
            }}
          />
        </div>

        <button
          onClick={load}
          style={{
            background: "#f3f4f6",
            padding: "10px 14px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            cursor: "pointer",
          }}
          title="Recargar"
        >
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
            whiteSpace: "nowrap"
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
              whiteSpace: "nowrap"
            }}
          >
            Eliminar ({selectedIds.length})
          </button>
        )}

        {/* Botón para Exportar Excel */}
        <button
          onClick={handleExport}
          style={{
            background: "#10B981", // Verde
            color: "white",
            padding: "10px 14px",
            borderRadius: "8px",
            border: "none",
            cursor: "pointer",
            fontSize: "0.9rem",
            display: "flex",
            alignItems: "center",
            gap: "6px"
          }}
          title="Exportar a Excel"
        >
          <span>Exportar</span>
        </button>

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
            whiteSpace: "nowrap"
          }}
        >
          ➕ Nuevo
        </button>
      </div>

      {/* --- BARRA DE CONTROL DE PAGINACIÓN SUPERIOR --- */}
      <div 
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "10px",
          flexWrap: "wrap",
          gap: "10px",
          background: "#f9fafb",
          padding: "10px",
          borderRadius: "8px",
          border: "1px solid #e5e7eb"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "15px", flexWrap: "wrap" }}>
            <div style={{ fontSize: "0.85rem", color: "#6b7280" }}>
            Mostrando <strong>{itemsPerPage === 'all' ? filtered.length : Math.min(itemsPerPage * currentPage, filtered.length)}</strong> de <strong>{filtered.length}</strong>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ fontSize: "0.85rem", color: "#6b7280" }}>Ver:</span>
                <select
                    value={isCustomPagination ? "custom" : itemsPerPage}
                    onChange={handleItemsPerPageChange}
                    style={{
                        padding: "4px 8px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        fontSize: "0.85rem",
                        cursor: "pointer",
                        backgroundColor: "white"
                    }}
                >
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={200}>200</option>
                    <option value="all">Todos</option>
                    <option value="custom">Otro...</option>
                </select>
                
                {isCustomPagination && (
                    <input
                        type="number"
                        min="1"
                        value={itemsPerPage}
                        onChange={(e) => {
                            const val = Number(e.target.value);
                            if (val > 0) setItemsPerPage(val);
                        }}
                        style={{
                            width: "60px",
                            padding: "4px",
                            borderRadius: "6px",
                            border: "1px solid #3b82f6",
                            fontSize: "0.85rem"
                        }}
                        placeholder="#"
                    />
                )}
            </div>
        </div>

        {/* Paginación Arriba */}
        {renderPaginationControls()}
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
          <thead
            style={{
              background: "#f9fafb",
              borderBottom: "2px solid #e5e7eb",
            }}
          >
            <tr>
              {selectionMode && (
                <th style={{ padding: "12px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    onChange={toggleSelectAllVisible}
                    checked={
                      paginatedData.length > 0 &&
                      paginatedData.every((p) =>
                        selectedIds.includes(p.id_producto)
                      )
                    }
                  />
                </th>
              )}
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                Foto
              </th>
              <th
                onClick={() => requestSort("id_producto")}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap"
                }}
              >
                Código {getSortIcon("id_producto")}
              </th>
              <th
                onClick={() => requestSort("nombre_producto")}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                Nombre {getSortIcon("nombre_producto")}
              </th>
              <th
                onClick={() => requestSort("nombre_proveedor")}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                Proveedor {getSortIcon("nombre_proveedor")}
              </th>
              <th
                onClick={() => requestSort("codigo_zona")}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap"
                }}
              >
                Zona {getSortIcon("codigo_zona")}
              </th>
              {/* Encabezados de Fecha ORDENABLES */}
              <th
                onClick={() => requestSort("fecha_ultimo_ingreso")}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap"
                }}
              >
                Últ. Ingreso {getSortIcon("fecha_ultimo_ingreso")}
              </th>
              <th
                onClick={() => requestSort("fecha_ultimo_egreso")}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  textAlign: "left",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap"
                }}
              >
                Últ. Egreso {getSortIcon("fecha_ultimo_egreso")}
              </th>
              <th
                onClick={() => requestSort("precio")}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                Precio {getSortIcon("precio")}
              </th>
              <th
                onClick={() => requestSort("existencias")}
                style={{
                  cursor: "pointer",
                  padding: "12px 16px",
                  textAlign: "right",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                Stock {getSortIcon("existencias")}
              </th>
              <th
                style={{
                  padding: "12px 16px",
                  textAlign: "center",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                }}
              >
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td
                  colSpan={12}
                  style={{
                    textAlign: "center",
                    padding: "40px",
                    color: "#6b7280",
                  }}
                >
                  <p>Cargando productos...</p>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={12} style={{ textAlign: "center", padding: "40px" }}>
                  <p style={{ fontWeight: 500 }}>No hay productos</p>
                </td>
              </tr>
            ) : (
              paginatedData.map((row) => {
                const stock = Number(row.existencias) || 0;

                let stockBg = "transparent";
                let stockColor = "#111827";

                if (stock === 0) {
                  stockBg = "#fee2e2";
                  stockColor = "#b91c1c";
                } else if (stock > 0 && stock <= lowStockThreshold) {
                  stockBg = "#fef3c7";
                  stockColor = "#92400e";
                }

                return (
                  <tr
                    key={row.id_producto}
                    style={{
                      borderTop: "1px solid #f3f4f6",
                      transition: "background 0.15s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background = "#f9fafb")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "white")
                    }
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
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        color: "#111",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {row.id_producto}
                    </td>
                    {/* CELDA NOMBRE: Responsiva con ellipsis */}
                    <td
                      title={row.nombre_producto}
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.9rem",
                        color: "#111",
                        maxWidth: "200px",       // Ancho máximo
                        whiteSpace: "nowrap",    // No envolver
                        overflow: "hidden",      // Ocultar exceso
                        textOverflow: "ellipsis" // Poner ...
                      }}
                    >
                      {row.nombre_producto}
                    </td>
                    {/* CELDA PROVEEDOR: Responsiva con ellipsis */}
                    <td
                      title={row.nombre_proveedor}
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.9rem",
                        color: "#6b7280",
                        maxWidth: "150px",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis"
                      }}
                    >
                      {row.nombre_proveedor}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.9rem",
                        color: "#6b7280",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {row.codigo_zona || "Sin asignar"}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.9rem",
                        color: "#6b7280",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {row.fecha_ultimo_ingreso}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "0.9rem",
                        color: "#6b7280",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {row.fecha_ultimo_egreso}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                        color: "#111",
                        whiteSpace: "nowrap"
                      }}
                    >
                      {formatCurrency(row.precio)}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        textAlign: "right",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "flex-end",
                          minWidth: "40px",
                          padding: "4px 8px",
                          borderRadius: "999px",
                          backgroundColor: stockBg,
                          color: stockColor,
                          fontSize: "0.85rem",
                          fontWeight: 600,
                        }}
                      >
                        {stock}
                      </span>
                    </td>
                    <td style={{ padding: "12px 16px", textAlign: "center" }}>
                      <div
                        style={{
                          display: "flex",
                          gap: "8px",
                          justifyContent: "center",
                          minWidth: "180px" // Evita que los botones se monten
                        }}
                      >
                        <button
                          onClick={() =>
                            navigate(
                              `/app/productos/${row.id_producto}/historial`
                            )
                          }
                          style={{
                            background: "#2563EB",
                            color: "white",
                            padding: "5px 12px",
                            borderRadius: "999px",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.8rem",
                            fontWeight: 500,
                          }}
                        >
                          Historial
                        </button>

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
                );
              })
            )}
          </tbody>
        </table>
        
        {/* Paginación Abajo */}
        <div style={{ padding: "12px 16px", background: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
           {renderPaginationControls()}
        </div>

      </div>

      {/* MODAL */}
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
          <div
            style={{
              position: "fixed",
              inset: 0,
              background: "rgba(0, 0, 0, 0.5)",
              backdropFilter: "blur(4px)",
            }}
          />

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
            <div
              style={{
                borderBottom: "1px solid #f3f4f6",
                padding: "20px 24px",
              }}
            >
              <h3
                style={{
                  fontSize: "1.25rem",
                  fontWeight: 600,
                  color: "#111",
                  margin: 0,
                }}
              >
                {editingId ? "Editar producto" : "Nuevo producto"}
              </h3>
              <p
                style={{
                  marginTop: "4px",
                  fontSize: "0.85rem",
                  color: "#6b7280",
                  margin: 0,
                }}
              >
                {editingId
                  ? "Actualiza la información del producto"
                  : "Completa los datos del nuevo producto"}
              </p>
            </div>

            <form onSubmit={save} style={{ padding: "24px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "16px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Código (ID)
                  </label>
                  <input
                    type="text"
                    value={form.id_producto}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id_producto: e.target.value }))
                    }
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
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Proveedor
                  </label>
                  <select
                    value={form.id_proveedor}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id_proveedor: e.target.value }))
                    }
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
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Nombre del producto
                  </label>
                  <input
                    type="text"
                    value={form.nombre_producto}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        nombre_producto: e.target.value,
                      }))
                    }
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
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Zona de ubicación (opcional)
                  </label>
                  <select
                    value={form.zonaId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, zonaId: e.target.value }))
                    }
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
                        {z.codigo} - Rack {z.rack}, módulo {z.modulo}, piso{" "}
                        {z.piso}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Descripción (opcional)
                  </label>
                  <textarea
                    value={form.descripcion}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, descripcion: e.target.value }))
                    }
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
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Precio unitario
                  </label>
                  <input
                    type="number"
                    value={form.precio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, precio: e.target.value }))
                    }
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
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Existencias (Stock)
                  </label>
                  <input
                    type="number"
                    value={form.existencias}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, existencias: e.target.value }))
                    }
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
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.9rem",
                      fontWeight: 500,
                      color: "#374151",
                      marginBottom: "6px",
                    }}
                  >
                    Imagen (Subir o URL)
                  </label>

                  <div
                    style={{
                      display: "flex",
                      flexWrap: "wrap",
                      gap: "10px",
                      marginBottom: "8px",
                    }}
                  >
                    {/* Galería / archivos */}
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

                    {/* Cámara */}
                    <button
                      type="button"
                      onClick={triggerCameraInput}
                      style={{
                        background: "#e0f2fe",
                        border: "1px solid #38bdf8",
                        padding: "8px 12px",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        color: "#0369a1",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      📷 Tomar foto
                    </button>

                    {/* Input oculto para archivos / galería */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept="image/*"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />

                    {/* Input oculto para cámara */}
                    <input
                      type="file"
                      ref={cameraInputRef}
                      accept="image/*"
                      capture="environment"
                      style={{ display: "none" }}
                      onChange={handleFileChange}
                    />

                    {/* URL manual */}
                    <input
                      type="text"
                      value={form.imagen_url}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, imagen_url: e.target.value }))
                      }
                      placeholder="O pega una URL aquí..."
                      style={{
                        flex: 1,
                        minWidth: "200px",
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

              <div
                style={{
                  marginTop: "24px",
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "12px",
                }}
              >
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