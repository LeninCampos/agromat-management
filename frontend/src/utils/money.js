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
  });
  return n + (normalizarMoneda(moneda) === "USD" ? " $" : " €");
}

const aCentavos = (v) => Math.round(Number(v || 0) * 100);

export function formatTotales({ eur = 0, usd = 0 }) {
  const e = Number(eur) || 0;
  const u = Number(usd) || 0;
  const partes = [];
  if (e !== 0) partes.push(formatMonto(e, "EUR"));
  if (u !== 0) partes.push(formatMonto(u, "USD"));
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
// Histórico: se replica EXACTAMENTE la fórmula previa (suma en float de cantidad*precio en la
// moneda base, sin redondear por línea; IVA sobre esa base; recién después se escala por la tasa).
// Cada grupo trae `base` (suma sin escalar) y `factor` (tasa si USD histórico, 1 si no); usar
// desgloseGrupo() para obtener sin IVA / IVA / con IVA ya escalados.
export function vistaPedido(pedido) {
  const legacy = !Number(pedido.multimoneda);
  const monLegacy = normalizarMoneda(pedido.moneda);
  const factor = legacy && monLegacy === "USD" ? Number(pedido.tasa_cambio) || 1 : 1;

  const lineas = (pedido.items || []).map((it) => {
    const moneda = legacy ? monLegacy : normalizarMoneda(it.moneda);
    const precio = Number(it.precio_unitario) * factor;
    // histórico: (cantidad*precio_base)*tasa, igual que el formateo anterior
    const subtotal = legacy
      ? Number(it.cantidad) * Number(it.precio_unitario) * factor
      : precio * Number(it.cantidad);
    return { ...it, moneda, precio, subtotal };
  });

  if (legacy) {
    const base = (pedido.items || []).reduce(
      (acc, it) => acc + Number(it.cantidad) * Number(it.precio_unitario), 0
    );
    return { legacy, lineas, grupos: [{ moneda: monLegacy, subtotal: base * factor, base, factor }] };
  }

  const grupos = MONEDAS.filter((m) => lineas.some((l) => l.moneda === m)).map((m) => {
    const subtotal =
      lineas.filter((l) => l.moneda === m).reduce((acc, l) => acc + aCentavos(l.subtotal), 0) / 100;
    return { moneda: m, subtotal, base: subtotal, factor: 1 };
  });

  return { legacy, lineas, grupos: grupos.length ? grupos : [{ moneda: "EUR", subtotal: 0, base: 0, factor: 1 }] };
}

// Montos de un grupo ya escalados a la moneda mostrada: el IVA se calcula sobre la base
// (como el código histórico) y luego se escala.
export function desgloseGrupo(g, ivaRate) {
  const iva = g.base * ivaRate;
  return {
    sinIva: g.base * g.factor,
    iva: iva * g.factor,
    conIva: (g.base + iva) * g.factor,
  };
}
