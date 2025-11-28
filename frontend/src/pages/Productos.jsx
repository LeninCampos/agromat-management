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
} from "../api/productos";
import { uploadProductoImagen } from "../api/upload.js";

const BACKEND_URL = "http://localhost:4000";

const emptyForm = {
  id_producto: "",
  nombre_producto: "",
  descripcion: "",
  precio: "",
  existencias: "",
  id_proveedor: "",
  zonaId: "", // id_zona seleccionado
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

  const fileInputRef = useRef(null);

  // 🔍 Filtro rápido
  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (x) =>
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
        // Tomamos solo la primera ubicación (si existe)
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
          zonaId: id_zona ? String(id_zona) : "",
          codigo_zona,
          imagen_url: imagenUrl,
        };
      });

      setItems(normalizados);
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

    try {
      // Construimos el objeto zona { id_zona } o null
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
        Swal.fire("✅ Listo", "Producto actualizado", "success");
      } else {
        await createProducto(payload);
        Swal.fire("✅ Listo", "Producto creado", "success");
      }

      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      await load(); // recarga para ver la zona nueva
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude guardar el producto", "error");
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
      Swal.fire("🗑️ Eliminado", "Producto eliminado", "success");
      await load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  // 👉 subir imagen desde dispositivo
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
      Swal.fire(
        "Error",
        "No pude subir la imagen. Revisa que el backend tenga /api/upload/productos.",
        "error"
      );
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
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>🧺 Productos</h2>
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

      <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre..."
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
            background: "#f3f4f6",
            padding: "8px 14px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
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
              <th style={{ padding: "10px" }}>Foto</th>
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Nombre</th>
              <th style={{ padding: "10px" }}>Zona</th>
              <th style={{ padding: "10px", textAlign: "right" }}>Precio</th>
              <th style={{ padding: "10px", textAlign: "right" }}>Stock</th>
              <th style={{ padding: "10px", textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "20px" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr
                  key={row.id_producto}
                  style={{ borderTop: "1px solid #eee" }}
                >
                  <td style={{ padding: "10px" }}>
                    {row.imagen_url ? (
                      <img
                        src={row.imagen_url}
                        alt={row.nombre_producto}
                        style={{
                          width: "48px",
                          height: "48px",
                          objectFit: "cover",
                          borderRadius: "8px",
                          border: "1px solid #eee",
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
                          fontSize: "0.75rem",
                          color: "#9ca3af",
                        }}
                      >
                        Sin foto
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "10px" }}>{row.id_producto}</td>
                  <td style={{ padding: "10px" }}>{row.nombre_producto}</td>
                  <td style={{ padding: "10px", color: "#666" }}>
                    {row.codigo_zona ? row.codigo_zona : "Sin asignar"}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    ${Number(row.precio).toFixed(2)}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    {row.existencias}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <button
                      onClick={() => openEdit(row)}
                      style={{
                        background: "#F59E0B",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "none",
                        marginRight: 5,
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(row)}
                      style={{
                        background: "#DC2626",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
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

      {/* Modal */}
      {modalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card">
            <div className="agromat-modal-header">
              <h2>{editingId ? "Editar producto" : "Nuevo producto"}</h2>
              <button
                type="button"
                className="agromat-modal-close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={save} className="agromat-modal-body">
              <div className="agromat-form-grid">
                <div className="agromat-form-field">
                  <label>Código (ID)</label>
                  <input
                    type="text"
                    value={form.id_producto}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id_producto: e.target.value }))
                    }
                    disabled={!!editingId}
                    required
                    className="agromat-input"
                  />
                </div>

                <div className="agromat-form-field">
                  <label>Proveedor</label>
                  <select
                    value={form.id_proveedor}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        id_proveedor: e.target.value,
                      }))
                    }
                    required
                    className="agromat-select"
                  >
                    <option value="">Selecciona...</option>
                    {proveedores.map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>
                        {p.nombre_proveedor}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Zona de Ubicación (Opcional)</label>
                  <select
                    value={form.zonaId}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, zonaId: e.target.value }))
                    }
                    className="agromat-select"
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

                <div className="agromat-form-field agromat-full-row">
                  <label>Nombre</label>
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
                    className="agromat-input"
                  />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>URL de la imagen (opcional)</label>
                  <input
                    type="text"
                    inputMode="url"
                    value={form.imagen_url}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, imagen_url: e.target.value }))
                    }
                    className="agromat-input"
                    placeholder="https://ejemplo.com/imagen.jpg"
                  />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Subir imagen desde dispositivo</label>
                  <div
                    style={{
                      display: "flex",
                      gap: "8px",
                      alignItems: "center",
                    }}
                  >
                    <button
                      type="button"
                      className="agromat-btn-secondary"
                      onClick={triggerFileInput}
                    >
                      Elegir archivo
                    </button>
                    <span
                      style={{
                        fontSize: "0.8rem",
                        color: "#6b7280",
                      }}
                    >
                      Puedes subir .jpg o .png (máx 5MB)
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

                <div className="agromat-form-field">
                  <label>Precio</label>
                  <input
                    type="number"
                    value={form.precio}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, precio: e.target.value }))
                    }
                    className="agromat-input"
                  />
                </div>

                <div className="agromat-form-field">
                  <label>Stock</label>
                  <input
                    type="number"
                    value={form.existencias}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, existencias: e.target.value }))
                    }
                    className="agromat-input"
                  />
                </div>
              </div>

              <div className="agromat-modal-footer">
                <button
                  type="button"
                  className="agromat-btn-secondary"
                  onClick={() => setModalOpen(false)}
                >
                  Cancelar
                </button>
                <button type="submit" className="agromat-btn-primary">
                  Guardar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
