import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div
      style={{
        display: "flex",
        minHeight: "100vh",
        background: "#ffffff",  // FONDO COMPLETAMENTE BLANCO
      }}
    >
      {/* Sidebar NO SE TOCA */}
      <Sidebar />

      {/* CONTENIDO PRINCIPAL */}
      <div
        style={{
          flex: 1,
          display: "grid",
          gridTemplateRows: "56px 1fr",
          background: "#ffffff", // BLANCO para evitar sombras o colores raros
        }}
      >
        {/* Topbar */}
        <Topbar />

        {/* PÁGINAS */}
        <main
          style={{
            padding: 16,
            background: "#ffffff", // BLANCO si alguna página ponía otro color
          }}
        >
          <Outlet />
        </main>
      </div>
    </div>
  );
}
