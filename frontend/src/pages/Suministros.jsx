// frontend/src/pages/Suministros.jsx
import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { getSuministros, createSuministro, deleteSuministro } from "../api/suministros";
import { getProveedores } from "../api/proveedores";
import { getProductos } from "../api/productos";

const emptyForm = {
  fecha_llegada: new Date().toISOString().split("T")[0],
  hora_llegada: new Date().toTimeString().split(" ")[0].slice(0, 5),
  id_proveedor: "",
  items: []
};

export default function Suministros() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Catálogos
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estado para agregar producto individual
  const [newItem, setNewItem] = useState({ id_producto: "", cantidad: 1 });

  const load = async () => {
    setLoading(true);
    try {
      const [resSum, resProv, resProd] = await Promise.all([
        getSuministros(),
        getProveedores(),
        getProductos()
      ]);
      setItems(resSum.data);
      setProveedores(resProv.data);
      setProductos(resProd.data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se cargaron los datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  // --- Lógica Items ---
  const agregarProducto = () => {
    if (!newItem.id_producto) return Swal.fire("Error", "Elige un producto", "warning");
    const cant = parseInt(newItem.cantidad);
    if (cant <= 0) return Swal.fire("Error", "Cantidad inválida", "warning");

    const prodInfo = productos.find(p => p.id_producto === newItem.id_producto);

    setForm(prev => {
      const existe = prev.items.find(i => i.id_producto === newItem.id_producto);
      let nuevosItems;
      if (existe) {
        nuevosItems = prev.items.map(i => 
          i.id_producto === newItem.id_producto ? { ...i, cantidad: i.cantidad + cant } : i
        );
      } else {
        nuevosItems = [...prev.items, { ...newItem, cantidad: cant, nombre: prodInfo.nombre_producto }];
      }
      return { ...prev, items: nuevosItems };
    });
    setNewItem({ id_producto: "", cantidad: 1 });
  };

  const eliminarProducto = (id) => {
    setForm(prev => ({ ...prev, items: prev.items.filter(i => i.id_producto !== id) }));
  };

  // --- Guardar ---
  const save = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) return Swal.fire("Error", "Agrega productos al suministro", "warning");

    try {
      await createSuministro({
        fecha_llegada: form.fecha_llegada,
        hora_llegada: form.hora_llegada,
        id_proveedor: form.id_proveedor,
        items: form.items
      });
      Swal.fire("Éxito", "Suministro registrado y stock actualizado", "success");
      setModalOpen(false);
      setForm(emptyForm);
      load();
    } catch (error) {
      console.error(error);
      Swal.fire("Error", "No se pudo registrar", "error");
    }
  };

  // --- Eliminar Registro (Opcional, no revierte stock en esta versión simple) ---
  const remove = async (id) => {
    if (!confirm("¿Eliminar registro? (El stock NO se revertirá automáticamente)")) return;
    try {
      await deleteSuministro(id);
      load();
    } catch (e) { Swal.fire("Error", "No se pudo eliminar", "error"); }
  };

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>📥 Suministros (Entradas)</h2>
        <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ padding: "8px 14px", borderRadius: "6px" }}>+ Registrar Entrada</button>
      </div>

      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={{ padding: "12px" }}>ID</th>
              <th style={{ padding: "12px" }}>Fecha</th>
              <th style={{ padding: "12px" }}>Hora</th>
              <th style={{ padding: "12px" }}>Proveedor</th>
              <th style={{ padding: "12px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {items.map(row => (
              <tr key={row.id_suministro} style={{ borderTop: "1px solid #eee" }}>
                <td style={{ padding: "12px" }}>{row.id_suministro}</td>
                <td style={{ padding: "12px" }}>{row.fecha_llegada}</td>
                <td style={{ padding: "12px" }}>{row.hora_llegada}</td>
                <td style={{ padding: "12px" }}>{row.Proveedor?.nombre_proveedor}</td>
                <td style={{ padding: "12px" }}>
                  <button onClick={() => remove(row.id_suministro)} className="btn-danger" style={{ padding: "5px 10px", borderRadius: "6px" }}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card" style={{ maxWidth: "600px" }}>
            <div className="agromat-modal-header">
              <h2>Registrar Suministro</h2>
              <button onClick={() => setModalOpen(false)} className="agromat-modal-close">✕</button>
            </div>
            
            <form onSubmit={save} className="agromat-modal-body">
              <div className="agromat-form-grid">
                <div className="agromat-form-field">
                  <label>Fecha</label>
                  <input type="date" className="agromat-input" required value={form.fecha_llegada} onChange={e => setForm({...form, fecha_llegada: e.target.value})} />
                </div>
                <div className="agromat-form-field">
                  <label>Hora</label>
                  <input type="time" className="agromat-input" required value={form.hora_llegada} onChange={e => setForm({...form, hora_llegada: e.target.value})} />
                </div>
                <div className="agromat-form-field agromat-full-row">
                  <label>Proveedor</label>
                  <select className="agromat-select" required value={form.id_proveedor} onChange={e => setForm({...form, id_proveedor: e.target.value})}>
                    <option value="">-- Selecciona --</option>
                    {proveedores.map(p => <option key={p.id_proveedor} value={p.id_proveedor}>{p.nombre_proveedor}</option>)}
                  </select>
                </div>
              </div>

              <hr style={{ margin: "20px 0", border: "0", borderTop: "1px solid #eee" }} />
              
              {/* Agregar items */}
              <div style={{ display: "flex", gap: "10px", alignItems: "flex-end" }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Producto</label>
                  <select className="agromat-select" style={{ width: "100%" }} value={newItem.id_producto} onChange={e => setNewItem({...newItem, id_producto: e.target.value})}>
                    <option value="">Buscar producto...</option>
                    {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto} (Stock: {p.stock})</option>)}
                  </select>
                </div>
                <div style={{ width: "80px" }}>
                  <label style={{ fontSize: "0.8rem", fontWeight: 600 }}>Cant.</label>
                  <input type="number" className="agromat-input" min="1" style={{ width: "100%" }} value={newItem.cantidad} onChange={e => setNewItem({...newItem, cantidad: parseInt(e.target.value) || 0})} />
                </div>
                <button type="button" className="btn-primary" style={{ padding: "9px 12px", borderRadius: "8px" }} onClick={agregarProducto}>+</button>
              </div>

              {/* Lista de items */}
              <div style={{ marginTop: "15px", background: "#f9fafb", padding: "10px", borderRadius: "8px", maxHeight: "150px", overflowY: "auto" }}>
                {form.items.length === 0 ? <p style={{ textAlign: "center", color: "#888", fontSize: "0.9rem" }}>Sin productos</p> : (
                  <table style={{ width: "100%", fontSize: "0.9rem" }}>
                    <tbody>
                      {form.items.map(item => (
                        <tr key={item.id_producto} style={{ borderBottom: "1px solid #eee" }}>
                          <td style={{ padding: "4px" }}>{item.nombre}</td>
                          <td style={{ padding: "4px", fontWeight: "bold" }}>+{item.cantidad}</td>
                          <td style={{ textAlign: "right" }}>
                            <button type="button" onClick={() => eliminarProducto(item.id_producto)} style={{ color: "red", border: "none", background: "none", cursor: "pointer" }}>✕</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>

              <div className="agromat-modal-footer">
                <button type="button" className="agromat-btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="agromat-btn-primary">Registrar Entrada</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}