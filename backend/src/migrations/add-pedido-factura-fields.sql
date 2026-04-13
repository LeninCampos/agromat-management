-- Migración: Campos de facturación manual externa en pedidos
-- Fecha: 2026-04-13
-- Descripción: Agrega numero_factura y fecha_facturacion al pedido,
--              para soportar carga manual del número de factura cuando
--              el cliente marca el pedido como facturado.

-- 1. Nuevas columnas (IF NOT EXISTS para idempotencia)
ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS numero_factura    VARCHAR(50) NULL AFTER numero_remito,
  ADD COLUMN IF NOT EXISTS fecha_facturacion DATETIME    NULL AFTER numero_factura;

-- ************************************************************
-- VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente)
-- ************************************************************
-- DESCRIBE pedidos;
-- SELECT COUNT(*) AS facturados FROM pedidos WHERE numero_factura IS NOT NULL;
