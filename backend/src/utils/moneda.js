// src/utils/moneda.js
export const MONEDAS = ["EUR", "USD"];

export function normalizarMoneda(valor) {
  const m = String(valor ?? "").trim().toUpperCase();
  return MONEDAS.includes(m) ? m : "EUR";
}

// Suma subtotales por moneda en centavos para evitar errores de punto flotante.
export function sumarPorMoneda(lineas) {
  const centavos = { EUR: 0, USD: 0 };
  for (const l of lineas) {
    centavos[normalizarMoneda(l.moneda)] += Math.round(Number(l.subtotal_linea || 0) * 100);
  }
  return { total_eur: centavos.EUR / 100, total_usd: centavos.USD / 100 };
}
