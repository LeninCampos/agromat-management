import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AppLayout from "./layout/AppLayout";

import Login from "./Login";
import Dashboard from "./pages/Dashboard";
import Productos from "./pages/Productos";
import Clientes from "./pages/Clientes";
import Pedidos from "./pages/Pedidos";
import Envios from "./pages/Envios";
import Proveedores from "./pages/Proveedores";
import Empleados from "./pages/Empleados";
import Zonas from "./pages/Zonas";
import Suministros from "./pages/Suministros";
import HistorialProducto from "./pages/HistorialProducto";

function PrivateRoute({ children }) {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/login" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/app"
          element={
            <PrivateRoute>
              <AppLayout />
            </PrivateRoute>
          }
        >
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="proveedores" element={<Proveedores />} />
          <Route path="productos" element={<Productos />} />
          <Route
            path="productos/:id/historial"
            element={<HistorialProducto />}
          />
          <Route path="suministros" element={<Suministros />} />
          <Route path="clientes" element={<Clientes />} />
          <Route path="pedidos" element={<Pedidos />} />
          <Route path="envios" element={<Envios />} />
          <Route path="empleados" element={<Empleados />} />
          <Route path="zonas" element={<Zonas />} />
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
}
