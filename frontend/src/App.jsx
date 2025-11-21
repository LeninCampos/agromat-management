import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "leaflet/dist/leaflet.css";
import AppLayout from "./layout/AppLayout";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Clientes from "./pages/Clientes";
import Pedidos from "./pages/Pedidos";
import Envios from "./pages/Envios";
import Proveedores from "./pages/Proveedores";
import Empleados from "./pages/Empleados";
import Zonas from "./pages/Zonas";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/app" replace />} />
        <Route path="/app/dashboard" element={<AppLayout><Dashboard /></AppLayout>} />
        <Route path="/app/productos" element={<AppLayout><Productos /></AppLayout>} />
        <Route path="/app/clientes" element={<AppLayout><Clientes /></AppLayout>} />
        <Route path="/app/pedidos" element={<AppLayout><Pedidos /></AppLayout>} />
        <Route path="/app/envios" element={<AppLayout><Envios /></AppLayout>} />
        <Route path="/app/proveedores" element={<AppLayout><Proveedores /></AppLayout>} />
        <Route path="/app/empleados" element={<AppLayout><Empleados /></AppLayout>} />
        <Route path="/app/zonas" element={<AppLayout><Zonas /></AppLayout>} />
        <Route path="*" element={<h2>404</h2>} />
      </Routes>
    </BrowserRouter>
  );
}
