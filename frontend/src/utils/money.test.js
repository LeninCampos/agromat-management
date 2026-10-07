import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarMoneda, formatMontoPlano, formatTotales, totalesPorMoneda,
  textoTotalPedido, textoTotalCompacto, vistaPedido, aportePedido, desgloseGrupo,
} from "./money.js";

const sinNbsp = (s) => s.replace(/ /g, " ");

test("normalizarMoneda", () => {
  assert.equal(normalizarMoneda("usd"), "USD");
  assert.equal(normalizarMoneda("xxx"), "EUR");
  assert.equal(normalizarMoneda(undefined), "EUR");
});

test("formatMontoPlano 4 dígitos: sin separador (es-ES histórico)", () => {
  assert.equal(sinNbsp(formatMontoPlano(1234.5, "EUR")), "1234,50 €");
  assert.equal(sinNbsp(formatMontoPlano(10, "USD")), "10,00 $");
});

test("formatMontoPlano 5+ dígitos: con separador", () => {
  assert.equal(sinNbsp(formatMontoPlano(12345.5, "EUR")), "12.345,50 €");
});

test("formatTotales omite la moneda en cero", () => {
  assert.ok(!formatTotales({ eur: 20, usd: 0 }).includes("US$"));
  assert.ok(sinNbsp(formatTotales({ eur: 20, usd: 0 })).includes("20,00"));
  assert.ok(formatTotales({ eur: 20, usd: 5 }).includes(" + "));
  assert.ok(sinNbsp(formatTotales({ eur: 0, usd: 0 })).includes("0,00"));
});

test("formatTotales normaliza null/undefined a cero", () => {
  assert.ok(sinNbsp(formatTotales({ eur: null, usd: undefined })).includes("0,00"));
  assert.ok(!sinNbsp(formatTotales({ eur: null, usd: undefined })).includes("NaN"));
});

test("totalesPorMoneda separa y redondea", () => {
  const r = totalesPorMoneda([
    { cantidad: 1, precio_unitario: 0.1, moneda: "USD" },
    { cantidad: 1, precio_unitario: 0.2, moneda: "USD" },
    { cantidad: 2, precio_unitario: 10, moneda: "EUR" },
  ]);
  assert.deepEqual(r, { eur: 20, usd: 0.3 });
});

test("textoTotalPedido histórico USD usa la tasa guardada", () => {
  const t = sinNbsp(textoTotalPedido({ multimoneda: 0, moneda: "USD", tasa_cambio: 2, total: 10 }));
  assert.ok(t.includes("20,00"));
});

test("textoTotalPedido nuevo muestra ambas monedas", () => {
  const t = textoTotalPedido({ multimoneda: 1, total_eur: 20, total_usd: 20 });
  assert.ok(t.includes(" + "));
});

test("aportePedido histórico usa total (no total_eur) y nuevo usa total_eur/usd", () => {
  assert.deepEqual(aportePedido({ multimoneda: 0, total: "12.50", total_eur: 0, total_usd: 0 }), { eur: 12.5, usd: 0 });
  assert.deepEqual(aportePedido({ multimoneda: 1, total: 20, total_eur: 20, total_usd: 7 }), { eur: 20, usd: 7 });
  assert.deepEqual(aportePedido({ multimoneda: 0 }), { eur: 0, usd: 0 });
});

test("vistaPedido histórico: una sola moneda con tasa aplicada", () => {
  const v = vistaPedido({
    multimoneda: 0, moneda: "USD", tasa_cambio: 2,
    items: [{ id_producto: "A", cantidad: 3, precio_unitario: 10 }],
  });
  assert.equal(v.legacy, true);
  assert.deepEqual(v.grupos, [{ moneda: "USD", subtotal: 60, base: 30, factor: 2 }]);
  assert.equal(v.lineas[0].precio, 20);
});

test("vistaPedido nuevo: un grupo por moneda presente", () => {
  const v = vistaPedido({
    multimoneda: 1,
    items: [
      { id_producto: "A", cantidad: 2, precio_unitario: 10, moneda: "EUR" },
      { id_producto: "B", cantidad: 1, precio_unitario: 20, moneda: "USD" },
    ],
  });
  assert.deepEqual(v.grupos, [
    { moneda: "EUR", subtotal: 20, base: 20, factor: 1 },
    { moneda: "USD", subtotal: 20, base: 20, factor: 1 },
  ]);
});

