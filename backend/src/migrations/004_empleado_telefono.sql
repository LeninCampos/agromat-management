-- ============================================================
-- MIGRACIÓN 004: Teléfono opcional en empleados
-- Fecha: 2026-11-17
-- ADITIVA e idempotente: no modifica ni borra datos.
--
-- INSTRUCCIONES:
-- 1. BACKUP: mysqldump -u root -p agromat_db > backup_pre_004.sql
-- 2. Ejecutar ANTES de desplegar el código:
--    mysql -u root -p agromat_db < 004_empleado_telefono.sql
-- 3. Desplegar código, pm2 restart agromat
-- ============================================================

ALTER TABLE empleados
  ADD COLUMN IF NOT EXISTS telefono VARCHAR(20) NULL AFTER correo;

-- Verificación:
-- SHOW COLUMNS FROM empleados LIKE 'telefono';
