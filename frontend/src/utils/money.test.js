import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizarMoneda, formatMontoPlano, formatTotales, totalesPorMoneda,
  textoTotalPedido, vistaPedido, aportePedido,
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
  assert.deepEqual(v.grupos, [{ moneda: "USD", subtotal: 60 }]);
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
  assert.deepEqual(v.grupos, [{ moneda: "EUR", subtotal: 20 }, { moneda: "USD", subtotal: 20 }]);
});

test("vistaPedido sin ítems devuelve un grupo EUR en cero", () => {
  assert.deepEqual(vistaPedido({ multimoneda: 1, items: [] }).grupos, [{ moneda: "EUR", subtotal: 0 }]);
});
