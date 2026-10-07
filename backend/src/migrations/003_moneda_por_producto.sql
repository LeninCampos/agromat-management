-- ============================================================
-- MIGRACIÓN 003: Precio por moneda de origen (EUR / USD)
-- Fecha: 2026-10-07
-- ADITIVA e idempotente: no convierte ni borra datos.
--
-- INSTRUCCIONES:
-- 1. BACKUP: mysqldump -u root -p agromat_db > backup_pre_003.sql
-- 2. APAGAR la app: pm2 stop agromat
-- 3. Ejecutar: mysql -u root -p agromat_db < 003_moneda_por_producto.sql
-- 4. Verificar (queries al final), desplegar código, pm2 restart agromat
-- ============================================================

ALTER TABLE productos
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE contiene
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'EUR';

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS total_eur   DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_usd   DECIMAL(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS multimoneda TINYINT(1)    NOT NULL DEFAULT 0;

-- Backfill: los totales históricos están en EUR base.
-- Solo toca pedidos históricos sin migrar (multimoneda = 0 y total_eur = 0).
UPDATE pedidos
SET total_eur = total, total_usd = 0
WHERE multimoneda = 0 AND total_eur = 0 AND total <> 0;

-- ---------- Verificación ----------
-- SELECT COUNT(*) AS pedidos_con_diferencia FROM pedidos WHERE multimoneda = 0 AND total_eur <> total;  -- esperado 0
-- SELECT moneda, COUNT(*) FROM productos GROUP BY moneda;                                              -- todo EUR
-- SELECT moneda, COUNT(*) FROM contiene GROUP BY moneda;                                               -- todo EUR
