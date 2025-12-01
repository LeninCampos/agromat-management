// frontend/src/pages/Suministros.jsx
import { useEffect, useState, useRef } from "react";
import Swal from "sweetalert2";
import api from "../api/axios"; 
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
  
  // Modal registro
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);

  // Modal detalles
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSuministro, setSelectedSuministro] = useState(null);

  // Catálogos
  const [proveedores, setProveedores] = useState([]);
  const [productos, setProductos] = useState([]);

  // Estado para agregar producto individual (Manual)
  const [newItem, setNewItem] = useState({ id_producto: "", cantidad: 1 });

  // Referencia para el input de archivo (Excel)
  const fileInputRef = useRef(null);

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

  // --- Lógica Items Manuales ---
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

  // --- Guardar Manual ---
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

  // --- Importación Excel ---
  const handleImportClick = () => {
    fileInputRef.current.click();
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Pedir datos adicionales
    const { value: formValues } = await Swal.fire({
      title: 'Datos del Suministro (Excel)',
      html:
        '<div style="text-align: left; font-size: 0.9rem; color: #555;">' +
        '<label style="display:block; margin-bottom: 4px;">Proveedor</label>' +
        `<select id="swal-proveedor" class="swal2-select" style="display:flex; width: 100%; margin: 0 0 10px;">` +
          proveedores.map(p => `<option value="${p.id_proveedor}">${p.nombre_proveedor}</option>`).join('') +
        '</select>' +
        '<label style="display:block; margin-bottom: 4px;">Fecha</label>' +
        `<input id="swal-fecha" type="date" class="swal2-input" style="margin: 0 0 10px; width: 100%; box-sizing: border-box;" value="${new Date().toISOString().split('T')[0]}">` +
        '<label style="display:block; margin-bottom: 4px;">Hora</label>' +
        `<input id="swal-hora" type="time" class="swal2-input" style="margin: 0; width: 100%; box-sizing: border-box;" value="${new Date().toTimeString().slice(0,5)}">` +
        '</div>',
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Importar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const idProv = document.getElementById('swal-proveedor').value;
        if (!idProv) return Swal.showValidationMessage('Selecciona un proveedor');
        return {
          id_proveedor: idProv,
          fecha_llegada: document.getElementById('swal-fecha').value,
          hora_llegada: document.getElementById('swal-hora').value
        }
      }
    });

    if (formValues) {
      const formData = new FormData();
      formData.append("archivo", file);
      formData.append("id_proveedor", formValues.id_proveedor);
      formData.append("fecha_llegada", formValues.fecha_llegada);
      formData.append("hora_llegada", formValues.hora_llegada);

      try {
        setLoading(true);
        const res = await api.post("/suministro/importar", formData, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        
        Swal.fire("Éxito", res.data.mensaje, "success");
        if(res.data.alertas) Swal.fire("Atención", res.data.alertas, "warning");
        load(); 
      } catch (error) {
        console.error(error);
        const msg = error.response?.data?.error || "Error al importar el archivo";
        Swal.fire("Error", msg, "error");
      } finally {
        setLoading(false);
      }
    }
    e.target.value = ""; 
  };

  // --- Ver Detalles ---
  const openDetails = (row) => {
    setSelectedSuministro(row);
    setDetailsOpen(true);
  };

  // --- Eliminar Registro ---
  const remove = async (id) => {
    const result = await Swal.fire({
        title: "¿Eliminar registro?",
        text: "El stock NO se revertirá automáticamente.",
        icon: "warning",
        showCancelButton: true,
        confirmButtonText: "Sí, eliminar",
        cancelButtonText: "Cancelar"
    });

    if (!result.isConfirmed) return;

    try {
      await deleteSuministro(id);
      load();
      Swal.fire("Eliminado", "Registro eliminado correctamente", "success");
    } catch (e) { 
        Swal.fire("Error", "No se pudo eliminar", "error"); 
    }
  };

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      
      {/* --- HEADER --- */}
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>📥 Suministros (Entradas)</h2>
        
        <div style={{ display: 'flex', gap: '10px'}}>
             {/* Input oculto Excel */}
             <input 
               type="file" 
               ref={fileInputRef} 
               style={{display: 'none'}} 
               accept=".xlsx, .xls" 
               onChange={handleFileChange}
             />
             
             {/* Botón Importar */}
             <button 
               onClick={handleImportClick} 
               style={{ background: '#10B981', color: 'white', padding: "8px 14px", borderRadius: "6px", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px", fontWeight: 500 }}
             >
               📄 Importar Excel
             </button>

             {/* Botón Manual */}
             <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ padding: "8px 14px", borderRadius: "6px", fontWeight: 500 }}>
                + Registrar Manual
             </button>
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 600 }}>📥 Entradas</h2>
        <button onClick={() => setModalOpen(true)} className="btn-primary" style={{ padding: "8px 14px", borderRadius: "6px" }}>+ Registrar Entrada</button>
      </div>

      {/* --- TABLA PRINCIPAL --- */}
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
            {loading ? (
                <tr><td colSpan={5} style={{textAlign: "center", padding: "20px"}}>Cargando...</td></tr>
            ) : items.length === 0 ? (
                <tr><td colSpan={5} style={{textAlign: "center", padding: "20px"}}>No hay registros</td></tr>
            ) : (
                items.map(row => (
                <tr key={row.id_suministro} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "12px" }}>#{row.id_suministro}</td>
                    <td style={{ padding: "12px" }}>{row.fecha_llegada}</td>
                    <td style={{ padding: "12px" }}>{row.hora_llegada}</td>
                    <td style={{ padding: "12px" }}>{row.Proveedor?.nombre_proveedor}</td>
                    <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: "8px" }}>
                            <button 
                                onClick={() => openDetails(row)} 
                                style={{ background: "#3B82F6", color: "white", padding: "5px 10px", borderRadius: "6px", border: "none", cursor: "pointer" }}
                            >
                                Detalles
                            </button>
                            <button 
                                onClick={() => remove(row.id_suministro)} 
                                className="btn-danger" 
                                style={{ padding: "5px 10px", borderRadius: "6px" }}
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

      // ...todo el código que ya tienes arriba se queda igual...

