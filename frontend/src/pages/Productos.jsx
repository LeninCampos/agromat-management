// frontend/src/pages/Productos.jsx - VERSIÓN P1 SIN TAILWIND
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

const BACKEND_URL = "https://agromatgranjas.com";

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
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [zonas, setZonas] = useState([]);

  // Selección múltiple
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  const fileInputRef = useRef(null);

  // 🔍 Filtro mejorado - incluye búsqueda por código
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (x) =>
        x.id_producto?.toLowerCase().includes(query) || // 👈 NUEVO: búsqueda por código
        x.nombre_producto?.toLowerCase().includes(query) ||
        x.descripcion?.toLowerCase().includes(query)
    );
  }, [q, items]);

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
          precio: p.precio,
          existencias: p.stock,
          id_proveedor: p.id_proveedor,
          nombre_proveedor: p.Proveedor?.nombre_proveedor || "Sin proveedor", // 👈 NUEVO
          zonaId: id_zona ? String(id_zona) : "",
          codigo_zona,
          imagen_url: imagenUrl,
          // 👇 NUEVO: fechas de último ingreso/egreso (placeholder por ahora)
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

    // 👇 NUEVO: Validar ID único al crear
    if (!editingId) {
      const existeId = items.some(
        (item) => item.id_producto.toLowerCase() === form.id_producto.toLowerCase()
      );
      if (existeId) {
        Swal.fire("Error", `El código "${form.id_producto}" ya existe. Usa otro código.`, "error");
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
      {/* HEADER MEJORADO */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h2 style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111", marginBottom: "0.5rem" }}>
          📦 Inventario
        </h2>
        <p style={{ fontSize: "0.95rem", color: "#666" }}>
          Gestión de productos y existencias
        </p>
      </div>

      {/* BOTONES DE ACCIÓN */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "1rem" }}>
        <button
          onClick={() => setSelectionMode((v) => !v)}
          style={{
            background: selectionMode ? "#e5e7eb" : "#f3f4f6",
            color: "#111827",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "1px solid #d1d5db",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          {selectionMode ? "❌ Cancelar selección" : "☑️ Seleccionar múltiples"}
        </button>

        {selectionMode && (
          <button
            onClick={removeSelected}
            disabled={selectedIds.length === 0}
            style={{
              background: selectedIds.length === 0 ? "#fecaca" : "#DC2626",
              color: "white",
              padding: "8px 14px",
              borderRadius: "6px",
              border: "none",
              cursor: selectedIds.length === 0 ? "not-allowed" : "pointer",
              fontSize: "0.9rem",
            }}
          >
            🗑️ Eliminar ({selectedIds.length})
          </button>
        )}

        <button
          onClick={openCreate}
          style={{
            background: "#4F46E5",
            color: "white",
            padding: "8px 16px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
            fontSize: "0.9rem",
            fontWeight: 500,
          }}
        >
          ➕ Nuevo producto
        </button>
      </div>

      {/* BUSCADOR */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "1.5rem" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="🔍 Buscar por código, nombre o descripción..."
          style={{
            flex: 1,
            padding: "10px 14px",
            borderRadius: "8px",
            border: "1px solid #ddd",
            fontSize: "0.95rem",
          }}
        />
        <button
          onClick={load}
          style={{
            background: "#f3f4f6",
            padding: "10px 16px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "0.9rem",
          }}
        >
          🔄 Recargar
        </button>
      </div>

      {/* TABLA MEJORADA */}
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
                <th style={{ padding: "12px", textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
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
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Código
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Nombre
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Proveedor
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Zona
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Últ. Ingreso
              </th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Últ. Egreso
              </th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Precio
              </th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Stock
              </th>
              <th style={{ padding: "12px 16px", textAlign: "center", fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase" }}>
                Acciones
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={selectionMode ? 12 : 11} style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
                  <div style={{ display: "inline-block", width: "24px", height: "24px", border: "3px solid #e5e7eb", borderTop: "3px solid #4F46E5", borderRadius: "50%", animation: "spin 1s linear infinite" }}></div>
                  <p style={{ marginTop: "12px", fontSize: "0.9rem" }}>Cargando productos...</p>
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={selectionMode ? 12 : 11} style={{ textAlign: "center", padding: "40px" }}>
                  <div style={{ color: "#9ca3af", fontSize: "3rem" }}>📦</div>
                  <p style={{ marginTop: "12px", fontSize: "0.95rem", fontWeight: 500, color: "#111" }}>No hay productos</p>
                  <p style={{ marginTop: "4px", fontSize: "0.85rem", color: "#6b7280" }}>Comienza creando uno nuevo</p>
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
                    {row.imagen_url ? (
                      <img
                        src={row.imagen_url}
                        alt={row.nombre_producto}
                        style={{
                          width: "48px",
                          height: "48px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #e5e7eb",
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: "48px",
                          height: "48px",
                          borderRadius: "8px",
                          background: "#f3f4f6",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.7rem",
                          color: "#9ca3af",
                        }}
                      >
                        Sin foto
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
                  <td style={{ padding: "12px 16px", textAlign: "right", fontSize: "0.9rem", fontWeight: 500, color: "#111" }}>
                    {row.existencias}
                  </td>
                  <td style={{ padding: "12px 16px", textAlign: "center" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "center" }}>
                      <button
                        onClick={() => openEdit(row)}
                        style={{
                          background: "#fef3c7",
                          color: "#92400e",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                        }}
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => remove(row)}
                        style={{
                          background: "#fee2e2",
                          color: "#991b1b",
                          padding: "6px 12px",
                          borderRadius: "6px",
                          border: "none",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          fontWeight: 500,
                        }}
                      >
                        🗑️ Eliminar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL POPUP MEJORADO */}
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
                    URL de la imagen (opcional)
                  </label>
                  <input
                    type="text"
                    value={form.imagen_url}
                    onChange={(e) => setForm((f) => ({ ...f, imagen_url: e.target.value }))}
                    style={{
                      width: "100%",
                      padding: "10px 12px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.95rem",
                    }}
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>

                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    O subir imagen desde dispositivo
                  </label>
                  <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                    <button
                      type="button"
                      onClick={triggerFileInput}
                      style={{
                        padding: "10px 16px",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        background: "white",
                        cursor: "pointer",
                        fontSize: "0.9rem",
                        fontWeight: 500,
                      }}
                    >
                      📁 Elegir archivo
                    </button>
                    <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>
                      JPG o PNG, máx 5MB
                    </span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={handleFileChange}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: "0.9rem", fontWeight: 500, color: "#374151", marginBottom: "6px" }}>
                    Precio
                  </label>
                  <input
                    type="number"
                    step="0.01"
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
                    Stock inicial
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
              </div>

              <div style={{ marginTop: "24px", display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  style={{
                    padding: "10px 20px",
                    border: "1px solid #d1d5db",
                    borderRadius: "8px",
                    background: "white",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    color: "#374151",
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  style={{
                    padding: "10px 20px",
                    border: "none",
                    borderRadius: "8px",
                    background: "#4F46E5",
                    color: "white",
                    cursor: "pointer",
                    fontSize: "0.9rem",
                    fontWeight: 500,
                    boxShadow: "0 2px 4px rgba(79, 70, 229, 0.3)",
                  }}
                >
                  {editingId ? "Actualizar producto" : "Crear producto"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSS para animación de loading */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}