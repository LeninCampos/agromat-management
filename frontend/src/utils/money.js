// frontend/src/utils/money.js
const MONEDAS = ["EUR", "USD"];

export function normalizarMoneda(m) {
  const u = String(m ?? "").trim().toUpperCase();
  return MONEDAS.includes(u) ? u : "EUR";
}

export function formatMonto(valor, moneda) {
  return Number(valor || 0).toLocaleString("es-ES", {
    style: "currency",
    currency: normalizarMoneda(moneda),
  });
}

// Para PDF / HTML de SweetAlert (mismo formato que el fmt histórico)
export function formatMontoPlano(valor, moneda) {
  const n = Number(valor || 0).toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    useGrouping: true,
  });
  return n + (normalizarMoneda(moneda) === "USD" ? " $" : " €");
}

const aCentavos = (v) => Math.round(Number(v || 0) * 100);

export function formatTotales({ eur = 0, usd = 0 }) {
  const partes = [];
  if (Number(eur) !== 0) partes.push(formatMonto(eur, "EUR"));
  if (Number(usd) !== 0) partes.push(formatMonto(usd, "USD"));
  return partes.length ? partes.join(" + ") : formatMonto(0, "EUR");
}

export function totalesPorMoneda(items = []) {
  const c = { EUR: 0, USD: 0 };
  for (const it of items) {
    c[normalizarMoneda(it.moneda)] += aCentavos(Number(it.cantidad) * Number(it.precio_unitario));
  }
  return { eur: c.EUR / 100, usd: c.USD / 100 };
}

export function aportePedido(p) {
  if (!Number(p.multimoneda)) return { eur: Number(p.total) || 0, usd: 0 };
  return { eur: Number(p.total_eur) || 0, usd: Number(p.total_usd) || 0 };
}

export function textoTotalPedido(p) {
  if (!Number(p.multimoneda)) {
    const mon = normalizarMoneda(p.moneda);
    const tasa = Number(p.tasa_cambio) || 1;
    const valor = mon === "USD" ? Number(p.total) * tasa : Number(p.total);
    return formatMonto(valor, mon);
  }
  return formatTotales({ eur: p.total_eur, usd: p.total_usd });
}

// Vista unificada para PDF y detalle: histórico = una moneda con tasa; nuevo = por línea.
export function vistaPedido(pedido) {
  const legacy = !Number(pedido.multimoneda);
  const monLegacy = normalizarMoneda(pedido.moneda);
  const factor = legacy && monLegacy === "USD" ? Number(pedido.tasa_cambio) || 1 : 1;

  const lineas = (pedido.items || []).map((it) => {
    const moneda = legacy ? monLegacy : normalizarMoneda(it.moneda);
    const precio = Number(it.precio_unitario) * factor;
    return { ...it, moneda, precio, subtotal: precio * Number(it.cantidad) };
  });

  const grupos = MONEDAS.filter((m) => lineas.some((l) => l.moneda === m)).map((m) => ({
    moneda: m,
    subtotal:
      lineas.filter((l) => l.moneda === m).reduce((acc, l) => acc + aCentavos(l.subtotal), 0) / 100,
  }));

  return { legacy, lineas, grupos: grupos.length ? grupos : [{ moneda: legacy ? monLegacy : "EUR", subtotal: 0 }] };
}