{/* --- MODAL DETALLES DE SUMINISTRO --- */}
{detailsOpen && selectedSuministro && (
  <div className="agromat-modal-backdrop">
    <div className="agromat-modal-card" style={{ maxWidth: "650px" }}>
      <div className="agromat-modal-header">
        <div>
          <h2>Detalles Suministro #{selectedSuministro.id_suministro}</h2>
          <p style={{ marginTop: "4px" }}>
            <strong>Proveedor:</strong>{" "}
            {selectedSuministro.Proveedor?.nombre_proveedor} <br />
            <span style={{ fontSize: "0.85rem", color: "#666" }}>
              {selectedSuministro.fecha_llegada} a las{" "}
              {selectedSuministro.hora_llegada}
            </span>
          </p>
        </div>
        <button
          onClick={() => setDetailsOpen(false)}
          className="agromat-modal-close"
        >
          ✕
        </button>
      </div>

      <div className="agromat-modal-body" style={{ marginTop: "15px" }}>
        <div
          style={{
            maxHeight: "300px",
            overflowY: "auto",
            border: "1px solid #eee",
            borderRadius: "8px",
          }}
        >
          <table
            style={{
              width: "100%",
              borderCollapse: "collapse",
              fontSize: "0.9rem",
            }}
          >
            <thead
              style={{ background: "#f3f4f6", position: "sticky", top: 0 }}
            >
              <tr>
                {/* 👇 NUEVA COLUMNA FOTO */}
                <th style={{ padding: "8px", textAlign: "left" }}>
                  Foto
                </th>
                <th style={{ padding: "8px", textAlign: "left" }}>
                  ID Prod.
                </th>
                <th style={{ padding: "8px", textAlign: "left" }}>
                  Producto
                </th>
                <th style={{ padding: "8px", textAlign: "right" }}>
                  Cantidad
                </th>
              </tr>
            </thead>
            <tbody>
              {selectedSuministro.Suministras &&
              selectedSuministro.Suministras.length > 0 ? (
                selectedSuministro.Suministras.map((item, idx) => (
                  <tr
                    key={idx}
                    style={{ borderBottom: "1px solid #f9f9f9" }}
                  >
                    {/* 👇 CELDA DE FOTO */}
                    <td style={{ padding: "8px" }}>
                      {item.Producto?.imagen_url ? (
                        <img
                          src={item.Producto.imagen_url}
                          alt={item.Producto.nombre_producto}
                          style={{
                            width: "40px",
                            height: "40px",
                            objectFit: "cover",
                            borderRadius: "6px",
                            background: "#f3f4f6",
                          }}
                        />
                      ) : (
                        <span style={{ color: "#999", fontSize: "0.8rem" }}>
                          Sin foto
                        </span>
                      )}
                    </td>

                    <td style={{ padding: "8px" }}>{item.id_producto}</td>
                    <td style={{ padding: "8px" }}>
                      {item.Producto?.nombre_producto ||
                        "Producto no encontrado"}
                    </td>
                    <td
                      style={{
                        padding: "8px",
                        textAlign: "right",
                        fontWeight: "bold",
                      }}
                    >
                      {item.cantidad}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: "15px",
                      textAlign: "center",
                      color: "#888",
                    }}
                  >
                    No hay detalles disponibles para este suministro.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="agromat-modal-footer">
        <button
          type="button"
          className="agromat-btn-secondary"
          onClick={() => setDetailsOpen(false)}
        >
          Cerrar
        </button>
      </div>
    </div>
  </div>
)}

{/* --- MODAL REGISTRO MANUAL ... (resto igual) */}

      {/* --- MODAL REGISTRO MANUAL (Sin cambios mayores) --- */}
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
              
              {/* Agregar items Manualmente */}
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