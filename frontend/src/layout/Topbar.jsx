export default function Topbar() {
  return (
    <header style={{
      height: 56, display: "flex", alignItems: "center",
      justifyContent: "space-between", padding: "0 16px",
      borderBottom: "1px solid #e5e7eb", background: "#fff"
    }}>
      <strong>Panel</strong>
      <div style={{ fontSize: 14, opacity: .8 }}>Usuario</div>
    </header>
  );
}
