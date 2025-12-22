//src/routes/audit.js
import { Router } from "express";
import {
  getAuditLogs,
  getAuditLogById,
  getRegistroHistorial,
  getTablasAuditadas,
  getAuditStats,
  getSearchSuggestions,
  getTiposCambio,
  getCamposDisponibles,
} from "../controllers/auditController.js";
import { verificarAuth } from "../middleware/verificarAuth.js";
import { esAdmin } from "../middleware/esAdmin.js";

const router = Router();

// Todas las rutas requieren autenticación
router.use(verificarAuth);

// Cualquier empleado autenticado puede ver historial de un registro específico
router.get("/historial/:tabla/:id_registro", getRegistroHistorial);

// Solo admin puede acceder a estas rutas - IMPORTANTE: Rutas específicas ANTES de /:id
router.get("/tablas", esAdmin, getTablasAuditadas);
router.get("/estadisticas", esAdmin, getAuditStats);
router.get("/tipos-cambio", esAdmin, getTiposCambio);
router.get("/campos-disponibles", esAdmin, getCamposDisponibles);
router.get("/search-suggestions", esAdmin, getSearchSuggestions);
router.get("/", esAdmin, getAuditLogs);
router.get("/:id", esAdmin, getAuditLogById);

export default router;
