import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { getProveedores } from "../api/proveedores";
import {
  getProductos,
  createProducto,
  updateProducto,
  deleteProducto,
} from "../api/productos";

const emptyForm = {
  id_producto: "", // Nuevo campo
  nombre_producto: "",
  descripcion: "",
  precio: "",
  existencias: "",
  id_proveedor: "",
};


export default function Productos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);
  const [proveedores, setProveedores] = useState([]); 

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

  // 📦 Cargar productos
  const load = async () => {
    setLoading(true);
    try {
      // Cargamos productos y proveedores en paralelo
      const [resProductos, resProveedores] = await Promise.all([
        getProductos(),
        getProveedores()
      ]);

      setProveedores(resProveedores.data); // Guardamos los proveedores

      const normalizados = resProductos.data.map((p) => ({
        id_producto: p.id_producto,
        nombre_producto: p.nombre_producto,
        descripcion: p.descripcion,
        precio: p.precio,
        existencias: p.stock,
        id_proveedor: p.id_proveedor,
      }));

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

  // ➕ Nuevo producto
  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  // ✏️ Editar producto
  const openEdit = (row) => {
    setEditingId(row.id_producto);
    setForm({
      id_producto: row.id_producto,
      nombre_producto: row.nombre_producto ?? "",
      descripcion: row.descripcion ?? "",
      precio: row.precio ?? "",
      existencias: row.existencias ?? "",
      id_proveedor: row.id_proveedor ?? 6,   // 👈 mantenerlo
    });

    setModalOpen(true);
  };
  // 💾 Guardar cambios (nuevo o editado)
  const save = async (e) => {
    e.preventDefault();
    if (!form.id_proveedor) {
      Swal.fire("Error", "Selecciona un proveedor", "warning");
      return;
    }
    try {
      const payload = {
        id_producto: form.id_producto,
        nombre_producto: form.nombre_producto,
        descripcion: form.descripcion || null,
        precio: Number(form.precio) || 0,
        stock: Number(form.existencias) || 0,
        id_proveedor: Number(form.id_proveedor),
      };

      console.log("Payload enviado:", payload); if (editingId) {
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
      Swal.fire("Error", "No pude guardar el producto", "error");
    }

  };

  // ❌ Eliminar producto
  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar producto?",
      text: `${row.nombre_producto}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteProducto(row.id_producto);
      Swal.fire("🗑️ Eliminado", "Producto eliminado con éxito", "success");
      await load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar el producto", "error");
    }
  };

  // 🧱 Render
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
          placeholder="Buscar por nombre o descripción…"
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
              <th style={{ padding: "10px", width: "50px" }}>ID</th>
              <th style={{ padding: "10px", width: "200px" }}>Nombre</th>
              <th style={{ padding: "10px", width: "350px" }}>Descripción</th>
              <th style={{ padding: "10px", textAlign: "right" }}>Precio</th>
              <th style={{ padding: "10px", textAlign: "right" }}>Existencias</th>
              <th style={{ padding: "10px", textAlign: "center" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                  Cargando…
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ textAlign: "center", padding: "20px" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id_producto} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.id_producto}</td>
                  <td style={{ padding: "10px" }}>{row.nombre_producto}</td>
                  <td
                    style={{
                      padding: "10px",
                      wordBreak: "break-word",
                      maxWidth: "350px",
                    }}
                  >
                    {row.descripcion}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    ${Number(row.precio).toFixed(2)}
                  </td>
                  <td style={{ padding: "10px", textAlign: "right" }}>
                    {row.existencias}
                  </td>
                  <td style={{ padding: "10px", textAlign: "center" }}>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        justifyContent: "center",
                      }}
                    >
                      <button
                        onClick={() => openEdit(row)}
                        style={{
                          background: "#F59E0B",
                          color: "white",
                          padding: "5px 10px",
                          borderRadius: "6px",
                          border: "none",
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

      {/* Modal */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "grid",
            placeItems: "center",
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={save}
            style={{
              background: "white",
              padding: "1.5rem",
              borderRadius: "10px",
              width: "100%",
              maxWidth: "480px",
              boxShadow: "0 5px 20px rgba(0,0,0,0.15)",
            }}
          >
            <h3 style={{ fontSize: "1.2rem", marginBottom: "1rem" }}>
              {editingId ? "Editar producto" : "Nuevo producto"}
            </h3>
            <label>
              <span>Código de Barras (ID):</span>
              <input
                type="text"
                value={form.id_producto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id_producto: e.target.value }))
                }
                // Si estamos editando, deshabilitamos el campo para no romper la integridad
                disabled={!!editingId}
                required
                style={{
                  width: "100%",
                  marginBottom: "10px",
                  background: editingId ? "#f3f4f6" : "white"
                }}
              />
            </label>
            <label>
              <span>Proveedor:</span>
              <select
                value={form.id_proveedor}
                onChange={(e) =>
                  setForm((f) => ({ ...f, id_proveedor: e.target.value }))
                }
                required
                style={{ 
                  width: "100%", 
                  marginBottom: "10px", 
                  padding: "8px", 
                  borderRadius: "6px",
                  border: "1px solid #ccc"
                }}
              >
                <option value="">-- Selecciona un proveedor --</option>
                {proveedores.map((prov) => (
                  <option key={prov.id_proveedor} value={prov.id_proveedor}>
                    {prov.nombre_proveedor}
                  </option>
                ))}
              </select>
              </label>
            <label>
              <span>Nombre:</span>
              <input
                type="text"
                value={form.nombre_producto}
                onChange={(e) =>
                  setForm((f) => ({ ...f, nombre_producto: e.target.value }))
                }
                required
                style={{ width: "100%", marginBottom: "10px" }}
              />
            </label>

            <label>
              <span>Descripción:</span>
              <textarea
                value={form.descripcion}
                onChange={(e) =>
                  setForm((f) => ({ ...f, descripcion: e.target.value }))
                }
                style={{ width: "100%", marginBottom: "10px" }}
              />
            </label>

            <div style={{ display: "flex", gap: "10px" }}>
              <label style={{ flex: 1 }}>
                <span>Precio:</span>
                <input
                  type="number"
                  value={form.precio}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, precio: e.target.value }))
                  }
                  style={{ width: "100%" }}
                />
              </label>

              <label style={{ flex: 1 }}>
                <span>Existencias:</span>
                <input
                  type="number"
                  value={form.existencias}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, existencias: e.target.value }))
                  }
                  style={{ width: "100%" }}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "15px",
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "1px solid #ddd",
                  background: "#f9fafb",
                  cursor: "pointer",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: "#4F46E5",
                  color: "white",
                  padding: "8px 14px",
                  borderRadius: "6px",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Guardar
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
