import { test } from "node:test";
import assert from "node:assert/strict";
import { MONEDAS, normalizarMoneda, sumarPorMoneda } from "./moneda.js";

test("MONEDAS contiene solo EUR y USD", () => {
  assert.deepEqual(MONEDAS, ["EUR", "USD"]);
});

test("normalizarMoneda acepta minúsculas y espacios", () => {
  assert.equal(normalizarMoneda(" usd "), "USD");
  assert.equal(normalizarMoneda("eur"), "EUR");
});

test("normalizarMoneda cae a EUR con valores inválidos", () => {
  assert.equal(normalizarMoneda("ARS"), "EUR");
  assert.equal(normalizarMoneda(""), "EUR");
  assert.equal(normalizarMoneda(null), "EUR");
  assert.equal(normalizarMoneda(undefined), "EUR");
});

test("sumarPorMoneda separa EUR y USD", () => {
  const r = sumarPorMoneda([
    { moneda: "EUR", subtotal_linea: "10.50" },
    { moneda: "USD", subtotal_linea: 20 },
    { moneda: "EUR", subtotal_linea: 4.5 },
  ]);
  assert.deepEqual(r, { total_eur: 15, total_usd: 20 });
});

test("sumarPorMoneda no arrastra error de punto flotante", () => {
  const r = sumarPorMoneda([
    { moneda: "USD", subtotal_linea: 0.1 },
    { moneda: "USD", subtotal_linea: 0.2 },
  ]);
  assert.equal(r.total_usd, 0.3);
});

test("sumarPorMoneda con lista vacía o subtotales nulos devuelve ceros", () => {
  assert.deepEqual(sumarPorMoneda([]), { total_eur: 0, total_usd: 0 });
  assert.deepEqual(sumarPorMoneda([{ moneda: "USD", subtotal_linea: null }]), { total_eur: 0, total_usd: 0 });
});

test("sumarPorMoneda trata moneda ausente como EUR", () => {
  assert.deepEqual(sumarPorMoneda([{ subtotal_linea: 5 }]), { total_eur: 5, total_usd: 0 });
});
