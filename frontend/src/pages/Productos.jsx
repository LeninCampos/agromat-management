import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { getProveedores } from "../api/proveedores";
import { getZonas } from "../api/zonas"; // <--- 1. Importar API Zonas
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "../api/productos";

const emptyForm = {
  id_producto: "",
  nombre_producto: "",
  descripcion: "",
  precio: "",
  existencias: "",
  id_proveedor: "",
  zonaString: "", // <--- 2. Campo temporal para manejar el select combinado
};

export default function Productos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [zonas, setZonas] = useState([]); // <--- 3. Estado para zonas

  // 🔍 Filtrado rápido
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
        getZonas(), // <--- 4. Cargar zonas
      ]);

      setProveedores(resProveedores.data);
      setZonas(resZonas.data);

      const normalizados = resProductos.data.map((p) => {
        // Extraer la primera ubicación si existe
        const ubicacion = p.SeUbicas?.[0]; 
        const zonaStr = ubicacion ? `${ubicacion.nombre}|${ubicacion.numero}` : "";

        return {
          id_producto: p.id_producto,
          nombre_producto: p.nombre_producto,
          descripcion: p.descripcion,
          precio: p.precio,
          existencias: p.stock,
          id_proveedor: p.id_proveedor,
          zonaString: zonaStr, // Guardamos la ubicación actual
          nombre_zona: ubicacion?.nombre, // Para mostrar en tabla
          numero_zona: ubicacion?.numero,
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
      zonaString: row.zonaString ?? "", // Cargar la zona actual en el form
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
      // Procesar la zona seleccionada
      let zonaObj = null;
      if (form.zonaString) {
        const [nombre, numero] = form.zonaString.split("|");
        zonaObj = { nombre, numero: Number(numero) };
      }

      const payload = {
        id_producto: form.id_producto,
        nombre_producto: form.nombre_producto,
        descripcion: form.descripcion || null,
        precio: Number(form.precio) || 0,
        stock: Number(form.existencias) || 0,
        id_proveedor: Number(form.id_proveedor),
        zona: zonaObj, // <--- Enviamos el objeto zona al backend
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
      await load();
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

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>🧺 Productos</h2>
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
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Nombre</th>
              <th style={{ padding: "10px" }}>Zona</th> {/* Nueva columna */}
              <th style={{ padding: "10px", textAlign: "right" }}>Precio</th>
              <th style={{ padding: "10px", textAlign: "right" }}>Stock</th>
              <th style={{ padding: "10px", textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>Cargando...</td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>Sin resultados</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id_producto} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.id_producto}</td>
                  <td style={{ padding: "10px" }}>{row.nombre_producto}</td>
                  <td style={{ padding: "10px", color: "#666" }}>
                    {row.nombre_zona ? `${row.nombre_zona} #${row.numero_zona}` : "Sin asignar"}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>${Number(row.precio).toFixed(2)}</td>
                  <td style={{ padding: "10px", textAlign: "right" }}>{row.existencias}</td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <button onClick={() => openEdit(row)} style={{ background: "#F59E0B", color: "white", padding: "5px 10px", borderRadius: "6px", border: "none", marginRight: 5 }}>Editar</button>
                    <button onClick={() => remove(row)} style={{ background: "#DC2626", color: "white", padding: "5px 10px", borderRadius: "6px", border: "none" }}>Eliminar</button>
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
              <button type="button" className="agromat-modal-close" onClick={() => setModalOpen(false)}>✕</button>
            </div>

            <form onSubmit={save} className="agromat-modal-body">
              <div className="agromat-form-grid">
                <div className="agromat-form-field">
                  <label>Código (ID)</label>
                  <input
                    type="text"
                    value={form.id_producto}
                    onChange={(e) => setForm((f) => ({ ...f, id_producto: e.target.value }))}
                    disabled={!!editingId}
                    required
                    className="agromat-input"
                  />
                </div>

                <div className="agromat-form-field">
                  <label>Proveedor</label>
                  <select
                    value={form.id_proveedor}
                    onChange={(e) => setForm((f) => ({ ...f, id_proveedor: e.target.value }))}
                    required
                    className="agromat-select"
                  >
                    <option value="">Selecciona...</option>
                    {proveedores.map((p) => (
                      <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor}</option>
                    ))}
                  </select>
                </div>
                
                {/* SELECTOR DE ZONA NUEVO */}
                <div className="agromat-form-field agromat-full-row">
                  <label>Zona de Ubicación (Opcional)</label>
                  <select
                    value={form.zonaString}
                    onChange={(e) => setForm((f) => ({ ...f, zonaString: e.target.value }))}
                    className="agromat-select"
                  >
                    <option value="">-- Sin asignar --</option>
                    {zonas.map((z) => (
                      <option key={`${z.nombre}|${z.numero}`} value={`${z.nombre}|${z.numero}`}>
                        {z.nombre} (Pasillo/Num: {z.numero}) - {z.descripcion}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Nombre</label>
                  <input type="text" value={form.nombre_producto} onChange={(e) => setForm((f) => ({ ...f, nombre_producto: e.target.value }))} required className="agromat-input" />
                </div>
                
                <div className="agromat-form-field">
                   <label>Precio</label>
                   <input type="number" value={form.precio} onChange={(e) => setForm((f) => ({ ...f, precio: e.target.value }))} className="agromat-input" />
                </div>

                <div className="agromat-form-field">
                   <label>Stock</label>
                   <input type="number" value={form.existencias} onChange={(e) => setForm((f) => ({ ...f, existencias: e.target.value }))} className="agromat-input" />
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