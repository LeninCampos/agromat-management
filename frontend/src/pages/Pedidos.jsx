// frontend/src/pages/Pedidos.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getPedidos,
  createPedido,
  updatePedido,
  deletePedido,
} from "../api/pedidos";
import { getProductos } from "../api/productos";
import { getClientes } from "../api/clientes";
import { getEmpleados } from "../api/empleados";

const BACKEND_URL = "http://localhost:4000";

// ✅ SOLO ESTOS STATUS
const STATUS_OPTIONS = ["Pendiente", "En proceso", "Completado", "Cancelado"];

const emptyForm = {
  fecha_pedido: "",
  hora_pedido: "",
  status: "Pendiente",
  id_empleado: "",
  id_cliente: "",
  direccion_envio: "", // 👈 NUEVO
  descuento_total: 0,
  impuesto_total: 0,
  items: [],
};

// Helpers para fecha/hora actual
function formatDate(d) {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(d) {
  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  return `${hours}:${minutes}`;
}

export default function Pedidos() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  // Catálogos
  const [productos, setProductos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Mini-form de item
  const [nuevoItem, setNuevoItem] = useState({
    id_producto: "",
    cantidad: 1,
    precio_unitario: 0,
  });

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter((x) => x.status?.toLowerCase().includes(query));
  }, [q, items]);

  // CARGA
  const load = async () => {
    setLoading(true);
    try {
      const [resPedidos, resProductos, resClientes, resEmpleados] =
        await Promise.all([
          getPedidos(),
          getProductos(),
          getClientes(),
          getEmpleados(),
        ]);

      const pedidosFormateados = resPedidos.data.map((pedido) => ({
        ...pedido,
        direccion_envio: pedido.direccion_envio || "", // 👈
        // items desde la relación Productos + Contiene
        items: (pedido.Productos || []).map((prod) => ({
          id_producto: prod.id_producto,
          nombre_producto: prod.nombre_producto,
          cantidad: prod.Contiene?.cantidad || 0,
          precio_unitario: prod.Contiene?.precio_unitario || prod.precio,
        })),
      }));

      const productosFormateados = resProductos.data.map((p) => {
        let imagenUrl = p.imagen_url ?? "";
        if (imagenUrl && imagenUrl.startsWith("/")) {
          imagenUrl = `${BACKEND_URL}${imagenUrl}`;
        }
        return { ...p, imagen_url: imagenUrl };
      });

      setItems(pedidosFormateados);
      setProductos(productosFormateados);
      setClientes(resClientes.data);
      setEmpleados(resEmpleados.data);
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude cargar los datos", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // ✅ Nuevo pedido: fecha/hora automáticas de la compu
  const openCreate = () => {
    const now = new Date();
    setEditingId(null);
    setForm({
      ...emptyForm,
      fecha_pedido: formatDate(now),
      hora_pedido: formatTime(now),
      status: "Pendiente",
    });
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_pedido);
    setForm({
      fecha_pedido: row.fecha_pedido,
      hora_pedido: row.hora_pedido,
      status: row.status,
      id_empleado: row.id_empleado,
      id_cliente: row.id_cliente,
      direccion_envio: row.direccion_envio || "", // 👈
      descuento_total: row.descuento_total,
      impuesto_total: row.impuesto_total,
      items: row.items ?? [],
    });
    setModalOpen(true);
  };

  // Cambiar status solo desde tabla
  const updateStatus = async (row, nuevoStatus) => {
    try {
      const payload = {
        fecha_pedido: row.fecha_pedido,
        hora_pedido: row.hora_pedido,
        status: nuevoStatus,
        id_empleado: Number(row.id_empleado),
        id_cliente: Number(row.id_cliente),
        direccion_envio: row.direccion_envio || "", // 👈 mantener
        descuento_total: Number(row.descuento_total ?? 0),
        impuesto_total: Number(row.impuesto_total ?? 0),
        items: row.items ?? [],
      };

      await updatePedido(row.id_pedido, payload);

      setItems((prev) =>
        prev.map((p) =>
          p.id_pedido === row.id_pedido ? { ...p, status: nuevoStatus } : p
        )
      );
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo actualizar el status", "error");
    }
  };

  // --- Items ----
  const agregarItem = () => {
    if (!nuevoItem.id_producto) {
      Swal.fire("Error", "Selecciona un producto", "error");
      return;
    }
    const cant = Number(nuevoItem.cantidad);
    if (cant <= 0) return;

    const productoInfo = productos.find(
      (p) => p.id_producto == nuevoItem.id_producto
    );
    const precio = Number(
      nuevoItem.precio_unitario || productoInfo?.precio || 0
    );

    setForm((prev) => {
      const existe = prev.items.find(
        (it) => it.id_producto == nuevoItem.id_producto
      );
      let nuevosItems;

      if (existe) {
        nuevosItems = prev.items.map((it) =>
          it.id_producto == nuevoItem.id_producto
            ? { ...it, cantidad: Number(it.cantidad) + cant }
            : it
        );
      } else {
        nuevosItems = [
          ...prev.items,
          {
            id_producto: nuevoItem.id_producto,
            cantidad: cant,
            precio_unitario: precio,
          },
        ];
      }
      return { ...prev, items: nuevosItems };
    });

    setNuevoItem({ id_producto: "", cantidad: 1, precio_unitario: 0 });
  };

  const actualizarCantidadItem = (idProd, nuevaCant) => {
    const cant = Number(nuevaCant);
    if (cant < 1) return;
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((it) =>
        it.id_producto === idProd ? { ...it, cantidad: cant } : it
      ),
    }));
  };

  const eliminarItem = (id) => {
    setForm((f) => ({
      ...f,
      items: f.items.filter((x) => x.id_producto !== id),
    }));
  };

  const totalCalculado = useMemo(
    () =>
      form.items.reduce(
        (acc, it) => acc + it.cantidad * it.precio_unitario,
        0
      ),
    [form.items]
  );

  // --- Guardar ---
  const save = async (e) => {
    e.preventDefault();

    if (form.items.length === 0) {
      Swal.fire("Error", "Agrega al menos un producto", "error");
      return;
    }
    if (!form.id_cliente || !form.id_empleado) {
      Swal.fire("Error", "Selecciona cliente y empleado", "error");
      return;
    }

    try {
      const payload = {
        fecha_pedido: form.fecha_pedido,
        hora_pedido: form.hora_pedido,
        status: form.status,
        id_empleado: Number(form.id_empleado),
        id_cliente: Number(form.id_cliente),
        direccion_envio: form.direccion_envio?.trim() || "", // 👈
        descuento_total: Number(form.descuento_total),
        impuesto_total: Number(form.impuesto_total),
        items: form.items,
      };

      if (editingId) {
        await updatePedido(editingId, payload);
        Swal.fire("✔️ Listo", "Pedido actualizado", "success");
      } else {
        await createPedido(payload);
        Swal.fire("✔️ Listo", "Pedido creado", "success");
      }

      setModalOpen(false);
      setEditingId(null);
      setForm(emptyForm);
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No se pudo guardar el pedido", "error");
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar pedido?",
      text: `Pedido #${row.id_pedido}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });
    if (!result.isConfirmed) return;
    try {
      await deletePedido(row.id_pedido);
      Swal.fire("🗑️ Eliminado", "Pedido eliminado", "success");
      load();
    } catch (e) {
      console.error(e);
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  // --- render ---
  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>📦 Pedidos</h2>
        <button
          onClick={openCreate}
          style={{
            background: "#4F46E5",
            color: "white",
            padding: "8px 14px",
            borderRadius: "6px",
            border: "none",
            cursor: "pointer",
          }}
        >
          + Nuevo
        </button>
      </div>

      <div style={{ display: "flex", gap: "10px" }}>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por status..."
          style={{
            flex: 1,
            padding: "8px 12px",
            borderRadius: "6px",
            border: "1px solid #ddd",
          }}
        />
        <button
          onClick={load}
          style={{
            background: "#f3f4f6",
            padding: "8px 14px",
            border: "1px solid #ddd",
            borderRadius: "6px",
          }}
        >
          Recargar
        </button>
      </div>

      {/* TABLA */}
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.05)",
          overflowX: "auto",
        }}
      >
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb", color: "#555" }}>
            <tr>
              <th style={{ padding: "10px" }}>ID</th>
              <th style={{ padding: "10px" }}>Fecha</th>
              <th style={{ padding: "10px" }}>Hora</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px" }}>Cliente</th>
              <th style={{ padding: "10px" }}>Dirección env.</th>{/* 👈 */}
              <th style={{ padding: "10px" }}>Empleado</th>
              <th style={{ padding: "10px" }}>Total</th>
              <th style={{ padding: "10px" }}>Última modif.</th>
              <th style={{ padding: "10px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "20px" }}>
                  Cargando...
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={10} style={{ textAlign: "center", padding: "20px" }}>
                  Sin resultados
                </td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id_pedido} style={{ borderTop: "1px solid #eee" }}>
                  <td style={{ padding: "10px" }}>{row.id_pedido}</td>
                  <td style={{ padding: "10px" }}>{row.fecha_pedido}</td>
                  <td style={{ padding: "10px" }}>{row.hora_pedido}</td>

                  <td style={{ padding: "10px" }}>
                    <select
                      value={row.status}
                      onChange={(e) => updateStatus(row, e.target.value)}
                      style={{
                        padding: "6px 8px",
                        borderRadius: "6px",
                        border: "1px solid #e5e7eb",
                        background: "#f9fafb",
                      }}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>

                  <td style={{ padding: "10px" }}>
                    {row.Cliente?.nombre_cliente || `#${row.id_cliente}`}
                  </td>

                  <td
                    style={{
                      padding: "10px",
                      maxWidth: "220px",
                      fontSize: "0.8rem",
                      color: "#4b5563",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                    title={row.direccion_envio || ""} // tooltip con la dirección completa
                  >
                    {row.direccion_envio || "-"}
                  </td>

                  <td style={{ padding: "10px" }}>
                    {row.Empleado?.nombre_empleado || `#${row.id_empleado}`}
                  </td>
                  <td style={{ padding: "10px" }}>
                    ${Number(row.total ?? 0).toFixed(2)}
                  </td>

                  {/* Última modificación */}
                  <td
                    style={{
                      padding: "10px",
                      fontSize: "0.8rem",
                      color: "#6b7280",
                    }}
                  >
                    {row.updated_at
                      ? `${new Date(row.updated_at).toLocaleDateString()} ${new Date(
                          row.updated_at
                        ).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}`
                      : "-"}
                    <br />
                    <span style={{ fontSize: "0.75rem" }}>
                      {row.last_change || "Sin detalles"}
                    </span>
                  </td>

                  <td style={{ padding: "10px" }}>
                    <button
                      onClick={() => openEdit(row)}
                      style={{
                        background: "#F59E0B",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(row)}
                      style={{
                        background: "#DC2626",
                        color: "white",
                        padding: "5px 10px",
                        borderRadius: "6px",
                        border: "none",
                        marginLeft: "8px",
                        cursor: "pointer",
                      }}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL */}
      {modalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(15,23,42,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <form
            onSubmit={save}
            style={{
              background: "white",
              padding: "1.75rem 1.75rem 1.5rem",
              borderRadius: "18px",
              width: "100%",
              maxWidth: "720px",
              maxHeight: "90vh",
              overflowY: "auto",
              boxShadow:
                "0 18px 45px rgba(15,23,42,0.28), 0 0 0 1px rgba(148,163,184,0.18)",
            }}
          >
            {/* HEADER DEL MODAL */}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
              }}
            >
              <div>
                <h3
                  style={{
                    fontSize: "1.25rem",
                    fontWeight: 600,
                    letterSpacing: "0.01em",
                  }}
                >
                  {editingId ? "Editar pedido" : "Nuevo pedido"}
                </h3>
                <p
                  style={{
                    fontSize: "0.8rem",
                    color: "#6b7280",
                    marginTop: "0.15rem",
                  }}
                >
                  Completa la información del pedido y los productos.
                </p>
              </div>
              <span
                style={{
                  fontSize: "0.75rem",
                  padding: "4px 10px",
                  borderRadius: "999px",
                  background: "#eef2ff",
                  color: "#4338ca",
                  fontWeight: 500,
                }}
              >
                {form.status || "Pendiente"}
              </span>
            </div>

            {/* BLOQUE 1: FECHA / HORA / STATUS */}
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "12px 12px 10px",
                marginBottom: "12px",
                background: "#f9fafb",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "10px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  Detalles generales
                </span>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "3px",
                    }}
                  >
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={form.fecha_pedido}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, fecha_pedido: e.target.value }))
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "3px",
                    }}
                  >
                    Hora
                  </label>
                  <input
                    type="time"
                    value={form.hora_pedido}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, hora_pedido: e.target.value }))
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "3px",
                    }}
                  >
                    Status
                  </label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, status: e.target.value }))
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "999px",
                      fontSize: "0.85rem",
                      background: "white",
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* BLOQUE 2: CLIENTE / EMPLEADO */}
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "12px 12px 10px",
                marginBottom: "14px",
                background: "white",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#4b5563",
                  marginBottom: "8px",
                }}
              >
                Cliente y responsable
              </span>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "10px",
                }}
              >
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "3px",
                    }}
                  >
                    Cliente
                  </label>
                  <select
                    value={form.id_cliente}
                    onChange={(e) => {
                      const value = e.target.value;
                      setForm((f) => {
                        const selectedCli = clientes.find(
                          (c) =>
                            String(c.id_cliente) === String(value)
                        );
                        const direccionCliente =
                          selectedCli?.direccion_envio ||
                          selectedCli?.direccion ||
                          selectedCli?.direccion_cliente ||
                          "";

                        // solo autollenar si no había nada escrito
                        const nuevaDireccion =
                          f.direccion_envio?.trim()
                            ? f.direccion_envio
                            : direccionCliente;

                        return {
                          ...f,
                          id_cliente: value,
                          direccion_envio: nuevaDireccion,
                        };
                      });
                    }}
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">-- Selecciona --</option>
                    {clientes.map((c) => (
                      <option key={c.id_cliente} value={c.id_cliente}>
                        {c.nombre_cliente}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "3px",
                    }}
                  >
                    Empleado
                  </label>
                  <select
                    value={form.id_empleado}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, id_empleado: e.target.value }))
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">-- Selecciona --</option>
                    {empleados.map((em) => (
                      <option key={em.id_empleado} value={em.id_empleado}>
                        {em.nombre_empleado}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* BLOQUE 2.5: DIRECCIÓN ENVÍO */}
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "12px 12px 10px",
                marginBottom: "14px",
                background: "white",
              }}
            >
              <span
                style={{
                  display: "block",
                  fontSize: "0.8rem",
                  fontWeight: 600,
                  color: "#4b5563",
                  marginBottom: "4px",
                }}
              >
                Dirección de envío
              </span>
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#9ca3af",
                  marginTop: 0,
                  marginBottom: "6px",
                }}
              >
                Por defecto se usa la dirección del cliente. Puedes modificarla si
                este pedido va a otro domicilio.
              </p>
              <textarea
                rows={3}
                value={form.direccion_envio}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    direccion_envio: e.target.value,
                  }))
                }
                placeholder="Calle, número, colonia, ciudad, CP..."
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #d1d5db",
                  borderRadius: "10px",
                  fontSize: "0.85rem",
                  resize: "vertical",
                }}
              />
            </div>

            {/* BLOQUE 3: PRODUCTOS */}
            <div
              style={{
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                padding: "12px 12px 10px",
                background: "white",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "8px",
                }}
              >
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "#4b5563",
                  }}
                >
                  Productos en el pedido
                </span>
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#6b7280",
                  }}
                >
                  Total estimado: <strong>${totalCalculado.toFixed(2)}</strong>
                </span>
              </div>

              {/* AGREGAR PRODUCTO */}
              <div
                style={{
                  display: "flex",
                  gap: "6px",
                  alignItems: "flex-end",
                  marginBottom: "10px",
                }}
              >
                <div style={{ flex: 2 }}>
                  <label
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "3px",
                      display: "block",
                    }}
                  >
                    Producto
                  </label>
                  <select
                    value={nuevoItem.id_producto}
                    onChange={(e) =>
                      setNuevoItem((i) => ({
                        ...i,
                        id_producto: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  >
                    <option value="">Buscar...</option>
                    {productos.map((p) => (
                      <option key={p.id_producto} value={p.id_producto}>
                        {p.nombre_producto} (${Number(p.precio).toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ width: "100px" }}>
                  <label
                    style={{
                      fontSize: "0.75rem",
                      color: "#6b7280",
                      marginBottom: "3px",
                      display: "block",
                    }}
                  >
                    Cant
                  </label>
                  <input
                    type="number"
                    value={nuevoItem.cantidad}
                    min="1"
                    onChange={(e) =>
                      setNuevoItem((i) => ({
                        ...i,
                        cantidad: e.target.value,
                      }))
                    }
                    style={{
                      width: "100%",
                      padding: "8px",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      fontSize: "0.85rem",
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={agregarItem}
                  style={{
                    background: "#4F46E5",
                    color: "white",
                    padding: "9px 16px",
                    borderRadius: "999px",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "0.85rem",
                    fontWeight: 500,
                    boxShadow: "0 8px 18px rgba(79,70,229,0.25)",
                  }}
                >
                  Agregar
                </button>
              </div>

              {/* TABLA DE ITEMS */}
              <div
                style={{
                  marginTop: "5px",
                  background: "#f9fafb",
                  padding: "8px",
                  borderRadius: "10px",
                }}
              >
                <table style={{ width: "100%", fontSize: "0.85rem" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                      <th style={{ textAlign: "left", padding: "6px 4px" }}>
                        Foto
                      </th>
                      <th style={{ textAlign: "left", padding: "6px 4px" }}>
                        Producto
                      </th>
                      <th style={{ width: "80px", padding: "6px 4px" }}>
                        Cant.
                      </th>
                      <th
                        style={{ textAlign: "right", padding: "6px 4px" }}
                      >
                        Precio
                      </th>
                      <th
                        style={{ textAlign: "right", padding: "6px 4px" }}
                      >
                        Subtotal
                      </th>
                      <th style={{ width: "40px" }}></th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.items.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          style={{
                            textAlign: "center",
                            padding: "10px",
                            color: "#9ca3af",
                          }}
                        >
                          Carrito vacío
                        </td>
                      </tr>
                    )}
                    {form.items.map((it) => {
                      const prodInfo = productos.find(
                        (p) => p.id_producto == it.id_producto
                      );
                      const nombreMostrar = prodInfo
                        ? prodInfo.nombre_producto
                        : it.nombre_producto || it.id_producto;
                      const imagenUrl = prodInfo?.imagen_url || "";

                      return (
                        <tr
                          key={it.id_producto}
                          style={{ borderBottom: "1px solid #eef2f7" }}
                        >
                          <td style={{ padding: "6px 4px" }}>
                            {imagenUrl ? (
                              <img
                                src={imagenUrl}
                                alt={nombreMostrar}
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "10px",
                                  objectFit: "cover",
                                  border: "1px solid #e5e7eb",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: "40px",
                                  height: "40px",
                                  borderRadius: "10px",
                                  background: "#e5e7eb",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                  fontSize: "0.7rem",
                                  color: "#6b7280",
                                }}
                              >
                                Sin foto
                              </div>
                            )}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            {nombreMostrar}
                          </td>
                          <td style={{ padding: "6px 4px" }}>
                            <input
                              type="number"
                              value={it.cantidad}
                              min="1"
                              onChange={(e) =>
                                actualizarCantidadItem(
                                  it.id_producto,
                                  e.target.value
                                )
                              }
                              style={{
                                width: "60px",
                                padding: "4px",
                                borderRadius: "6px",
                                border: "1px solid #d1d5db",
                                fontSize: "0.8rem",
                              }}
                            />
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "6px 4px",
                            }}
                          >
                            ${Number(it.precio_unitario).toFixed(2)}
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "6px 4px",
                            }}
                          >
                            <strong>
                              {(it.cantidad * it.precio_unitario).toFixed(2)}
                            </strong>
                          </td>
                          <td
                            style={{
                              textAlign: "right",
                              padding: "6px 4px",
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => eliminarItem(it.id_producto)}
                              style={{
                                color: "#DC2626",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                fontWeight: "bold",
                                fontSize: "0.9rem",
                              }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* FOOTER BOTONES */}
            <div
              style={{
                display: "flex",
                justifyContent: "flex-end",
                gap: "10px",
                marginTop: "18px",
              }}
            >
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                style={{
                  background: "#e5e7eb",
                  padding: "8px 16px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                Cancelar
              </button>
              <button
                type="submit"
                style={{
                  background: "#4F46E5",
                  color: "white",
                  padding: "8px 18px",
                  borderRadius: "999px",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  fontWeight: 500,
                }}
              >
                Guardar Pedido
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
