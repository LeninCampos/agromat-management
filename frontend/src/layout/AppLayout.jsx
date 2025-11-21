import Sidebar from "./Sidebar";
import Topbar from "./Topbar";

export default function AppLayout({ children }) {
  return (
    <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "grid", gridTemplateRows: "56px 1fr" }}>
        <Topbar />
        <main style={{ padding: 16 }}>{children}</main>
      </div>
    </div>
  );
}
