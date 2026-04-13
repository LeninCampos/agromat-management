// frontend/src/pages/Pedidos.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Swal from "sweetalert2";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getPedidos, createPedido, updatePedido, deletePedido } from "../api/pedidos";
import { getProductos } from "../api/productos";
import { getClientes } from "../api/clientes";
import { getEmpleados } from "../api/empleados";
import logoAgromat from "../assets/agromat-logo.png"; 
import {
  CheckCircle, Clock, XCircle, Package, Download, Eye
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

// Normalizar texto: minúsculas + sin acentos
const normalize = (str) =>
  (str || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

// Matching tokenizado: devuelve score (0 = no match, mayor = mejor)
const matchCliente = (nombre, contacto, query) => {
  const tokens = normalize(query).split(/\s+/).filter(Boolean);
  if (!tokens.length) return 1;
  const fullText = normalize(nombre) + " " + normalize(contacto);
  if (!tokens.every(t => fullText.includes(t))) return 0;
  const words = normalize(nombre).split(/\s+/);
  let prefixScore = 0;
  for (const t of tokens) if (words.some(w => w.startsWith(t))) prefixScore++;
  let orderScore = 0, lastIdx = -1;
  const n = normalize(nombre);
  for (const t of tokens) { const i = n.indexOf(t); if (i > lastIdx) { orderScore++; lastIdx = i; } }
  return 1 + prefixScore * 2 + orderScore;
};

const emptyForm = {
  fecha_pedido: "", hora_pedido: "", status: "Pendiente",
  id_empleado: "", id_cliente: "", direccion_envio: "",
  fecha_entrega_estimada: "", quien_pidio: "", observaciones: "",
  numero_remito: "", descuento_total: 0, impuesto_total: 0, items: [],
  numero_factura: "", fecha_facturacion: "",
};

// Helper: un pedido está facturado si tiene numero_factura no vacío
const estaFacturado = (p) => !!(p && p.numero_factura && String(p.numero_factura).trim() !== "");

export default function Pedidos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ client: "", product: "", dateStart: "", dateEnd: "", status: "", remito: "", facturacion: "" });
  const [sortConfig, setSortConfig] = useState({ key: "id_pedido", direction: "desc" });
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Estados de Divisa (para nuevo pedido) - Base: EUR
  const [currency, setCurrency] = useState("EUR");
  const [exchangeRate, setExchangeRate] = useState(1.09); // Tasa EUR→USD

  useEffect(() => {
    fetch("https://api.frankfurter.app/latest?from=EUR&to=USD")
      .then(res => res.json())
      .then(data => { if (data?.rates?.USD) setExchangeRate(data.rates.USD); })
      .catch(console.error);
  }, []);

  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);
  const [nuevoItem, setNuevoItem] = useState({ id_producto: "", cantidad: 1, precio_unitario: 0 });

  // Autocomplete de productos
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const productDropdownRef = useRef(null);
  const productInputRef = useRef(null);

  // Autocomplete de cliente
  const [clientSearch, setClientSearch] = useState("");
  const [showClientDropdown, setShowClientDropdown] = useState(false);
  const [highlightedClientIndex, setHighlightedClientIndex] = useState(-1);
  const clientDropdownRef = useRef(null);

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

  // Helper para visualizar precios (base EUR)
  // Si se pasa 'rate' se usa ese (para pedidos históricos), si no, 1 (EUR)
  const formatMoney = (amountEUR, currencyCode, rate = 1) => {
    const value = currencyCode === 'USD' ? amountEUR * rate : amountEUR;
    return Number(value).toLocaleString("es-ES", {
      style: "currency",
      currency: currencyCode || 'EUR'
    });
  };

  // =============================
  // Lógica de PDF (Cotización profesional)
  // =============================
  const IVA_RATE = 0.21;

  const descargarPDF = (pedido) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const marginLeft = 15;
    const marginRight = 15;

    // Moneda y tasa histórica del pedido
    const mon = pedido.moneda || 'EUR';
    const tasa = Number(pedido.tasa_cambio) || 1;

    const fmt = (val) => {
      const num = mon === 'USD' ? val * tasa : val;
      return Number(num).toLocaleString('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }) + (mon === 'USD' ? ' $' : ' \u20ac');
    };

    // ── Header: Logo (aspect ratio correcto) + meta derecha ──
    const logoW = 50;
    const logoH = 25; // ratio original ~2:1 (1018×514)
    doc.addImage(logoAgromat, 'PNG', marginLeft, 10, logoW, logoH);

    // Meta alineada a la derecha
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Fecha: ${pedido.fecha_pedido}`, pageWidth - marginRight, 16, { align: 'right' });
    doc.text(`Moneda: ${mon}`, pageWidth - marginRight, 22, { align: 'right' });

    // Línea separadora bajo header
    const headerEndY = 38;
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.6);
    doc.line(marginLeft, headerEndY, pageWidth - marginRight, headerEndY);

    // ── Título de cotización ──
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text(`COTIZACIÓN DE PEDIDO #${pedido.id_pedido}`, marginLeft, headerEndY + 9);

    // ── Datos del cliente ──
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    const clientY = headerEndY + 17;
    doc.text(`Cliente: ${pedido.Cliente?.nombre_cliente || 'N/A'}`, marginLeft, clientY);
    doc.text(`Contacto: ${pedido.quien_pidio || '-'}`, marginLeft, clientY + 6);

    // ── Tabla de productos ──
    const tableStartY = clientY + 14;

    const tableBody = pedido.items.map(it => [
      it.id_producto,
      it.nombre_producto,
      fmt(it.precio_unitario),
      it.cantidad,
      fmt(it.cantidad * it.precio_unitario)
    ]);

    autoTable(doc, {
      startY: tableStartY,
      head: [['Código', 'Producto', `P. Unitario (${mon})`, 'Cant.', `Subtotal (${mon})`]],
      body: tableBody,
      headStyles: {
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold',
        fontSize: 9,
      },
      bodyStyles: { fontSize: 9 },
      alternateRowStyles: { fillColor: [245, 245, 255] },
      columnStyles: {
        0: { cellWidth: 28 },
        2: { halign: 'right' },
        3: { halign: 'center', cellWidth: 18 },
        4: { halign: 'right' },
      },
      theme: 'striped',
      margin: { left: marginLeft, right: marginRight },
    });

    // ── Bloque de totales con IVA ──
    const totalsSectionY = doc.lastAutoTable.finalY + 12;

    // Calcular totales desde los items (siempre en moneda base EUR, luego convertir)
    const totalSinIva = pedido.items.reduce(
      (acc, it) => acc + (Number(it.cantidad) * Number(it.precio_unitario)), 0
    );
    const iva = totalSinIva * IVA_RATE;
    const totalConIva = totalSinIva + iva;

    const totalsX = pageWidth - marginRight;
    const labelX = totalsX - 60;

    // Total sin IVA
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(60);
    doc.text('Total sin IVA:', labelX, totalsSectionY, { align: 'right' });
    doc.text(fmt(totalSinIva), totalsX, totalsSectionY, { align: 'right' });

    // IVA (21%)
    doc.text('IVA (21%):', labelX, totalsSectionY + 7, { align: 'right' });
    doc.text(fmt(iva), totalsX, totalsSectionY + 7, { align: 'right' });

    // Línea separadora antes del total con IVA
    doc.setDrawColor(79, 70, 229);
    doc.setLineWidth(0.4);
    doc.line(labelX - 5, totalsSectionY + 11, totalsX, totalsSectionY + 11);

    // Total con IVA (destacado)
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(79, 70, 229);
    doc.text('Total con IVA:', labelX, totalsSectionY + 18, { align: 'right' });
    doc.text(fmt(totalConIva), totalsX, totalsSectionY + 18, { align: 'right' });

    doc.save(`Cotizacion_Agromat_${pedido.id_pedido}.pdf`);
  };

  // =============================
  // Preview de detalles del pedido
  // =============================
  const verDetalles = (pedido) => {
    const mon = pedido.moneda || 'EUR';
    const tasa = Number(pedido.tasa_cambio) || 1;
    const fmtHTML = (val) => {
      const num = mon === 'USD' ? val * tasa : val;
      return Number(num).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
        + (mon === 'USD' ? ' $' : ' €');
    };

    const totalSinIva = pedido.items.reduce(
      (acc, it) => acc + (Number(it.cantidad) * Number(it.precio_unitario)), 0
    );
    const iva = totalSinIva * IVA_RATE;
    const totalConIva = totalSinIva + iva;

    const itemsHTML = pedido.items.map(it =>
      `<tr>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${it.id_producto}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;font-size:13px">${it.nombre_producto}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:13px">${fmtHTML(it.precio_unitario)}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:center;font-size:13px">${it.cantidad}</td>
        <td style="padding:6px 8px;border-bottom:1px solid #eee;text-align:right;font-size:13px">${fmtHTML(it.cantidad * it.precio_unitario)}</td>
      </tr>`
    ).join('');

    Swal.fire({
      title: `Pedido #${pedido.id_pedido}`,
      width: 700,
      html: `
        <div style="text-align:left;font-size:14px;color:#333">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:16px;padding:12px;background:#f9fafb;border-radius:8px">
            <div><strong>Cliente:</strong> ${pedido.Cliente?.nombre_cliente || 'N/A'}</div>
            <div><strong>Contacto:</strong> ${pedido.quien_pidio || '-'}</div>
            <div><strong>Fecha:</strong> ${pedido.fecha_pedido}</div>
            <div><strong>Estado:</strong> ${pedido.status}</div>
            <div><strong>Moneda:</strong> ${mon}</div>
            <div><strong>N° Remito:</strong> ${pedido.numero_remito || '-'}</div>
            <div><strong>N° Factura:</strong> ${pedido.numero_factura ? `<span style="color:#065F46;font-weight:700">${pedido.numero_factura}</span>` : '<span style="color:#9CA3AF">Sin facturar</span>'}</div>
            <div><strong>Fecha facturación:</strong> ${pedido.fecha_facturacion ? String(pedido.fecha_facturacion).slice(0, 10) : '-'}</div>
            <div><strong>Dirección envío:</strong> ${pedido.direccion_envio || '-'}</div>
            <div><strong>Entrega estimada:</strong> ${pedido.fecha_entrega_estimada || '-'}</div>
          </div>
          ${pedido.observaciones ? `<div style="margin-bottom:12px;padding:8px 12px;background:#fffbeb;border-left:3px solid #F59E0B;border-radius:4px;font-size:13px"><strong>Observaciones:</strong> ${pedido.observaciones}</div>` : ''}
          <table style="width:100%;border-collapse:collapse;margin-bottom:12px">
            <thead>
              <tr style="background:#4F46E5;color:white">
                <th style="padding:8px;text-align:left;font-size:12px;border-radius:6px 0 0 0">Código</th>
                <th style="padding:8px;text-align:left;font-size:12px">Producto</th>
                <th style="padding:8px;text-align:right;font-size:12px">P. Unit.</th>
                <th style="padding:8px;text-align:center;font-size:12px">Cant.</th>
                <th style="padding:8px;text-align:right;font-size:12px;border-radius:0 6px 0 0">Subtotal</th>
              </tr>
            </thead>
            <tbody>${itemsHTML}</tbody>
          </table>
          <div style="display:flex;flex-direction:column;align-items:flex-end;gap:4px;padding-top:8px;border-top:2px solid #e5e7eb">
            <div style="font-size:13px;color:#666">Total sin IVA: <strong>${fmtHTML(totalSinIva)}</strong></div>
            <div style="font-size:13px;color:#666">IVA (21%): <strong>${fmtHTML(iva)}</strong></div>
            <div style="font-size:16px;font-weight:bold;color:#4F46E5;margin-top:4px">Total con IVA: ${fmtHTML(totalConIva)}</div>
          </div>
        </div>
      `,
      showCloseButton: true,
      showConfirmButton: false,
    });
  };

  const processedItems = useMemo(() => {
    let result = [...items];
    if (filters.client) {
      const q = filters.client;
      result = result
        .map(x => ({
          _row: x,
          _score: matchCliente(
            x.Cliente?.nombre_cliente,
            // matchCliente compone fullText = nombre + " " + contacto,
            // así que pasamos contacto del cliente + quien_pidio para matchear ambos.
            `${x.Cliente?.nombre_contacto || ""} ${x.quien_pidio || ""}`,
            q
          ),
        }))
        .filter(o => o._score > 0)
        .sort((a, b) => b._score - a._score)
        .map(o => o._row);
    }
    if (filters.status) result = result.filter(x => x.status === filters.status);
    if (filters.remito) result = result.filter(x => x.numero_remito?.toLowerCase().includes(filters.remito.toLowerCase()));
    if (filters.dateStart) result = result.filter(x => x.fecha_pedido && x.fecha_pedido >= filters.dateStart);
    if (filters.dateEnd) result = result.filter(x => x.fecha_pedido && x.fecha_pedido <= filters.dateEnd);
    if (filters.facturacion === "facturados") result = result.filter(x => estaFacturado(x));
    else if (filters.facturacion === "sin_facturar") result = result.filter(x => !estaFacturado(x));
    else if (filters.facturacion === "completados_sin_facturar") result = result.filter(x => x.status === "Completado" && !estaFacturado(x));

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

  // =============================
  // Totalizadores sobre los pedidos filtrados
  // =============================
  const summary = useMemo(() => {
    const acc = {
      count: 0,
      total: 0,
      porStatus: {}, // { [status]: { count, total } }
      facturados: { count: 0, total: 0 },
      sinFacturar: { count: 0, total: 0 },
      completadosSinFacturar: 0,
    };
    for (const p of processedItems) {
      const t = Number(p.total) || 0;
      acc.count++;
      acc.total += t;
      const s = p.status || "Pendiente";
      if (!acc.porStatus[s]) acc.porStatus[s] = { count: 0, total: 0 };
      acc.porStatus[s].count++;
      acc.porStatus[s].total += t;
      if (estaFacturado(p)) {
        acc.facturados.count++;
        acc.facturados.total += t;
      } else {
        acc.sinFacturar.count++;
        acc.sinFacturar.total += t;
        if (p.status === "Completado") acc.completadosSinFacturar++;
      }
    }
    return acc;
  }, [processedItems]);

  // Formateador simple para EUR (moneda por defecto del resumen)
  const fmtEUR = (v) => Number(v || 0).toLocaleString("es-ES", { style: "currency", currency: "EUR" });

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
    if (!form.id_cliente) return Swal.fire("Error", "Selecciona un cliente", "warning");
    if (!form.items.length) return Swal.fire("Error", "Agrega al menos un producto", "warning");
    try {
      const payload = {
          ...form,
          id_empleado: Number(form.id_empleado),
          id_cliente: Number(form.id_cliente),
          // Facturación: normalizar vacíos a null para que el backend los limpie.
          numero_factura: form.numero_factura && String(form.numero_factura).trim() !== ""
            ? String(form.numero_factura).trim()
            : null,
          fecha_facturacion: form.fecha_facturacion ? form.fecha_facturacion : null,
      };

      if (editingId) {
        // Al editar, NO enviamos moneda/tasa para no corromper historial
        await updatePedido(editingId, payload);
      } else {
        // Al crear, sí enviamos la moneda y tasa actual
        payload.moneda = currency;
        payload.tasa = exchangeRate;
        await createPedido(payload);
      }
      Swal.fire("Éxito", "Operación completada", "success");
      setModalOpen(false); load();
    } catch (e) {
      Swal.fire("Error", e.response?.data?.error || "Error al guardar", "error");
    }
  };

  // Cálculo del total en tiempo real (en la moneda seleccionada)
  const totalCalculado = form.items.reduce((acc, it) => acc + (it.cantidad * it.precio_unitario), 0);
  
  // Autocomplete: productos filtrados por búsqueda (nombre o código)
  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productos.slice(0, 20);
    const prefixed = [];
    const contained = [];
    for (const p of productos) {
      const nombre = p.nombre_producto.toLowerCase();
      const codigo = p.id_producto.toLowerCase();
      if (nombre.startsWith(q) || codigo.startsWith(q)) prefixed.push(p);
      else if (nombre.includes(q) || codigo.includes(q)) contained.push(p);
    }
    return [...prefixed, ...contained].slice(0, 20);
  }, [productos, productSearch]);

  // Autocomplete: clientes filtrados por búsqueda tokenizada
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim();
    if (!q) return clientes.slice(0, 20);
    return clientes
      .map(c => ({ ...c, _score: matchCliente(c.nombre_cliente, c.nombre_contacto, q) }))
      .filter(c => c._score > 0)
      .sort((a, b) => b._score - a._score)
      .slice(0, 20);
  }, [clientes, clientSearch]);

  const selectProduct = useCallback((prod) => {
    setNuevoItem(prev => ({ ...prev, id_producto: prod.id_producto }));
    setProductSearch(`${prod.nombre_producto} — ${prod.id_producto}`);
    setShowProductDropdown(false);
    setHighlightedIndex(-1);
  }, []);

  const selectClient = useCallback((cliente) => {
    setForm(prev => ({ ...prev, id_cliente: String(cliente.id_cliente) }));
    setClientSearch(cliente.nombre_cliente || "");
    setShowClientDropdown(false);
    setHighlightedClientIndex(-1);
  }, []);

  const handleProductKeyDown = useCallback((e) => {
    if (!showProductDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < filteredProducts.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : filteredProducts.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedIndex >= 0 && filteredProducts[highlightedIndex]) {
        selectProduct(filteredProducts[highlightedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowProductDropdown(false);
      setHighlightedIndex(-1);
    }
  }, [showProductDropdown, filteredProducts, highlightedIndex, selectProduct]);

  const handleClientKeyDown = useCallback((e) => {
    if (!showClientDropdown) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedClientIndex(prev => (prev < filteredClients.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedClientIndex(prev => (prev > 0 ? prev - 1 : filteredClients.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (highlightedClientIndex >= 0 && filteredClients[highlightedClientIndex]) {
        selectClient(filteredClients[highlightedClientIndex]);
      }
    } else if (e.key === "Escape") {
      setShowClientDropdown(false);
      setHighlightedClientIndex(-1);
    }
  }, [showClientDropdown, filteredClients, highlightedClientIndex, selectClient]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (productDropdownRef.current && !productDropdownRef.current.contains(e.target)) {
        setShowProductDropdown(false);
        setHighlightedIndex(-1);
      }
      if (clientDropdownRef.current && !clientDropdownRef.current.contains(e.target)) {
        setShowClientDropdown(false);
        setHighlightedClientIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div style={S.page}>
      <div style={S.header}>
        <h2 style={S.title}>📦 Gestión de Pedidos</h2>
        <button className="agromat-btn-primary" onClick={() => { setEditingId(null); setForm({ ...emptyForm, fecha_pedido: new Date().toISOString().split('T')[0], hora_pedido: new Date().toTimeString().slice(0, 5) }); setProductSearch(""); setClientSearch(""); setNuevoItem({ id_producto: "", cantidad: 1, precio_unitario: 0 }); setModalOpen(true); }}>
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
        <div style={{ width: "140px" }}>
          <label className="text-xs font-bold text-gray-400 mb-1 block">Desde</label>
          <input type="date" className="agromat-input" value={filters.dateStart} onChange={e => setFilters({ ...filters, dateStart: e.target.value })} />
        </div>
        <div style={{ width: "140px" }}>
          <label className="text-xs font-bold text-gray-400 mb-1 block">Hasta</label>
          <input type="date" className="agromat-input" value={filters.dateEnd} onChange={e => setFilters({ ...filters, dateEnd: e.target.value })} />
        </div>
        <div style={{ width: "170px" }}>
          <label className="text-xs font-bold text-gray-400 mb-1 block">Facturación</label>
          <select className="agromat-select" value={filters.facturacion} onChange={e => setFilters({ ...filters, facturacion: e.target.value })}>
            <option value="">Todos</option>
            <option value="facturados">Facturados</option>
            <option value="sin_facturar">Sin facturar</option>
            <option value="completados_sin_facturar">Completados sin facturar</option>
          </select>
        </div>
        <button
          type="button"
          className="agromat-btn-secondary"
          style={{
            height: "38px",
            background: filters.facturacion === "completados_sin_facturar" ? "#F59E0B" : undefined,
            color: filters.facturacion === "completados_sin_facturar" ? "white" : undefined,
            borderColor: filters.facturacion === "completados_sin_facturar" ? "#F59E0B" : undefined,
          }}
          onClick={() => setFilters(f => ({
            ...f,
            facturacion: f.facturacion === "completados_sin_facturar" ? "" : "completados_sin_facturar",
          }))}
          title="Mostrar solo pedidos Completados que aún no fueron facturados"
        >
          {filters.facturacion === "completados_sin_facturar" ? "✓ Completados s/ factura" : "Completados s/ factura"}
        </button>
        <button className="agromat-btn-secondary" style={{ height: "38px" }} onClick={() => setFilters({ client: "", product: "", dateStart: "", dateEnd: "", status: "", remito: "", facturacion: "" })}>Limpiar</button>
      </div>

      {/* Panel de totalizadores */}
      <div className="mb-5" style={{
        background: "white", borderRadius: "14px", border: "1px solid #e5e7eb",
        boxShadow: "0 1px 10px rgba(0,0,0,0.04)", padding: "14px 16px"
      }}>
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Pedidos</span>
            <div className="text-lg font-black text-gray-800 leading-tight">{summary.count}</div>
          </div>
          <div>
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Total</span>
            <div className="text-lg font-black text-indigo-600 leading-tight">{fmtEUR(summary.total)}</div>
          </div>
          <div className="h-10 w-px bg-gray-200" />
          {STATUS_OPTIONS.map(s => {
            const d = summary.porStatus[s] || { count: 0, total: 0 };
            return (
              <div key={s} className="min-w-[120px]">
                <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">{s}</span>
                <div className="text-sm font-bold text-gray-700 leading-tight">
                  {d.count} · {fmtEUR(d.total)}
                </div>
              </div>
            );
          })}
          <div className="h-10 w-px bg-gray-200" />
          <div className="min-w-[150px]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Facturados</span>
            <div className="text-sm font-bold text-emerald-700 leading-tight">
              {summary.facturados.count} · {fmtEUR(summary.facturados.total)}
            </div>
          </div>
          <div className="min-w-[150px]">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Sin facturar</span>
            <div className="text-sm font-bold text-amber-700 leading-tight">
              {summary.sinFacturar.count} · {fmtEUR(summary.sinFacturar.total)}
            </div>
          </div>
          {summary.completadosSinFacturar > 0 && (
            <div className="ml-auto px-3 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-200">
              {summary.completadosSinFacturar} Completado(s) sin facturar
            </div>
          )}
        </div>
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
              <th style={S.th} className="text-center">Factura</th>
              <th style={S.th} className="text-right">Total</th>
              <th style={S.th} className="text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} className="p-10 text-center text-gray-400">Cargando registros...</td></tr>
            ) : paginatedItems.map(row => {
              const facturado = estaFacturado(row);
              const pendienteFacturar = row.status === "Completado" && !facturado;
              return (
              <tr
                key={row.id_pedido}
                className={`transition-colors ${pendienteFacturar ? "bg-amber-50/60 hover:bg-amber-100/60" : "hover:bg-gray-50"}`}
                style={pendienteFacturar ? { boxShadow: "inset 3px 0 0 #F59E0B" } : undefined}
              >
                <td style={S.td} className="font-bold text-indigo-600">#{row.id_pedido}</td>
                <td style={S.td} className="text-gray-500 text-xs">{row.fecha_pedido}</td>
                <td style={S.td}>
                  <div className="font-bold text-gray-800">{row.Cliente?.nombre_cliente || "N/A"}</div>
                  <div className="text-xs text-gray-400">
                    {row.Cliente?.nombre_contacto || row.quien_pidio}
                    {row.Cliente?.nombre_contacto && row.quien_pidio && row.quien_pidio !== row.Cliente?.nombre_contacto ? ` · ${row.quien_pidio}` : ""}
                  </div>
                </td>
                <td style={S.td} className="text-center">
                  <div className="flex flex-col items-center gap-1">
                    {getStatusBadge(row.status)}
                    {pendienteFacturar && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Sin facturar
                      </span>
                    )}
                  </div>
                </td>
                <td style={S.td} className="text-center">
                  {facturado ? (
                    <div className="flex flex-col items-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                        {row.numero_factura}
                      </span>
                      {row.fecha_facturacion && (
                        <span className="text-[10px] text-gray-400 mt-0.5">
                          {String(row.fecha_facturacion).slice(0, 10)}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>

                {/* Visualización del Total Histórico */}
                <td style={S.td} className="text-right font-bold text-gray-900">
                    {/* Usamos el moneda y tasa GUARDADOS en la DB */}
                    {formatMoney(row.total, row.moneda, row.tasa_cambio)}
                </td>

                <td style={S.td}>
                  <div className="flex gap-2 justify-center">
                    <button title="Detalles del Pedido" style={S.btnAction("#6366F1")} onClick={() => verDetalles(row)}><Eye size={14} /></button>
                    <button title="Exportar Cotización" style={S.btnAction("#4F46E5")} onClick={() => descargarPDF(row)}><Download size={14} /></button>
                    <button style={S.btnAction("#F59E0B")} onClick={() => { setEditingId(row.id_pedido); setForm({ ...row }); setCurrency(row.moneda || 'EUR'); setProductSearch(""); setClientSearch(row.Cliente?.nombre_cliente || ""); setNuevoItem({ id_producto: "", cantidad: 1, precio_unitario: 0 }); setModalOpen(true); }}>Editar</button>
                    <button style={S.btnAction("#DC2626")} onClick={() => {
                      Swal.fire({ title: '¿Eliminar?', icon: 'warning', showCancelButton: true }).then(r => r.isConfirmed && deletePedido(row.id_pedido).then(() => load()));
                    }}>Borrar</button>
                  </div>
                </td>
              </tr>
              );
            })}
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
                <div className="agromat-form-field">
                  <label>Cliente</label>
                  <div ref={clientDropdownRef} style={{ position: "relative" }}>
                    <input
                      type="text"
                      className="agromat-input"
                      placeholder="Buscar cliente por nombre..."
                      value={clientSearch}
                      onChange={e => {
                        setClientSearch(e.target.value);
                        setShowClientDropdown(true);
                        setHighlightedClientIndex(-1);
                        if (form.id_cliente) setForm(prev => ({ ...prev, id_cliente: "" }));
                      }}
                      onFocus={() => setShowClientDropdown(true)}
                      onKeyDown={handleClientKeyDown}
                      autoComplete="off"
                      style={!form.id_cliente && clientSearch ? { borderColor: "#F59E0B" } : {}}
                    />
                    {showClientDropdown && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                        background: "white", border: "1px solid #e5e7eb", borderRadius: "10px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.10)", marginTop: "4px",
                        maxHeight: "240px", overflowY: "auto"
                      }}>
                        {filteredClients.length === 0 ? (
                          <div style={{ padding: "12px 16px", color: "#9CA3AF", fontStyle: "italic", fontSize: "0.85rem" }}>
                            Sin resultados
                          </div>
                        ) : filteredClients.map((c, idx) => (
                          <div
                            key={c.id_cliente}
                            style={{
                              padding: "10px 14px", cursor: "pointer", fontSize: "0.85rem",
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              background: idx === highlightedClientIndex ? "#EEF2FF" : "transparent",
                              borderBottom: idx < filteredClients.length - 1 ? "1px solid #f3f4f6" : "none"
                            }}
                            onMouseEnter={() => setHighlightedClientIndex(idx)}
                            onMouseDown={(e) => { e.preventDefault(); selectClient(c); }}
                          >
                            <span>
                              <span style={{ fontWeight: 700, color: "#1F2937" }}>{c.nombre_cliente}</span>
                              {c.nombre_contacto && <span style={{ color: "#9CA3AF", marginLeft: "6px", fontSize: "0.8rem" }}>— {c.nombre_contacto}</span>}
                            </span>
                            {c.localidad && <span style={{ color: "#9CA3AF", fontSize: "0.8rem" }}>{c.localidad}</span>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                <div className="agromat-form-field"><label>Vendedor</label><select className="agromat-select" value={form.id_empleado} onChange={e => setForm({ ...form, id_empleado: e.target.value })} required><option value="">Selecciona...</option>{empleados.map(e => <option key={e.id_empleado} value={e.id_empleado}>{e.nombre_empleado}</option>)}</select></div>
                
                {/* SELECTOR DE MONEDA (Solo visible al crear) */}
                {!editingId && (
                    <div className="agromat-form-field">
                        <label>Moneda</label>
                        <div style={{display: 'flex', gap: '5px'}}>
                            <button type="button" onClick={() => setCurrency("EUR")} style={{padding:'8px', border: currency==='EUR' ? '2px solid blue' : '1px solid #ddd', borderRadius: '6px'}}>EUR</button>
                            <button type="button" onClick={() => setCurrency("USD")} style={{padding:'8px', border: currency==='USD' ? '2px solid blue' : '1px solid #ddd', borderRadius: '6px'}}>USD</button>
                        </div>
                    </div>
                )}

                <div className="agromat-form-field"><label>Remito</label><input type="text" className="agromat-input" value={form.numero_remito} onChange={e => setForm({ ...form, numero_remito: e.target.value })} /></div>
                <div className="agromat-form-field"><label>Contacto</label><input type="text" className="agromat-input" value={form.quien_pidio} onChange={e => setForm({ ...form, quien_pidio: e.target.value })} /></div>
              </div>

              {/* Sección de Facturación */}
              <div className="mt-4 p-4 rounded-xl border" style={{
                background: estaFacturado(form) ? "#ECFDF5" : "#FFFBEB",
                borderColor: estaFacturado(form) ? "#A7F3D0" : "#FDE68A",
              }}>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm" style={{ color: estaFacturado(form) ? "#065F46" : "#92400E" }}>
                      Facturación
                    </h4>
                    {estaFacturado(form) ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                        Facturado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Sin facturar
                      </span>
                    )}
                  </div>
                  {!estaFacturado(form) && (
                    <button
                      type="button"
                      className="agromat-btn-primary"
                      style={{ padding: "6px 14px", fontSize: "0.8rem" }}
                      onClick={() => {
                        setForm(prev => ({
                          ...prev,
                          fecha_facturacion: prev.fecha_facturacion || new Date().toISOString(),
                        }));
                      }}
                      title="Setea la fecha de facturación a ahora. Recordá ingresar el número de factura."
                    >
                      Marcar facturado (ahora)
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="agromat-form-field">
                    <label>N° Factura</label>
                    <input
                      type="text"
                      className="agromat-input"
                      placeholder="Ej: 0001-00001425"
                      value={form.numero_factura || ""}
                      onChange={e => {
                        const val = e.target.value;
                        setForm(prev => {
                          const next = { ...prev, numero_factura: val };
                          // Si acaba de recibir un número y no había fecha, setear fecha actual.
                          if (val.trim() !== "" && !prev.fecha_facturacion) {
                            next.fecha_facturacion = new Date().toISOString();
                          }
                          return next;
                        });
                      }}
                    />
                  </div>
                  <div className="agromat-form-field">
                    <label>Fecha de facturación</label>
                    <input
                      type="datetime-local"
                      className="agromat-input"
                      value={
                        form.fecha_facturacion
                          ? String(form.fecha_facturacion).slice(0, 16)
                          : ""
                      }
                      onChange={e => {
                        const v = e.target.value;
                        setForm(prev => ({
                          ...prev,
                          fecha_facturacion: v ? new Date(v).toISOString() : "",
                        }));
                      }}
                    />
                  </div>
                </div>
                {estaFacturado(form) && (
                  <p className="mt-2 text-xs text-emerald-800">
                    Este pedido ya fue facturado. Podés editar el número o la fecha si hace falta; los cambios quedarán registrados en la auditoría.
                  </p>
                )}
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
                  {/* Autocomplete de productos */}
                  <div ref={productDropdownRef} style={{ position: "relative", flex: 1 }}>
                    <input
                      ref={productInputRef}
                      type="text"
                      className="agromat-input"
                      style={{ width: "100%" }}
                      placeholder="Buscar producto por nombre o código..."
                      value={productSearch}
                      onChange={e => {
                        setProductSearch(e.target.value);
                        setShowProductDropdown(true);
                        setHighlightedIndex(-1);
                        // Limpiar selección si el usuario edita el texto
                        if (nuevoItem.id_producto) setNuevoItem(prev => ({ ...prev, id_producto: "" }));
                      }}
                      onFocus={() => setShowProductDropdown(true)}
                      onKeyDown={handleProductKeyDown}
                      autoComplete="off"
                    />
                    {showProductDropdown && (
                      <div style={{
                        position: "absolute", top: "100%", left: 0, right: 0, zIndex: 50,
                        background: "white", border: "1px solid #e5e7eb", borderRadius: "10px",
                        boxShadow: "0 4px 16px rgba(0,0,0,0.10)", marginTop: "4px",
                        maxHeight: "240px", overflowY: "auto"
                      }}>
                        {filteredProducts.length === 0 ? (
                          <div style={{ padding: "12px 16px", color: "#9CA3AF", fontStyle: "italic", fontSize: "0.85rem" }}>
                            No se encontraron productos
                          </div>
                        ) : filteredProducts.map((p, idx) => (
                          <div
                            key={p.id_producto}
                            style={{
                              padding: "10px 14px", cursor: "pointer", fontSize: "0.85rem",
                              display: "flex", justifyContent: "space-between", alignItems: "center",
                              background: idx === highlightedIndex ? "#EEF2FF" : "transparent",
                              borderBottom: idx < filteredProducts.length - 1 ? "1px solid #f3f4f6" : "none"
                            }}
                            onMouseEnter={() => setHighlightedIndex(idx)}
                            onMouseDown={(e) => { e.preventDefault(); selectProduct(p); }}
                          >
                            <span>
                              <span style={{ fontWeight: 700, color: "#1F2937" }}>{p.nombre_producto}</span>
                              <span style={{ color: "#9CA3AF", marginLeft: "6px" }}>— {p.id_producto}</span>
                            </span>
                            <span style={{ fontWeight: 600, color: "#4F46E5", fontSize: "0.8rem", whiteSpace: "nowrap", marginLeft: "12px" }}>
                              {formatMoney(p.precio, currency, exchangeRate)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <input type="number" className="agromat-input w-20" min="1" value={nuevoItem.cantidad} onChange={e => setNuevoItem({ ...nuevoItem, cantidad: parseInt(e.target.value) || 1 })} />
                  <button type="button" className="agromat-btn-primary px-4" onClick={() => {
                    if (!nuevoItem.id_producto) return;
                    const prod = productos.find(p => p.id_producto === nuevoItem.id_producto);
                    if (!prod) return;

                    const precioParaForm = currency === 'USD' ? prod.precio * exchangeRate : prod.precio;

                    setForm(prev => ({ ...prev, items: [...prev.items, { ...nuevoItem, nombre_producto: prod.nombre_producto, precio_unitario: precioParaForm }] }));
                    setNuevoItem({ id_producto: "", cantidad: 1, precio_unitario: 0 });
                    setProductSearch("");
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