test("vistaPedido sin ítems devuelve un grupo EUR en cero", () => {
  assert.deepEqual(vistaPedido({ multimoneda: 1, items: [] }).grupos, [{ moneda: "EUR", subtotal: 0, base: 0, factor: 1 }]);
});

// Fórmula histórica verbatim (Pedidos.jsx antes de la tarea 8)
const IVA = 0.21;
function viejo(pedido) {
  const mon = pedido.moneda || "EUR";
  const tasa = Number(pedido.tasa_cambio) || 1;
  const fmt = (val) => {
    const num = mon === "USD" ? val * tasa : val;
    return Number(num).toLocaleString("es-ES", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + (mon === "USD" ? " $" : " €");
  };
  const sin = pedido.items.reduce((acc, it) => acc + (Number(it.cantidad) * Number(it.precio_unitario)), 0);
  const iva = sin * IVA;
  return { lineas: pedido.items.map((it) => [fmt(it.precio_unitario), fmt(it.cantidad * it.precio_unitario)]), tot: [fmt(sin), fmt(iva), fmt(sin + iva)] };
}
function nuevo(pedido) {
  const v = vistaPedido(pedido);
  const d = desgloseGrupo(v.grupos[0], IVA);
  const m = v.grupos[0].moneda;
  return {
    lineas: v.lineas.map((l) => [formatMontoPlano(l.precio, l.moneda), formatMontoPlano(l.subtotal, l.moneda)]),
    tot: [formatMontoPlano(d.sinIva, m), formatMontoPlano(d.iva, m), formatMontoPlano(d.conIva, m)],
  };
}

test("vistaPedido histórico USD: sin redondeo por línea (3 x 0.005 con tasa 1.1886)", () => {
  const p = {
    multimoneda: 0, moneda: "USD", tasa_cambio: "1.1886",
    items: [1, 2, 3].map((n) => ({ id_producto: String(n), cantidad: 1, precio_unitario: "0.005" })),
  };
  assert.deepEqual(nuevo(p), viejo(p));
  // base = suma float sin redondear por línea (0.005 + 0.005 + 0.005)
  assert.equal(vistaPedido(p).grupos[0].base, 0.005 + 0.005 + 0.005);
});

test("vistaPedido histórico EUR con empates de medio centavo coincide con la fórmula previa", () => {
  const p = {
    multimoneda: 0, moneda: "EUR", tasa_cambio: "1.0000",
    items: [
      { id_producto: "A", cantidad: 3, precio_unitario: "1.15" },
      { id_producto: "B", cantidad: 7, precio_unitario: "2.05" },
      { id_producto: "C", cantidad: 1, precio_unitario: "7713.50" },
    ],
  };
  assert.deepEqual(nuevo(p), viejo(p));
});

test("histórico: 2000 pedidos aleatorios coinciden con la fórmula previa (celdas y totales)", () => {
  let seed = 7;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = 0; i < 2000; i++) {
    const p = {
      multimoneda: 0, moneda: rnd() < 0.5 ? "USD" : "EUR", tasa_cambio: (0.9 + rnd() * 0.5).toFixed(4),
      items: Array.from({ length: 1 + Math.floor(rnd() * 6) }, () => ({
        id_producto: "x", cantidad: 1 + Math.floor(rnd() * 20), precio_unitario: (rnd() * 900).toFixed(2),
      })),
    };
    assert.deepEqual(nuevo(p), viejo(p));
  }
});

test("textoTotalCompacto histórico: string previa exacta, sin conversión USD", () => {
  assert.equal(textoTotalCompacto({ multimoneda: 0, total: "1234.5", moneda: "USD", tasa_cambio: 1.1886 }), "€1234.50");
  assert.equal(textoTotalCompacto({ total: "1234.5", moneda: "USD", tasa_cambio: 1.1886 }), "€1234.50");
});

test("textoTotalCompacto nuevo: totales por moneda", () => {
  const t = sinNbsp(textoTotalCompacto({ multimoneda: 1, total_eur: 20, total_usd: 7 }));
  assert.ok(t.includes(" + ") && t.includes("20,00"));
  assert.ok(!textoTotalCompacto({ multimoneda: 1, total_eur: 20, total_usd: 0 }).includes("US$"));
});
