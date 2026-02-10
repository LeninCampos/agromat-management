-- ============================================================
-- MIGRACIÓN UNIFICADA PARA PRODUCCIÓN
-- Fecha: 2026-02-09
-- Incluye: Campos de cliente + Moneda en pedidos + Conversión USD→EUR
--
-- INSTRUCCIONES:
-- 1. HACER BACKUP COMPLETO: mysqldump -u root -p agromat_db > backup_pre_release.sql
-- 2. APAGAR la app: pm2 stop agromat
-- 3. Obtener tasa actual: curl https://api.frankfurter.app/latest?from=USD&to=EUR
--    (copiar rates.EUR, ej: 0.9200) y pegarlo en @MIGRATION_RATE
-- 4. Ejecutar: mysql -u root -p agromat_db < 002_usd_to_eur_base_currency.sql
-- 5. Verificar resultados (queries de verificación al final)
-- 6. Desplegar código nuevo y reiniciar: pm2 restart agromat
-- ============================================================

-- ************************************************************
-- PARTE A: Nuevos campos para importación de clientes
-- ************************************************************

-- A1. Nuevas columnas en clientes (IF NOT EXISTS para idempotencia)
ALTER TABLE clientes
  ADD COLUMN IF NOT EXISTS codigo_cliente VARCHAR(50) NULL AFTER id_cliente,
  ADD COLUMN IF NOT EXISTS codigo_postal  VARCHAR(20) NULL AFTER direccion,
  ADD COLUMN IF NOT EXISTS localidad      VARCHAR(100) NULL AFTER codigo_postal,
  ADD COLUMN IF NOT EXISTS zona           VARCHAR(100) NULL AFTER localidad,
  ADD COLUMN IF NOT EXISTS fax            VARCHAR(20) NULL AFTER telefono,
  ADD COLUMN IF NOT EXISTS provincia      VARCHAR(100) NULL AFTER zona;

-- A2. Relajar NOT NULL (para imports incompletos)
ALTER TABLE clientes
  MODIFY COLUMN nombre_cliente VARCHAR(100) NULL,
  MODIFY COLUMN telefono  VARCHAR(20) NULL,
  MODIFY COLUMN direccion VARCHAR(150) NULL;

-- A3. Constraints anti-duplicado (MariaDB permite múltiples NULLs en UNIQUE)
--     Usamos IF NOT EXISTS o ignoramos error si ya existen
CREATE UNIQUE INDEX IF NOT EXISTS uq_cuit ON clientes (cuit);
CREATE UNIQUE INDEX IF NOT EXISTS uq_codigo_cliente ON clientes (codigo_cliente);

-- ************************************************************
-- PARTE B: Columnas de moneda en pedidos
-- ************************************************************

ALTER TABLE pedidos
  ADD COLUMN IF NOT EXISTS moneda VARCHAR(3) NOT NULL DEFAULT 'USD',
  ADD COLUMN IF NOT EXISTS tasa_cambio DECIMAL(10,4) NOT NULL DEFAULT 1.0000;

-- ************************************************************
-- PARTE C: Conversión de precios USD → EUR
-- ************************************************************

SET @MIGRATION_RATE = 0.92;  -- ← CAMBIAR con la tasa real del día

-- C1. Convertir precios de productos
UPDATE productos
SET precio = ROUND(precio * @MIGRATION_RATE, 2)
WHERE precio IS NOT NULL AND precio > 0;

-- C2. Convertir líneas de pedido
UPDATE contiene
SET
  precio_unitario = ROUND(precio_unitario * @MIGRATION_RATE, 2),
  subtotal_linea  = ROUND(subtotal_linea * @MIGRATION_RATE, 2)
WHERE precio_unitario IS NOT NULL;

-- C3. Convertir totales de pedidos
UPDATE pedidos
SET
  subtotal        = ROUND(subtotal * @MIGRATION_RATE, 2),
  descuento_total = ROUND(descuento_total * @MIGRATION_RATE, 2),
  impuesto_total  = ROUND(impuesto_total * @MIGRATION_RATE, 2),
  total           = ROUND(total * @MIGRATION_RATE, 2);

-- C4. Marcar todos los pedidos como EUR
UPDATE pedidos
SET moneda = 'EUR', tasa_cambio = 1.0000;

-- C5. Cambiar default de moneda a EUR
ALTER TABLE pedidos
  ALTER COLUMN moneda SET DEFAULT 'EUR';

-- ************************************************************
-- VERIFICACIÓN POST-MIGRACIÓN (ejecutar manualmente)
-- ************************************************************
-- SELECT 'Clientes' AS tabla, COUNT(*) AS total FROM clientes;
-- DESCRIBE clientes;  -- Verificar nuevas columnas
-- SELECT moneda, tasa_cambio, COUNT(*) AS total FROM pedidos GROUP BY moneda, tasa_cambio;
-- SELECT COUNT(*) AS productos, ROUND(AVG(precio),2) AS precio_promedio_eur FROM productos;
-- SELECT COUNT(*) AS lineas, ROUND(AVG(precio_unitario),2) AS precio_prom_eur FROM contiene;
