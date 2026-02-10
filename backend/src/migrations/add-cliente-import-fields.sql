-- Migración: Nuevos campos para importación de clientes desde Excel
-- Fecha: 2026-02-09
-- Descripción: Agrega columnas faltantes y constraints UNIQUE para deduplicación

-- 1. Nuevas columnas
ALTER TABLE clientes
  ADD COLUMN codigo_cliente VARCHAR(50) NULL AFTER id_cliente,
  ADD COLUMN codigo_postal  VARCHAR(20) NULL AFTER direccion,
  ADD COLUMN localidad      VARCHAR(100) NULL AFTER codigo_postal,
  ADD COLUMN zona           VARCHAR(100) NULL AFTER localidad,
  ADD COLUMN fax            VARCHAR(20) NULL AFTER telefono,
  ADD COLUMN provincia      VARCHAR(100) NULL AFTER zona;

-- 2. Relajar NOT NULL en nombre_cliente, telefono y direccion (para imports incompletos)
ALTER TABLE clientes
  MODIFY COLUMN nombre_cliente VARCHAR(100) NULL,
  MODIFY COLUMN telefono  VARCHAR(20) NULL,
  MODIFY COLUMN direccion VARCHAR(150) NULL;

-- 3. Constraints anti-duplicado (MariaDB permite múltiples NULLs en UNIQUE)
ALTER TABLE clientes
  ADD UNIQUE INDEX uq_cuit (cuit),
  ADD UNIQUE INDEX uq_codigo_cliente (codigo_cliente);
