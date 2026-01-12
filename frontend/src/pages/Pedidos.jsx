// frontend/src/pages/Pedidos.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getPedidos, createPedido, updatePedido, deletePedido } from "../api/pedidos";
import { getProductos } from "../api/productos";
import { getClientes } from "../api/clientes";
import { getEmpleados } from "../api/empleados";
import logoAgromat from "../assets/agromat-logo.png"; 
import {
  CheckCircle, Clock, XCircle, Package, Download
} from "lucide-react";

// =============================
// Estilos Compactos
// =============================
const S = {
  page: { padding: "1.5rem" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" },
  title: { fontSize: "1.5rem", fontWeight: "750", margin: 0, letterSpacing: "-0.02em" },
  filterBar: {
    background: "white", padding: "16px", borderRadius: "14px",
    boxShadow: "0 1px 10px rgba(0,0,0,0.04)", marginBottom: "20px",
    display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end",
    border: "1px solid #e5e7eb"
  },
  tableCard: {
    background: "white", borderRadius: "14px", border: "1px solid #e5e7eb",
    boxShadow: "0 1px 10px rgba(0,0,0,0.04)", overflowX: "auto"
  },
  table: { width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" },
  thead: { background: "#f9fafb", color: "#374151", borderBottom: "1px solid #e5e7eb" },
  th: { padding: "12px", textAlign: "left", fontWeight: "800", fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em", cursor: "pointer" },
  td: { padding: "12px", borderTop: "1px solid #f1f5f9", verticalAlign: "middle" },
  btnAction: (bg) => ({
    background: bg, color: "white", padding: "6px 12px", borderRadius: "10px",
    border: "none", fontSize: "0.75rem", cursor: "pointer", fontWeight: "700",
    display: "inline-flex", alignItems: "center", gap: "4px"
  }),
  paginationBtn: (active) => ({
    padding: "8px 14px", borderRadius: "10px", border: "1px solid #e5e7eb",
    background: active ? "#4F46E5" : "white", color: active ? "white" : "#374151",
    cursor: "pointer", fontWeight: "700", fontSize: "0.85rem"
  })
};

const STATUS_OPTIONS = ["Pendiente", "En proceso", "Completado", "Cancelado"];

const emptyForm = {
  fecha_pedido: "", hora_pedido: "", status: "Pendiente",
  id_empleado: "", id_cliente: "", direccion_envio: "",
  fecha_entrega_estimada: "", quien_pidio: "", observaciones: "",
  numero_remito: "", descuento_total: 0, impuesto_total: 0, items: [],
};

export default function Pedidos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ client: "", product: "", dateStart: "", dateEnd: "", status: "", remito: "" });
  const [sortConfig, setSortConfig] = useState({ key: "id_pedido", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Divisa (para nuevo pedido)
  const [currency, setCurrency] = useState("USD"); // Moneda seleccionada para el NUEVO pedido
  const [exchangeRate, setExchangeRate] = useState(0.92);

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=USD&to=EUR")
      .then(res => res.json())
      .then(data => { if (data?.rates?.EUR) setExchangeRate(data.rates.EUR); })
      .catch(console.error);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [nuevoItem, setNuevoItem] = useState({ id_producto: "", cantidad: 1, precio_unitario: 0 });

  const load = async () => {
    setLoading(true);
    try {
      const [resPed, resProd, resCli, resEmp] = await Promise.all([
        getPedidos(), getProductos(), getClientes(), getEmpleados()
      ]);
      setItems(resPed.data.map(p => ({
        ...p,
        items: (p.Productos || []).map(prod => ({
          id_producto: prod.id_producto,
          nombre_producto: prod.nombre_producto,
          cantidad: prod.Contiene?.cantidad || 0,
          precio_unitario: prod.Contiene?.precio_unitario || prod.precio
        }))
      })));
      setProductos(resProd.data);
      setClientes(resCli.data);
      setEmpleados(resEmp.data);
    } catch (e) {
      Swal.fire("Error", "Error al cargar datos", "error");
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  // Helper para visualizar precios
  // Si se pasa 'rate' se usa ese (para pedidos históricos), si no, 1 (USD)
  const formatMoney = (amountUSD, currencyCode, rate = 1) => {
    const value = currencyCode === 'EUR' ? amountUSD * rate : amountUSD;
    return Number(value).toLocaleString("es-ES", {
      style: "currency",
      currency: currencyCode || 'USD'
    });
  };

  // =============================
  // Lógica de PDF (Inteligente)
  // =============================
  const descargarPDF = (pedido) => {
    const doc = new jsPDF();
    
    // Usar la moneda y tasa con la que se guardó el pedido
    const mon = pedido.moneda || 'USD';
    const tasa = Number(pedido.tasa_cambio) || 1;
    const simbolo = mon === 'EUR' ? '€' : '$';

    // Función helper interna para el PDF
    const fmt = (val) => {
        const num = mon === 'EUR' ? val * tasa : val;
        return `${simbolo}${Number(num).toFixed(2)}`;
    };

    doc.addImage(logoAgromat, 'PNG', 15, 10, 25, 25);
    doc.setFontSize(22);
    doc.setTextColor(79, 70, 229);
    doc.text("AGROMAT", 45, 22);
    doc.setFontSize(10);
    doc.setTextColor(100);

    doc.setTextColor(0);
    doc.setFontSize(12);
    doc.text(`COTIZACIÓN DE PEDIDO: #${pedido.id_pedido}`, 15, 45);
    doc.setFontSize(10);
    doc.text(`Cliente: ${pedido.Cliente?.nombre_cliente || 'N/A'}`, 15, 52);
    doc.text(`Contacto: ${pedido.quien_pidio || '-'}`, 15, 57);
    doc.text(`Fecha: ${pedido.fecha_pedido}`, 150, 45);
    doc.text(`Moneda: ${mon}`, 150, 50); // Mostrar moneda en el PDF

    const tableBody = pedido.items.map(it => [
      it.id_producto,
      it.nombre_producto,
      fmt(it.precio_unitario), // Convertir precio unitario
      it.cantidad,
      fmt(it.cantidad * it.precio_unitario) // Convertir subtotal
    ]);

    autoTable(doc, {
      startY: 65,
      head: [[`Código`, `Producto`, `P. Unitario (${mon})`, `Cant.`, `Subtotal (${mon})`]],
      body: tableBody,
      headStyles: { fillColor: [79, 70, 229] },
      theme: 'striped',
    });

    const finalY = doc.lastAutoTable.finalY + 10;
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text(`TOTAL FINAL: ${fmt(pedido.total)}`, 140, finalY);

    doc.save(`Cotizacion_Agromat_${pedido.id_pedido}.pdf`);
  };

  const processedItems = useMemo(() => {
    let result = [...items];
    if (filters.client) {
      const q = filters.client.toLowerCase();
      result = result.filter(x => x.Cliente?.nombre_cliente?.toLowerCase().includes(q) || x.quien_pidio?.toLowerCase().includes(q));
    }
    if (filters.status) result = result.filter(x => x.status === filters.status);
    if (filters.remito) result = result.filter(x => x.numero_remito?.toLowerCase().includes(filters.remito.toLowerCase()));

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = sortConfig.key === "cliente" ? (a.Cliente?.nombre_cliente || "") : a[sortConfig.key];
        let valB = sortConfig.key === "cliente" ? (b.Cliente?.nombre_cliente || "") : b[sortConfig.key];
        return sortConfig.direction === "asc" ? (valA < valB ? -1 : 1) : (valA > valB ? -1 : 1);
      });
    }
    return result;
  }, [items, filters, sortConfig]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedItems.slice(start, start + itemsPerPage);
  }, [processedItems, currentPage]);

  const totalPages = Math.ceil(processedItems.length / itemsPerPage);

  const getStatusBadge = (s = "Pendiente") => {
    const meta = {
      "En proceso": { color: "bg-blue-100 text-blue-700", icon: <Package size={14} /> },
      "Completado": { color: "bg-green-100 text-green-700", icon: <CheckCircle size={14} /> },
      "Cancelado": { color: "bg-red-100 text-red-700", icon: <XCircle size={14} /> },
      "Pendiente": { color: "bg-gray-100 text-gray-600", icon: <Clock size={14} /> }
    }[s] || { color: "bg-gray-100 text-gray-600", icon: <Clock size={14} /> };

    return (
      <span className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${meta.color}`}>
        {meta.icon} {s}
      </span>
    );
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.items.length) return Swal.fire("Error", "Agrega al menos un producto", "warning");
    try {
      // Enviamos la moneda y tasa actual al crear
      const payload = { 
          ...form, 
          id_empleado: Number(form.id_empleado), 
          id_cliente: Number(form.id_cliente),
          moneda: currency,
          tasa: exchangeRate
      };
      
      editingId ? await updatePedido(editingId, payload) : await createPedido(payload);
      Swal.fire("Éxito", "Operación completada", "success");
      setModalOpen(false); load();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.error || "Error al guardar", "error");
    }
  };

  // Cálculo del total en tiempo real (en la moneda seleccionada)
  const totalCalculado = form.items.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0);
  
  // Si estamos en EUR, el total calculado ya está en EUR visualmente, pero necesitamos saber si mostramos conversión
  const displayTotalModal = formatMoney(totalCalculado, currency, 1); 
  // Nota: Aquí usamos rate=1 porque el precio_unitario en el form ya lo vamos a guardar como 'base'.
  // PERO, para la visualización correcta en el modal:
  // Si currency es EUR, los precios en el select deben verse en EUR.

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h2 style={S.title}>📦 Gestión de Pedidos</h2>
        <button className="agromat-btn-primary" onClick={() => { setEditingId(null); setForm({ ...emptyForm, fecha_pedido: new Date().toISOString().split('T')[0], hora_pedido: new Date().toTimeString().slice(0, 5) }); setModalOpen(true); }}>
          + Nuevo Pedido
        </button>
      </div>

      {/* Barra de Filtros */}
      <div style={S.filterBar}>
        {/* ... filtros existentes ... */}
        <div style={{ flex: 2, minWidth: "150px" }}>
          <label className="text-xs font-bold text-gray-400 mb-1 block">Cliente / Contacto</label>
          <input type="text" className="agromat-input" placeholder="Buscar..." value={filters.client} onChange={e => setFilters({ ...filters, client: e.target.value })} />
        </div>
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label className="text-xs font-bold text-gray-400 mb-1 block">Remito</label>
          <input type="text" className="agromat-input" placeholder="REM-..." value={filters.remito} onChange={e => setFilters({ ...filters, remito: e.target.value })} />
        </div>
        <div style={{ width: "130px" }}>
          <label className="text-xs font-bold text-gray-400 mb-1 block">Estado</label>
          <select className="agromat-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Todos</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button className="agromat-btn-secondary" style={{ height: "38px" }} onClick={() => setFilters({ client: "", product: "", dateStart: "", dateEnd: "", status: "", remito: "" })}>Limpiar</button>
      </div>

      {/* Tabla */}
      <div style={S.tableCard}>
        <table style={S.table}>
          <thead style={S.thead}>
            <tr>
              <th style={S.th} onClick={() => setSortConfig({ key: "id_pedido", direction: sortConfig.direction === "asc" ? "desc" : "asc" })}>ID</th>
              <th style={S.th}>Fecha</th>
              <th style={S.th}>Cliente</th>
              <th style={S.th} className="text-center">Estado</th>
              <th style={S.th} className="text-right">Total</th>
              <th style={S.th} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-10 text-center text-gray-400">Cargando registros...</td></tr>
            ) : paginatedItems.map(row => (
              <tr key={row.id_pedido} className="hover:bg-gray-50 transition-colors">
                <td style={S.td} className="font-bold text-indigo-600">#{row.id_pedido}</td>
                <td style={S.td} className="text-gray-500 text-xs">{row.fecha_pedido}</td>
                <td style={S.td}>
                  <div className="font-bold text-gray-800">{row.Cliente?.nombre_cliente || "N/A"}</div>
                  <div className="text-xs text-gray-400">{row.quien_pidio}</div>
                </td>
                <td style={S.td} className="text-center flex justify-center">{getStatusBadge(row.status)}</td>
                
                {/* Visualización del Total Histórico */}
                <td style={S.td} className="text-right font-bold text-gray-900">
                    {/* Usamos el moneda y tasa GUARDADOS en la DB */}
                    {formatMoney(row.total, row.moneda, row.tasa_cambio)}
                </td>
                
                <td style={S.td}>
                  <div className="flex gap-2 justify-center">
                    <button title="Exportar Cotización" style={S.btnAction("#4F46E5")} onClick={() => descargarPDF(row)}><Download size={14} /></button>
                    <button style={S.btnAction("#F59E0B")} onClick={() => { setEditingId(row.id_pedido); setForm({ ...row }); setModalOpen(true); }}>Editar</button>
                    <button style={S.btnAction("#DC2626")} onClick={() => {
                      Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed && deletePedido(row.id_pedido).then(() => load()));
                    }}>Borrar</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Paginación (Sin cambios) */}
      <div className="mt-4 flex justify-between items-center px-2">
        <span className="text-xs font-bold text-gray-400">Total: {processedItems.length} registros</span>
        <div className="flex gap-1">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
            <button key={p} style={S.paginationBtn(currentPage === p)} onClick={() => setCurrentPage(p)}>{p}</button>
          ))}
        </div>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card" style={{ maxWidth: "800px" }}>
            <div className="agromat-modal-header">
              <h2 className="text-lg font-black">{editingId ? `Editar #${editingId}` : "Nuevo Pedido"}</h2>
              <button onClick={() => setModalOpen(false)} className="agromat-modal-close">✕</button>
            </div>
            <form onSubmit={save} className="agromat-modal-body">
              <div className="agromat-form-grid">
                <div className="agromat-form-field"><label>Fecha</label><input type="date" className="agromat-input" value={form.fecha_pedido} onChange={e => setForm({ ...form, fecha_pedido: e.target.value })} required /></div>
                <div className="agromat-form-field"><label>Estado</label><select className="agromat-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>{STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="agromat-form-field"><label>Cliente</label><select className="agromat-select" value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })} required><option value="">Selecciona...</option>{clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre_cliente}</option>)}</select></div>
                <div className="agromat-form-field"><label>Vendedor</label><select className="agromat-select" value={form.id_empleado} onChange={e => setForm({ ...form, id_empleado: e.target.value })} required><option value="">Selecciona...</option>{empleados.map(e => <option key={e.id_empleado} value={e.id_empleado}>{e.nombre_empleado}</option>)}</select></div>
                
                {/* SELECTOR DE MONEDA (Solo visible al crear) */}
                {!editingId && (
                    <div className="agromat-form-field">
                        <label>Moneda</label>
                        <div style={{display: 'flex', gap: '5px'}}>
                            <button type="button" onClick={() => setCurrency("USD")} style={{padding:'8px', border: currency==='USD' ? '2px solid blue' : '1px solid #ddd', borderRadius: '6px'}}>USD</button>
                            <button type="button" onClick={() => setCurrency("EUR")} style={{padding:'8px', border: currency==='EUR' ? '2px solid blue' : '1px solid #ddd', borderRadius: '6px'}}>EUR</button>
                        </div>
                    </div>
                )}

                <div className="agromat-form-field"><label>Remito</label><input type="text" className="agromat-input" value={form.numero_remito} onChange={e => setForm({ ...form, numero_remito: e.target.value })} /></div>
                <div className="agromat-form-field"><label>Contacto</label><input type="text" className="agromat-input" value={form.quien_pidio} onChange={e => setForm({ ...form, quien_pidio: e.target.value })} /></div>
              </div>

              {/* Items */}
              <div className="mt-6 bg-gray-50 p-4 rounded-xl border border-gray-100">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-bold text-gray-700 text-sm">Productos ({currency})</h4>
                  {/* Total visual en la moneda seleccionada */}
                  <span className="text-indigo-600 font-black">
                      Subtotal: {formatMoney(totalCalculado, currency, 1)}
                  </span>
                </div>
                <div className="flex gap-2 mb-4">
                  <select className="agromat-select flex-1" value={nuevoItem.id_producto} onChange={e => setNuevoItem({ ...nuevoItem, id_producto: e.target.value })}>
                    <option value="">Buscar producto...</option>
                    {productos.map(p => {
                        // Visualización del precio en el Select
                        const precioVisual = currency === 'EUR' ? p.precio * exchangeRate : p.precio;
                        return (
                            <option key={p.id_producto} value={p.id_producto}>
                                {p.nombre_producto} ({formatMoney(p.precio, currency, exchangeRate)})
                            </option>
                        );
                    })}
                  </select>
                  <input type="number" className="agromat-input w-20" min="1" value={nuevoItem.cantidad} onChange={e => setNuevoItem({ ...nuevoItem, cantidad: e.target.value })} />
                  <button type="button" className="agromat-btn-primary px-4" onClick={() => {
                    if (!nuevoItem.id_producto) return;
                    const prod = productos.find(p => p.id_producto === nuevoItem.id_producto);
                    
                    // Al agregar al carrito del formulario, guardamos el precio VISUAL
                    // El backend se encargará de buscar el precio real en USD
                    const precioParaForm = currency === 'EUR' ? prod.precio * exchangeRate : prod.precio;
                    
                    setForm(prev => ({ ...prev, items: [...prev.items, { ...nuevoItem, nombre_producto: prod.nombre_producto, precio_unitario: precioParaForm }] }));
                    setNuevoItem({ id_producto: "", cantidad: 1, precio_unitario: 0 });
                  }}>+</button>
                </div>
                <div className="max-h-40 overflow-y-auto">
                  {form.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between py-2 border-b text-xs">
                      <span>{it.nombre_producto} <b>x{it.cantidad}</b> ({formatMoney(it.precio_unitario, currency, 1)})</span>
                      <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter((_, i) => i !== idx) }))} className="text-red-500 font-black">✕</button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="agromat-modal-footer mt-6">
                <button type="button" className="agromat-btn-secondary" onClick={() => setModalOpen(false)}>Cancelar</button>
                <button type="submit" className="agromat-btn-primary px-8">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}