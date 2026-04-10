# AgroMat — Sistema de Gestión de Inventario Agronómico

![React](https://img.shields.io/badge/React-19.1-61DAFB?logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-7.2-646CFF?logo=vite&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-ES%20Modules-339933?logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express-5.1-000000?logo=express&logoColor=white)
![Sequelize](https://img.shields.io/badge/Sequelize-6.37-52B0E7?logo=sequelize&logoColor=white)
![MariaDB](https://img.shields.io/badge/MariaDB-10.x-003545?logo=mariadb&logoColor=white)
![JWT](https://img.shields.io/badge/Auth-JWT-000000?logo=jsonwebtokens&logoColor=white)
![License](https://img.shields.io/badge/license-Private-red)

Plataforma web a medida para la gestión integral de una **empresa agronómica argentina**: control de stock por racks físicos, trazabilidad completa de compras y ventas, logística de despachos y auditoría forense de cada movimiento.

Desarrollado como **proyecto freelance end-to-end** (relevamiento, diseño de base de datos, backend, frontend, despliegue y soporte) para un cliente real en producción.

---

## El problema

El cliente operaba su inventario con planillas de Excel dispersas y conteos manuales. Esto generaba tres dolores concretos:

- **Discrepancias de stock** entre lo que decía el papel y lo que había en el galpón, sin forma de saber dónde se originaba el error.
- **Sin trazabilidad**: no se podía reconstruir quién modificó un pedido, cuándo ni por qué.
- **Carga operativa lenta**: ingresar un remito de proveedor con 40 productos tomaba más de una hora de tipeo.

AgroMat resuelve los tres: cada unidad de stock queda ligada a su **rack físico** (columna, largo, piso), cada cambio pasa por un **log de auditoría** con datos previos/nuevos, y los ingresos se cargan en segundos **importando el Excel del proveedor**.

---

## Stack tecnológico

### Frontend
| Tecnología | Versión | Rol |
|---|---|---|
| React | 19.1 | Librería UI |
| Vite | 7.2 | Build tool y dev server |
| React Router DOM | 7.9 | Routing SPA con rutas protegidas |
| Axios | 1.13 | Cliente HTTP centralizado |
| jsPDF + jspdf-autotable | 3.0 / 5.0 | Generación de cotizaciones y remitos en PDF |
| jwt-decode | 4.0 | Lectura de claims del token JWT |
| lucide-react | 0.553 | Iconografía |
| SweetAlert2 | 11.26 | Diálogos de confirmación |
| react-hot-toast | 2.6 | Notificaciones no bloqueantes |

### Backend
| Tecnología | Versión | Rol |
|---|---|---|
| Node.js | ES Modules | Runtime |
| Express | 5.1 | Framework HTTP |
| Sequelize | 6.37 | ORM |
| MariaDB | 3.4 (driver) | Base de datos relacional |
| jsonwebtoken | 9.0 | Emisión y verificación de JWT |
| bcryptjs | 3.0 | Hashing de contraseñas |
| Helmet | 8.1 | Hardening de headers HTTP |
| express-rate-limit | 8.2 | Rate limiting diferenciado |
| express-validator | 7.2 | Validación declarativa de payloads |
| Multer | 2.0 | Uploads de imágenes de envíos |
| xlsx | 0.18 | Parseo de Excel para importaciones masivas |

---

## Módulos del sistema

El sistema se divide en **11 módulos** accesibles desde un panel administrativo unificado:

| Módulo | Descripción |
|---|---|
| **Dashboard** | KPIs en tiempo real: stock total, productos, clientes, pedidos y envíos. Actividad de los últimos 30 días (pedidos, ingresos, altas de clientes) y listado de últimos movimientos. |
| **Inventario (Productos)** | ABM de productos con stock, precio y ubicación física por rack (columna A/B/C, largo 1–6, piso 1–3). |
| **Ingresos (Suministros)** | Registro de compras a proveedores con soporte de **importación masiva desde Excel** (parseo con `xlsx`, validación y alta transaccional). Soporta moneda y tasa de cambio. |
| **Pedidos** | Armado de pedidos con búsqueda tokenizada de clientes, cálculo de IVA 21% y **exportación a PDF profesional** (logo sin distorsión, tabla de ítems, preview de detalles). |
| **Despachos (Envíos)** | Asignación de pedidos a envíos, estado logístico y upload de fotos de entrega vía Multer. |
| **Clientes** | ABM con búsqueda tokenizada y paginación flexible. |
| **Proveedores** | ABM de proveedores vinculados a los suministros. |
| **Empleados** | Gestión de usuarios del sistema con roles y control `esAdmin`. |
| **Zonas** | Catálogo de zonas geográficas de reparto asociadas a clientes. |
| **Historial de Producto** | Timeline completa de movimientos de un producto + gráfico SVG custom (sin librerías externas) mostrando evolución de stock. |
| **Auditoría** | Log forense de toda operación CRUD: tabla afectada, acción, datos anteriores, datos nuevos, usuario, IP y timestamp del cliente. Los campos sensibles (`password`, `token`, `secret`) se sanitizan a `[REDACTED]`. |

---

## Features destacadas

### Seguridad
- **Autenticación JWT** con contraseñas hasheadas con bcrypt.
- **Rate limiting diferenciado**: 300 req / 15 min para la API general, **10 req / 15 min** en `/api/auth` para frenar fuerza bruta.
- **CORS con whitelist** leída desde env.
- **Helmet** para headers de seguridad.
- **Sanitización automática** de campos sensibles en los logs de auditoría.
- **Trust proxy** configurado para funcionar correctamente detrás de Nginx con `express-rate-limit`.

### Trazabilidad y auditoría
- Cada operación de escritura genera un registro en `audit_log` con `datos_anteriores` y `datos_nuevos` en JSON, ligado al empleado que la ejecutó y su IP.
- La auditoría incluye `clientTime` (header `x-client-time`) para reconciliar huso horario cliente/servidor.
- Cada producto tiene un **historial individual** visualizable como timeline gráfica.

### Inteligencia de stock
- **Reconciliación automática al arranque**: el servidor calcula el stock teórico (`Σ ingresos − Σ salidas + Σ ajustes`) contra el stock declarado y crea un registro en la tabla `ajustes_stock` por cada discrepancia, cerrándolas sin perder el rastro.
- **Tabla `ajustes_stock`** como fuente de verdad para ajustes manuales, con motivo obligatorio.

### Productividad operativa
- **Importación de suministros desde Excel** con validación por fila y alta transaccional (rollback ante error).
- **Cotizaciones y pedidos en PDF** generados en cliente con jsPDF + jspdf-autotable, con branding del cliente e IVA 21% discriminado.
- **Búsqueda tokenizada** en Pedidos y Despachos: el usuario puede escribir varios términos en cualquier orden y el backend los une con `AND` contra múltiples columnas.

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (SPA React)                    │
│                                                              │
│  src/                                                        │
│  ├── pages/         11 vistas (una por módulo)               │
│  ├── layout/        AppLayout, Sidebar, Topbar               │
│  ├── api/           Clientes HTTP por recurso (axios)        │
│  ├── context/       AuthContext (JWT en localStorage)        │
│  ├── router/        ProtectedRoute                           │
│  └── components/    RequireAuth, Toaster                     │
└──────────────────────────┬──────────────────────────────────┘
                           │  REST /api/*   (JWT en header)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Node + Express 5)                  │
│                                                              │
│  src/                                                        │
│  ├── routes/        14 routers (un archivo por recurso)      │
│  ├── middleware/    verificarAuth, esAdmin, validate*,       │
│  │                  upload (Multer)                          │
│  ├── controllers/   Lógica de cada endpoint                  │
│  ├── services/      auditService (logging forense)           │
│  ├── models/        13 modelos Sequelize + index asociaciones│
│  └── config/        Conexión única a MariaDB                 │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
                 ┌──────────────────┐
                 │     MariaDB      │
                 │  + audit_log     │
                 │  + ajustes_stock │
                 └──────────────────┘
```

### Decisiones de diseño

- **Un router, un middleware de validación, un controlador por recurso.** Mantiene el código navegable incluso con 14 endpoints.
- **Sequelize con asociaciones centralizadas** en `models/index.js` para evitar dependencias circulares.
- **Cliente HTTP por recurso** en `frontend/src/api/` para aislar endpoints del resto de la app.
- **Auth por `localStorage` + `PrivateRoute`**: simple, suficiente para un panel interno, sin complejidad de refresh tokens.
- **Reconciliación automática al boot** en lugar de migración one-shot: idempotente, se ejecuta solo si no hay ajustes previos marcados como "Reconciliación inicial".

---

## Estado del proyecto

| | |
|---|---|
| **Estado** | En producción con cliente real |
| **Tipo** | Proyecto freelance privado |
| **Rol** | Diseño, desarrollo e infraestructura end-to-end |
| **Despliegue** | VPS con Nginx como reverse proxy |

El repositorio es **privado**; este README existe como vitrina pública del proyecto.

---

## Developed by

**Manuel Bonavena** — Desarrollador full-stack freelance.

[![GitHub](https://img.shields.io/badge/GitHub-ManuelBonavena-181717?logo=github&logoColor=white)](https://github.com/ManuelBonavena)

Diseño del esquema relacional, backend en Express + Sequelize, SPA en React 19, despliegue y mantenimiento.
