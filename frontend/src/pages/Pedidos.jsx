// frontend/src/pages/Pedidos.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import { getPedidos, createPedido, updatePedido, deletePedido } from "../api/pedidos";
import { getProductos } from "../api/productos";
import { getClientes } from "../api/clientes";
import { getEmpleados } from "../api/empleados";
import {
  ArrowUp, ArrowDown, ArrowUpDown,
  CheckCircle, Clock, XCircle, Truck, Package, FileText
} from "lucide-react";

const STATUS_OPTIONS = ["Pendiente", "En proceso", "Completado", "Cancelado"];

const emptyForm = {
  fecha_pedido: "",
  hora_pedido: "",
  status: "Pendiente",
  id_empleado: "",
  id_cliente: "",
  direccion_envio: "",
  fecha_entrega_estimada: "",
  quien_pidio: "",
  observaciones: "",
  numero_remito: "", // ✅ NUEVO
  descuento_total: 0,
  impuesto_total: 0,
  items: [],
};

function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(d) {
  return d.toTimeString().slice(0, 5);
}

export default function Pedidos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const [filters, setFilters] = useState({
    client: "",
    product: "",
    dateStart: "",
    dateEnd: "",
    status: "",
    remito: "", // ✅ NUEVO: filtro por remito
  });

  const [sortConfig, setSortConfig] = useState({ key: "id_pedido", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

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

      const pedidosData = resPed.data.map(p => ({
        ...p,
        quien_pidio: p.quien_pidio || "",
        fecha_entrega_estimada: p.fecha_entrega_estimada || "",
        observaciones: p.observaciones || "",
        numero_remito: p.numero_remito || "", // ✅ NUEVO
        items: (p.Productos || []).map(prod => ({
          id_producto: prod.id_producto,
          nombre_producto: prod.nombre_producto,
          cantidad: prod.Contiene?.cantidad || 0,
          precio_unitario: prod.Contiene?.precio_unitario || prod.precio
        }))
      }));

      setItems(pedidosData);
      setProductos(resProd.data);
      setClientes(resCli.data);
      setEmpleados(resEmp.data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "Error al cargar datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const processedItems = useMemo(() => {
    let result = [...items];

    if (filters.client) {
      const q = filters.client.toLowerCase();
      result = result.filter(x =>
        x.Cliente?.nombre_cliente?.toLowerCase().includes(q) ||
        x.quien_pidio?.toLowerCase().includes(q)
      );
    }
    if (filters.product) {
      const q = filters.product.toLowerCase();
      result = result.filter(x => x.items.some(i => i.nombre_producto.toLowerCase().includes(q)));
    }
    if (filters.status) {
      result = result.filter(x => x.status === filters.status);
    }
    if (filters.dateStart) {
      result = result.filter(x => x.fecha_pedido >= filters.dateStart);
    }
    if (filters.dateEnd) {
      result = result.filter(x => x.fecha_pedido <= filters.dateEnd);
    }
    // ✅ NUEVO: Filtro por número de remito
    if (filters.remito) {
      const q = filters.remito.toLowerCase();
      result = result.filter(x => x.numero_remito?.toLowerCase().includes(q));
    }

    if (sortConfig.key) {
      result.sort((a, b) => {
        let valA = a[sortConfig.key];
        let valB = b[sortConfig.key];

        if (sortConfig.key === "cliente") {
          valA = a.Cliente?.nombre_cliente || "";
          valB = b.Cliente?.nombre_cliente || "";
        }

        if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
        if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [items, filters, sortConfig]);

  const totalPages = Math.ceil(processedItems.length / itemsPerPage);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return processedItems.slice(start, start + itemsPerPage);
  }, [processedItems, currentPage]);

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc"
    }));
  };

  const getSortIcon = (key) => {
    if (sortConfig.key !== key) return <ArrowUpDown size={14} className="text-gray-400" />;
    return sortConfig.direction === "asc"
      ? <ArrowUp size={14} className="text-blue-600" />
      : <ArrowDown size={14} className="text-blue-600" />;
  };

  const getStatusBadge = (status) => {
    const s = status || "Pendiente";
    let color = "bg-gray-100 text-gray-600";
    let icon = <Clock size={14} />;

    if (s === "En proceso") { color = "bg-blue-100 text-blue-700"; icon = <Package size={14} />; }
    else if (s === "Completado") { color = "bg-green-100 text-green-700"; icon = <CheckCircle size={14} />; }
    else if (s === "Cancelado") { color = "bg-red-100 text-red-700"; icon = <XCircle size={14} />; }

    return (
      <span className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${color}`}>
        {icon} {s}
      </span>
    );
  };

  const openCreate = () => {
    const now = new Date();
    setEditingId(null);
    setForm({ ...emptyForm, fecha_pedido: formatDate(now), hora_pedido: formatTime(now) });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_pedido);
    setForm({
      ...row,
      direccion_envio: row.direccion_envio || "",
      fecha_entrega_estimada: row.fecha_entrega_estimada || "",
      quien_pidio: row.quien_pidio || "",
      observaciones: row.observaciones || "",
      numero_remito: row.numero_remito || "", // ✅ NUEVO
      items: row.items || []
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (form.items.length === 0) return Swal.fire("Error", "Agrega al menos un producto", "warning");

    try {
      const payload = {
        ...form,
        id_empleado: Number(form.id_empleado),
        id_cliente: Number(form.id_cliente),
        descuento_total: Number(form.descuento_total),
        impuesto_total: Number(form.impuesto_total),
        fecha_entrega_estimada: form.fecha_entrega_estimada || null,
        numero_remito: form.numero_remito || null, // ✅ NUEVO
      };

      if (editingId) {
        await updatePedido(editingId, payload);
        Swal.fire("Éxito", "Pedido actualizado", "success");
      } else {
        await createPedido(payload);
        Swal.fire("Éxito", "Pedido creado", "success");
      }
      setModalOpen(false);
      load();
    } catch (e) {
      console.error(e);
      const msg = e.response?.data?.error || "No se pudo guardar";
      Swal.fire("Error", msg, "error");
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Borrar registro?",
      text: `Se eliminará permanentemente el pedido #${row.id_pedido} de la base de datos.`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, borrar definitivamente",
      cancelButtonText: "No, mantener",
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
    });
    if (!result.isConfirmed) return;
    try {
      await deletePedido(row.id_pedido);
      Swal.fire("🗑️ Eliminado", "Pedido eliminado", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  const agregarItem = () => {
    if (!nuevoItem.id_producto) return;
    const prod = productos.find(p => p.id_producto === nuevoItem.id_producto);
    const precio = nuevoItem.precio_unitario || prod.precio;

    setForm(prev => {
      const existe = prev.items.find(i => i.id_producto === nuevoItem.id_producto);
      let nuevosItems;
      if (existe) {
        nuevosItems = prev.items.map(i => i.id_producto === nuevoItem.id_producto
          ? { ...i, cantidad: Number(i.cantidad) + Number(nuevoItem.cantidad) } : i);
      } else {
        nuevosItems = [...prev.items, { ...nuevoItem, nombre_producto: prod.nombre_producto, precio_unitario: precio }];
      }
      return { ...prev, items: nuevosItems };
    });
    setNuevoItem({ id_producto: "", cantidad: 1, precio_unitario: 0 });
  };

  const totalCalculado = form.items.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0);

  return (
    <div style={{ padding: "1.5rem" }}>
      <div className="flex justify-between items-center mb-6">
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>📦 Gestión de Pedidos</h2>
        <button onClick={openCreate} style={{ background: "#4F46E5", color: "white", padding: "8px 16px", borderRadius: "8px", border: "none", cursor: "pointer" }}>
          + Nuevo Pedido
        </button>
      </div>

      {/* BARRA DE FILTROS */}
      <div style={{ background: "white", padding: "15px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", marginBottom: "20px", display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "flex-end" }}>

        <div style={{ flex: 1, minWidth: "150px" }}>
          <label className="text-xs font-bold text-gray-500 mb-1 block">Cliente / Quien pidió</label>
          <input type="text" className="agromat-input" placeholder="Buscar..." value={filters.client} onChange={e => setFilters({ ...filters, client: e.target.value })} />
        </div>

        <div style={{ flex: 1, minWidth: "150px" }}>
          <label className="text-xs font-bold text-gray-500 mb-1 block">Producto</label>
          <input type="text" className="agromat-input" placeholder="Contiene..." value={filters.product} onChange={e => setFilters({ ...filters, product: e.target.value })} />
        </div>

        {/* ✅ NUEVO: Filtro por remito */}
        <div style={{ flex: 1, minWidth: "120px" }}>
          <label className="text-xs font-bold text-gray-500 mb-1 block">Nº Remito</label>
          <input type="text" className="agromat-input" placeholder="Buscar..." value={filters.remito} onChange={e => setFilters({ ...filters, remito: e.target.value })} />
        </div>

        <div style={{ width: "140px" }}>
          <label className="text-xs font-bold text-gray-500 mb-1 block">Estado</label>
          <select className="agromat-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
            <option value="">Todos</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>

        <div style={{ display: "flex", gap: "5px" }}>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Desde</label>
            <input type="date" className="agromat-input" value={filters.dateStart} onChange={e => setFilters({ ...filters, dateStart: e.target.value })} />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 mb-1 block">Hasta</label>
            <input type="date" className="agromat-input" value={filters.dateEnd} onChange={e => setFilters({ ...filters, dateEnd: e.target.value })} />
          </div>
        </div>

        <button
          onClick={() => setFilters({ client: "", product: "", dateStart: "", dateEnd: "", status: "", remito: "" })}
          style={{ padding: "8px 12px", background: "#f3f4f6", border: "1px solid #ddd", borderRadius: "6px", height: "38px", cursor: "pointer" }}
        >
          Limpiar
        </button>
      </div>

      {/* TABLA */}
      <div style={{ background: "white", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
          <thead style={{ background: "#f9fafb", color: "#555", borderBottom: "2px solid #eee" }}>
            <tr>
              <th onClick={() => handleSort("id_pedido")} className="p-3 text-left cursor-pointer hover:bg-gray-100 flex items-center gap-1">
                ID {getSortIcon("id_pedido")}
              </th>
              <th onClick={() => handleSort("fecha_pedido")} className="p-3 text-left cursor-pointer hover:bg-gray-100">
                Fecha {getSortIcon("fecha_pedido")}
              </th>
              <th onClick={() => handleSort("cliente")} className="p-3 text-left cursor-pointer hover:bg-gray-100">
                Cliente {getSortIcon("cliente")}
              </th>
              <th className="p-3 text-left">Quien pidió</th>
              {/* ✅ NUEVO: Columna Remito */}
              <th onClick={() => handleSort("numero_remito")} className="p-3 text-center cursor-pointer hover:bg-gray-100">
                Remito {getSortIcon("numero_remito")}
              </th>
              <th className="p-3 text-center">Entrega Est.</th>
              <th onClick={() => handleSort("status")} className="p-3 text-center cursor-pointer hover:bg-gray-100">
                Estado {getSortIcon("status")}
              </th>
              <th onClick={() => handleSort("total")} className="p-3 text-right cursor-pointer hover:bg-gray-100">
                Total {getSortIcon("total")}
              </th>
              <th className="p-3 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px" }}>Cargando...</td></tr>
            ) : paginatedItems.length === 0 ? (
              <tr><td colSpan={9} style={{ textAlign: "center", padding: "40px" }}>Sin resultados</td></tr>
            ) : (
              paginatedItems.map(row => (
                <tr key={row.id_pedido} style={{ borderTop: "1px solid #eee" }} className="hover:bg-gray-50">
                  <td className="p-3 font-medium">#{row.id_pedido}</td>
                  <td className="p-3 text-gray-600">{row.fecha_pedido}</td>
                  <td className="p-3">
                    <div className="font-medium">{row.Cliente?.nombre_cliente || "N/A"}</div>
                    <div className="text-xs text-gray-500 truncate max-w-[200px]">{row.direccion_envio}</div>
                  </td>
                  <td className="p-3 text-gray-600 text-sm">{row.quien_pidio || "-"}</td>
                  {/* ✅ NUEVO: Mostrar remito */}
                  <td className="p-3 text-center">
                    {row.numero_remito ? (
                      <span className="flex items-center justify-center gap-1 text-sm font-medium text-purple-700 bg-purple-100 px-2 py-1 rounded">
                        <FileText size={12} /> {row.numero_remito}
                      </span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="p-3 text-center text-sm text-gray-600">
                    {row.fecha_entrega_estimada ? (
                      <span className="flex items-center justify-center gap-1">
                        <Truck size={12} /> {row.fecha_entrega_estimada}
                      </span>
                    ) : "-"}
                  </td>
                  <td className="p-3 text-center">
                    {getStatusBadge(row.status)}
                  </td>
                  <td className="p-3 text-right font-medium">
                    ${Number(row.total).toFixed(2)}
                  </td>
                  <td className="p-3 text-center">
                    <div style={{ display: "flex", gap: "8px", justifyContent: "center" }}>
                      <button
                        onClick={() => openEdit(row)}
                        style={{
                          background: "#F59E0B",
                          color: "white",
                          padding: "5px 12px",
                          borderRadius: "999px",
                          border: "none",
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          fontWeight: 500
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
                          fontSize: "0.8rem",
                          cursor: "pointer",
                          fontWeight: 500
                        }}
                      >
                        Borrar
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* PAGINACIÓN */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "15px" }}>
        <span className="text-sm text-gray-500">Mostrando {paginatedItems.length} de {processedItems.length} pedidos</span>
        <div style={{ display: "flex", gap: "5px" }}>
          {Array.from({ length: totalPages }, (_, i) => i + 1).map(pageNum => (
            <button
              key={pageNum}
              onClick={() => setCurrentPage(pageNum)}
              style={{
                padding: "6px 12px",
                borderRadius: "6px",
                border: "1px solid #ddd",
                background: currentPage === pageNum ? "#4F46E5" : "white",
                color: currentPage === pageNum ? "white" : "#333",
                cursor: "pointer"
              }}
            >
              {pageNum}
            </button>
          ))}
        </div>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div className="agromat-modal-backdrop">
          <div className="agromat-modal-card" style={{ maxWidth: "850px" }}>
            <div className="agromat-modal-header">
              <h2>{editingId ? "Editar Pedido" : "Nuevo Pedido"}</h2>
              <button onClick={() => setModalOpen(false)} className="agromat-modal-close">✕</button>
            </div>

            <form onSubmit={save} className="agromat-modal-body">
              <div className="agromat-form-grid">

                {/* Fechas y Status */}
                <div className="agromat-form-field">
                  <label>Fecha Pedido</label>
                  <input type="date" className="agromat-input" value={form.fecha_pedido} onChange={e => setForm({ ...form, fecha_pedido: e.target.value })} required />
                </div>
                <div className="agromat-form-field">
                  <label>Fecha Estimada Despacho</label>
                  <input type="date" className="agromat-input" value={form.fecha_entrega_estimada} onChange={e => setForm({ ...form, fecha_entrega_estimada: e.target.value })} />
                </div>
                <div className="agromat-form-field">
                  <label>Hora</label>
                  <input type="time" className="agromat-input" value={form.hora_pedido} onChange={e => setForm({ ...form, hora_pedido: e.target.value })} required />
                </div>
                <div className="agromat-form-field">
                  <label>Status</label>
                  <select className="agromat-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Cliente y Empleado */}
                <div className="agromat-form-field">
                  <label>Cliente</label>
                  <select className="agromat-select" value={form.id_cliente} onChange={e => setForm({ ...form, id_cliente: e.target.value })} required>
                    <option value="">Selecciona...</option>
                    {clientes.map(c => <option key={c.id_cliente} value={c.id_cliente}>{c.nombre_cliente}</option>)}
                  </select>
                </div>
                <div className="agromat-form-field">
                  <label>Vendedor (Empleado)</label>
                  <select className="agromat-select" value={form.id_empleado} onChange={e => setForm({ ...form, id_empleado: e.target.value })} required>
                    <option value="">Selecciona...</option>
                    {empleados.map(e => <option key={e.id_empleado} value={e.id_empleado}>{e.nombre_empleado}</option>)}
                  </select>
                </div>

                <div className="agromat-form-field">
                  <label>¿Quién pidió? (Contacto)</label>
                  <input type="text" className="agromat-input" placeholder="Ej. Arq. Pérez" value={form.quien_pidio} onChange={e => setForm({ ...form, quien_pidio: e.target.value })} />
                </div>

                {/* ✅ NUEVO: Campo Número de Remito */}
                <div className="agromat-form-field">
                  <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <FileText size={14} /> Nº de Remito
                  </label>
                  <input 
                    type="text" 
                    className="agromat-input" 
                    placeholder="Ej. REM-2025-001" 
                    value={form.numero_remito} 
                    onChange={e => setForm({ ...form, numero_remito: e.target.value })} 
                  />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Dirección Envío</label>
                  <input type="text" className="agromat-input" value={form.direccion_envio} onChange={e => setForm({ ...form, direccion_envio: e.target.value })} />
                </div>

                <div className="agromat-form-field agromat-full-row">
                  <label>Observaciones</label>
                  <textarea className="agromat-textarea" rows="2" value={form.observaciones} onChange={e => setForm({ ...form, observaciones: e.target.value })} placeholder="Notas internas..." />
                </div>
              </div>

              {/* Items Section */}
              <div style={{ background: "#f9fafb", padding: "15px", borderRadius: "10px", marginTop: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "0.9rem" }}>Productos ({form.items.length}) - Total: ${totalCalculado.toFixed(2)}</h4>

                <div style={{ display: "flex", gap: "8px", marginBottom: "10px" }}>
                  <select className="agromat-select" style={{ flex: 2 }} value={nuevoItem.id_producto} onChange={e => setNuevoItem({ ...nuevoItem, id_producto: e.target.value })}>
                    <option value="">Buscar producto...</option>
                    {productos.map(p => <option key={p.id_producto} value={p.id_producto}>{p.nombre_producto} (${p.precio})</option>)}
                  </select>
                  <input type="number" className="agromat-input" style={{ width: "80px" }} min="1" value={nuevoItem.cantidad} onChange={e => setNuevoItem({ ...nuevoItem, cantidad: e.target.value })} />
                  <button type="button" className="agromat-btn-primary" onClick={agregarItem}>+</button>
                </div>

                <div style={{ maxHeight: "150px", overflowY: "auto" }}>
                  <table style={{ width: "100%", fontSize: "0.85rem" }}>
                    <tbody>
                      {form.items.map(it => (
                        <tr key={it.id_producto} style={{ borderBottom: "1px solid #eee" }}>
                          <td className="p-1">{it.nombre_producto}</td>
                          <td className="p-1 font-bold">x{it.cantidad}</td>
                          <td className="p-1 text-right">${(it.cantidad * it.precio_unitario).toFixed(2)}</td>
                          <td className="p-1 text-right">
                            <button type="button" onClick={() => setForm(f => ({ ...f, items: f.items.filter(x => x.id_producto !== it.id_producto) }))} className="text-red-500 font-bold">×</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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