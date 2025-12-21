// frontend/src/pages/Envios.jsx
import { useEffect, useMemo, useState } from "react";
import Swal from "sweetalert2";
import {
  getEnvios,
  createEnvio,
  updateEnvio,
  deleteEnvio,
  uploadFotosEnvio,
  deleteFotoEnvio,
} from "../api/envios";
import { getPedidos } from "../api/pedidos";
import { getEmpleados } from "../api/empleados";
import { Camera, X, FileText, Image, Trash2, Plus, Eye } from "lucide-react";

const emptyForm = {
  codigo: "",
  id_pedido: "",
  id_empleado_responsable: "",
  status: "EN_PREPARACION",
  observaciones: "",
  direccion_envio: "",
  numero_remito: "",
  nombre_conductor: "",
  telefono_conductor: "",
  placa_vehiculo: "",
};

function getDireccionFromEnvioRow(row) {
  const dirPedido = row.Pedido?.direccion_envio;
  const dirCliente = row.Pedido?.Cliente?.direccion;
  return (dirPedido?.trim() || dirCliente?.trim() || "").trim();
}

export default function Envios() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const [pedidos, setPedidos] = useState([]);
  const [empleados, setEmpleados] = useState([]);

  // Estados para fotos
  const [fotosModal, setFotosModal] = useState(false);
  const [selectedEnvio, setSelectedEnvio] = useState(null);
  const [uploadingFotos, setUploadingFotos] = useState(false);
  const [galeriaModal, setGaleriaModal] = useState(false);
  const [fotoGrande, setFotoGrande] = useState(null);

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase();
    if (!query) return items;
    return items.filter(
      (x) =>
        x.codigo?.toLowerCase().includes(query) ||
        x.status?.toLowerCase().includes(query) ||
        x.numero_remito?.toLowerCase().includes(query)
    );
  }, [q, items]);

  const load = async () => {
    setLoading(true);
    try {
      const [resEnvios, resPedidos, resEmpleados] = await Promise.all([
        getEnvios(),
        getPedidos(),
        getEmpleados(),
      ]);

      setItems(resEnvios.data);
      setPedidos(resPedidos.data);
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

  useEffect(() => {
    if (!form.id_pedido) return;
    const pedidoSel = pedidos.find(
      (p) => String(p.id_pedido) === String(form.id_pedido)
    );
    if (!pedidoSel) return;

    const dir = (pedidoSel.direccion_envio || "").trim();
    const remito = pedidoSel.numero_remito || "";
    setForm((f) => ({ ...f, direccion_envio: dir, numero_remito: remito }));
  }, [form.id_pedido, pedidos]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  };

  const openEdit = (row) => {
    setEditingId(row.id_envio);
    const direccion = getDireccionFromEnvioRow(row);
    setForm({
      codigo: row.codigo,
      id_pedido: row.id_pedido,
      id_empleado_responsable: row.id_empleado_responsable,
      status: row.status,
      observaciones: row.observaciones ?? "",
      direccion_envio: direccion,
      numero_remito: row.numero_remito || row.Pedido?.numero_remito || "",
      nombre_conductor: row.nombre_conductor || "",
      telefono_conductor: row.telefono_conductor || "",
      placa_vehiculo: row.placa_vehiculo || "",
    });
    setModalOpen(true);
  };

  const save = async (e) => {
    e.preventDefault();
    if (!form.id_pedido || !form.id_empleado_responsable) {
      Swal.fire("Error", "Selecciona pedido y responsable", "warning");
      return;
    }

    const payload = {
      codigo: form.codigo,
      id_pedido: Number(form.id_pedido),
      id_empleado_responsable: Number(form.id_empleado_responsable),
      observaciones: form.observaciones,
      status: editingId ? form.status : "EN_PREPARACION",
      numero_remito: form.numero_remito || null,
      nombre_conductor: form.nombre_conductor || null,
      telefono_conductor: form.telefono_conductor || null,
      placa_vehiculo: form.placa_vehiculo || null,
    };

    try {
      if (editingId) {
        await updateEnvio(editingId, payload);
        Swal.fire("✔️", "Despacho actualizado", "success");
      } else {
        await createEnvio(payload);
        Swal.fire("✔️", "Despacho creado", "success");
      }
      setModalOpen(false);
      setForm(emptyForm);
      setEditingId(null);
      load();
    } catch (e) {
      console.error("ERROR:", e);
      const msg = e.response?.data?.error || "Error al guardar";
      Swal.fire("Error", msg, "error");
    }
  };

  const remove = async (row) => {
    const result = await Swal.fire({
      title: "¿Eliminar despacho?",
      text: `Código ${row.codigo}`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
    });
    if (!result.isConfirmed) return;
    try {
      await deleteEnvio(row.id_envio);
      load();
      Swal.fire("✔️", "Despacho eliminado", "success");
    } catch (e) {
      Swal.fire("Error", "No pude eliminar", "error");
    }
  };

  // Abrir modal de fotos
  const openFotosModal = (envio) => {
    setSelectedEnvio(envio);
    setFotosModal(true);
  };

  // Subir fotos
  const handleUploadFotos = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingFotos(true);
    const formData = new FormData();
    for (let i = 0; i < files.length; i++) {
      formData.append("fotos", files[i]);
    }

    try {
      await uploadFotosEnvio(selectedEnvio.id_envio, formData);
      Swal.fire("✔️", `${files.length} foto(s) subida(s)`, "success");
      load();
      const updated = await getEnvios();
      const envioActualizado = updated.data.find(e => e.id_envio === selectedEnvio.id_envio);
      setSelectedEnvio(envioActualizado);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudieron subir las fotos", "error");
    } finally {
      setUploadingFotos(false);
      e.target.value = "";
    }
  };

  // Eliminar una foto
  const handleDeleteFoto = async (fotoId) => {
    const result = await Swal.fire({
      title: "¿Eliminar foto?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      confirmButtonColor: "#d33",
    });
    if (!result.isConfirmed) return;

    try {
      await deleteFotoEnvio(selectedEnvio.id_envio, fotoId);
      Swal.fire("✔️", "Foto eliminada", "success");
      load();
      const updated = await getEnvios();
      const envioActualizado = updated.data.find(e => e.id_envio === selectedEnvio.id_envio);
      setSelectedEnvio(envioActualizado);
    } catch (err) {
      console.error(err);
      Swal.fire("Error", "No se pudo eliminar la foto", "error");
    }
  };

  // Abrir galería
  const openGaleria = (envio) => {
    if (!envio.fotos || envio.fotos.length === 0) {
      Swal.fire("Info", "Este despacho no tiene fotos", "info");
      return;
    }
    setSelectedEnvio(envio);
    setFotoGrande(envio.fotos[0]);
    setGaleriaModal(true);
  };

  // URL base para imágenes
  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return `${import.meta.env.VITE_API_URL?.replace("/api", "") || "http://localhost:4001"}${url}`;
  };

  return (
    <div className="space-y-4" style={{ padding: "1.5rem" }}>
      <div className="flex items-center justify-between">
        <h2 style={{ fontSize: "1.5rem", fontWeight: "600" }}>📦 Despachos</h2>
        <button onClick={openCreate} style={{ background: "#4F46E5", color: "white", padding: "8px 14px", borderRadius: "6px", border: "none", cursor: "pointer" }}>
          + Nuevo
        </button>
      </div>

      <div style={{ marginTop: 15, display: "flex", gap: 10 }}>
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por código, status o remito…" style={{ flex: 1, padding: "8px 12px", borderRadius: "6px", border: "1px solid #ddd" }} />
        <button onClick={load} style={{ padding: "8px 14px", borderRadius: 6, background: "#f3f4f6", border: "1px solid #ddd", cursor: "pointer" }}>Recargar</button>
      </div>

      {/* TABLA */}
      <div style={{ marginTop: 20, background: "white", borderRadius: "12px", boxShadow: "0px 2px 6px rgba(0,0,0,0.08)", padding: 10, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#f9fafb" }}>
            <tr>
              <th style={{ padding: "10px" }}>Código</th>
              <th style={{ padding: "10px" }}>Pedido</th>
              <th style={{ padding: "10px" }}>Remito</th>
              <th style={{ padding: "10px" }}>Dirección env.</th>
              <th style={{ padding: "10px" }}>Responsable / Conductor</th>
              <th style={{ padding: "10px" }}>Status</th>
              <th style={{ padding: "10px", textAlign: "center" }}>Fotos</th>
              <th style={{ padding: "10px" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>Cargando…</td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={8} style={{ textAlign: "center", padding: "20px" }}>Sin resultados</td></tr>
            ) : (
              filtered.map((row) => {
                const dirEnvio = getDireccionFromEnvioRow(row) || "-";
                const conductorText = row.nombre_conductor || row.telefono_conductor || row.placa_vehiculo
                  ? `${row.nombre_conductor || "Sin nombre"} · ${row.telefono_conductor || "Sin tel."} · ${row.placa_vehiculo || "Sin placas"}`
                  : "";
                const numFotos = row.fotos?.length || 0;
                const remitoDisplay = row.numero_remito || row.Pedido?.numero_remito;

                return (
                  <tr key={row.id_envio} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "10px", fontWeight: 500 }}>{row.codigo}</td>
                    <td style={{ padding: "10px" }}>
                      Pedido #{row.id_pedido}<br />
                      <span style={{ fontSize: "0.82em", color: "#6b7280" }}>
                        {row.Pedido?.Cliente?.nombre_cliente || ""}
                        {row.Pedido?.total != null && ` ($${Number(row.Pedido.total).toFixed(2)})`}
                      </span>
                    </td>
                    <td style={{ padding: "10px" }}>
                      {remitoDisplay ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: "4px", background: "#f3e8ff", color: "#7c3aed", padding: "4px 8px", borderRadius: "6px", fontSize: "0.85em", fontWeight: 600 }}>
                          <FileText size={12} /> {remitoDisplay}
                        </span>
                      ) : (
                        <span style={{ color: "#9ca3af", fontSize: "0.85em" }}>-</span>
                      )}
                    </td>
                    <td style={{ padding: "10px", fontSize: "0.86em" }}>{dirEnvio || "-"}</td>
                    <td style={{ padding: "10px", fontSize: "0.86em" }}>
                      <strong>{row.responsable?.nombre_empleado || "Sin asignar"}</strong>
                      {conductorText && <div style={{ color: "#6b7280", marginTop: 2 }}>{conductorText}</div>}
                    </td>
                    <td style={{ padding: "10px" }}>
                      <span style={{ padding: "4px 8px", borderRadius: "4px", background: row.status === "ENTREGADO" ? "#dcfce7" : row.status === "EN_TRANSITO" ? "#e0f2fe" : "#f3f4f6", color: row.status === "ENTREGADO" ? "#166534" : row.status === "EN_TRANSITO" ? "#075985" : "#374151", fontWeight: 500, fontSize: "0.9em" }}>
                        {row.status}
                      </span>
                    </td>
                    <td style={{ padding: "10px", textAlign: "center" }}>
                      <div style={{ display: "flex", gap: "4px", justifyContent: "center" }}>
                        <button onClick={() => openGaleria(row)} style={{ background: numFotos > 0 ? "#dcfce7" : "#f3f4f6", color: numFotos > 0 ? "#166534" : "#9ca3af", border: "none", borderRadius: "6px", padding: "6px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "0.8rem" }} title={numFotos > 0 ? "Ver fotos" : "Sin fotos"}>
                          <Image size={14} /> {numFotos}
                        </button>
                        <button onClick={() => openFotosModal(row)} style={{ background: "#4F46E5", color: "white", border: "none", borderRadius: "6px", padding: "6px 8px", cursor: "pointer", display: "flex", alignItems: "center" }} title="Agregar fotos">
                          <Camera size={14} />
                        </button>
                      </div>
                    </td>
                    <td style={{ padding: "10px" }}>
                      <button onClick={() => openEdit(row)} style={{ padding: "5px 10px", borderRadius: 6, background: "#F59E0B", color: "white", marginRight: 6, border: "none", cursor: "pointer" }}>Editar</button>
                      <button onClick={() => remove(row)} style={{ padding: "5px 10px", borderRadius: 6, background: "#DC2626", color: "white", border: "none", cursor: "pointer" }}>Eliminar</button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL CREAR/EDITAR */}
      {modalOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", display: "grid", placeItems: "center", zIndex: 50 }}>
          <form onSubmit={save} style={{ background: "white", padding: "1.6rem", borderRadius: 16, width: "100%", maxWidth: 520, boxShadow: "0 16px 40px rgba(15,23,42,0.25)", maxHeight: "90vh", overflowY: "auto" }}>
            <h3 style={{ marginBottom: 15, fontSize: "1.25rem", fontWeight: 600 }}>{editingId ? "Editar despacho" : "Nuevo despacho"}</h3>

            <label style={{ display: "block", marginBottom: 4 }}>Código del despacho</label>
            <input type="text" value={form.codigo} onChange={(e) => setForm((f) => ({ ...f, codigo: e.target.value }))} placeholder="Ej: EN-2025-001" required={!editingId} style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }} />

            <label style={{ display: "block", marginBottom: 4 }}>Pedido</label>
            <select value={form.id_pedido} onChange={(e) => setForm((f) => ({ ...f, id_pedido: e.target.value }))} required disabled={!!editingId} style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #d1d5db", background: editingId ? "#f3f4f6" : "white" }}>
              <option value="">-- Selecciona pedido --</option>
              {pedidos.map((p) => (
                <option key={p.id_pedido} value={p.id_pedido}>
                  #{p.id_pedido} - {p.fecha_pedido} ({p.status}) {p.numero_remito ? `- Remito: ${p.numero_remito}` : ""}
                </option>
              ))}
            </select>

            <label style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: 4 }}><FileText size={14} /> Nº de Remito</label>
            <input type="text" value={form.numero_remito} readOnly style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", color: form.numero_remito ? "#7c3aed" : "#9ca3af", fontWeight: form.numero_remito ? 600 : 400 }} placeholder="Se copia del pedido" />

            <label style={{ display: "block", marginBottom: 4 }}>Dirección de envío</label>
            <textarea value={form.direccion_envio || ""} readOnly style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #e5e7eb", background: "#f9fafb", fontSize: "0.9rem", minHeight: 50 }} placeholder="Se tomará del pedido" />

            <label style={{ display: "block", marginBottom: 4 }}>Responsable del despacho</label>
            <select value={form.id_empleado_responsable} onChange={(e) => setForm((f) => ({ ...f, id_empleado_responsable: e.target.value }))} required style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}>
              <option value="">-- Selecciona responsable --</option>
              {empleados.map((e) => (
                <option key={e.id_empleado} value={e.id_empleado}>{e.nombre_empleado} {e.rol ? `(${e.rol})` : ""}</option>
              ))}
            </select>

            <label style={{ display: "block", marginBottom: 4 }}>Nombre del conductor</label>
            <input type="text" value={form.nombre_conductor} onChange={(e) => setForm((f) => ({ ...f, nombre_conductor: e.target.value }))} style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }} />

            <label style={{ display: "block", marginBottom: 4 }}>Celular del conductor</label>
            <input type="text" value={form.telefono_conductor} onChange={(e) => setForm((f) => ({ ...f, telefono_conductor: e.target.value }))} style={{ width: "100%", marginBottom: 8, padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }} />

            <label style={{ display: "block", marginBottom: 4 }}>Placas del vehículo</label>
            <input type="text" value={form.placa_vehiculo} onChange={(e) => setForm((f) => ({ ...f, placa_vehiculo: e.target.value }))} style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }} />

            {editingId && (
              <>
                <label style={{ display: "block", marginBottom: 4 }}>Status del despacho</label>
                <select value={form.status} onChange={(e) => setForm((f) => ({ ...f, status: e.target.value }))} style={{ width: "100%", marginBottom: 10, padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}>
                  <option value="EN_PREPARACION">EN PREPARACIÓN</option>
                  <option value="EN_TRANSITO">EN TRÁNSITO</option>
                  <option value="ENTREGADO">ENTREGADO</option>
                  <option value="CANCELADO">CANCELADO</option>
                </select>
              </>
            )}

            <label style={{ display: "block", marginBottom: 4 }}>Observaciones</label>
            <textarea value={form.observaciones} onChange={(e) => setForm((f) => ({ ...f, observaciones: e.target.value }))} style={{ width: "100%", marginBottom: 16, padding: 8, borderRadius: 8, border: "1px solid #d1d5db", minHeight: 60 }} />

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={() => setModalOpen(false)} style={{ background: "#e5e7eb", padding: "8px 16px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: "0.9rem" }}>Cancelar</button>
              <button type="submit" style={{ background: "#4F46E5", color: "white", padding: "8px 18px", borderRadius: 999, border: "none", cursor: "pointer", fontSize: "0.9rem", fontWeight: 500 }}>Guardar despacho</button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL FOTOS */}
      {fotosModal && selectedEnvio && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "grid", placeItems: "center", zIndex: 60 }}>
          <div style={{ background: "white", padding: "1.5rem", borderRadius: 16, width: "100%", maxWidth: 600, maxHeight: "85vh", overflowY: "auto", boxShadow: "0 16px 40px rgba(15,23,42,0.25)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h3 style={{ fontSize: "1.2rem", fontWeight: 600, margin: 0 }}>📸 Fotos del Despacho {selectedEnvio.codigo}</h3>
              <button onClick={() => setFotosModal(false)} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.5rem" }}>✕</button>
            </div>

            <div style={{ border: "2px dashed #d1d5db", borderRadius: 12, padding: 20, textAlign: "center", marginBottom: 20, background: "#f9fafb" }}>
              <Camera size={32} style={{ color: "#9ca3af", marginBottom: 8 }} />
              <p style={{ color: "#6b7280", marginBottom: 10 }}>Arrastra fotos aquí o haz clic para seleccionar</p>
              <label style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "#4F46E5", color: "white", padding: "10px 20px", borderRadius: 8, cursor: uploadingFotos ? "not-allowed" : "pointer", opacity: uploadingFotos ? 0.7 : 1 }}>
                <Plus size={16} />
                {uploadingFotos ? "Subiendo..." : "Seleccionar fotos"}
                <input type="file" multiple accept="image/*" onChange={handleUploadFotos} disabled={uploadingFotos} style={{ display: "none" }} />
              </label>
              <p style={{ color: "#9ca3af", fontSize: "0.8rem", marginTop: 8 }}>JPG, PNG, GIF, WEBP - Máximo 10MB por archivo</p>
            </div>

            <div>
              <h4 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>Fotos actuales ({selectedEnvio.fotos?.length || 0})</h4>
              {!selectedEnvio.fotos || selectedEnvio.fotos.length === 0 ? (
                <p style={{ color: "#9ca3af", textAlign: "center", padding: 20 }}>Este despacho no tiene fotos aún</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 12 }}>
                  {selectedEnvio.fotos.map((foto) => (
                    <div key={foto.id} style={{ position: "relative", borderRadius: 8, overflow: "hidden", aspectRatio: "1", background: "#f3f4f6" }}>
                      <img src={getImageUrl(foto.url)} alt={foto.nombre_archivo || "Foto"} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      <button onClick={() => handleDeleteFoto(foto.id)} style={{ position: "absolute", top: 4, right: 4, background: "#DC2626", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Eliminar foto">
                        <Trash2 size={12} />
                      </button>
                      <button onClick={() => { setFotoGrande(foto); setGaleriaModal(true); }} style={{ position: "absolute", bottom: 4, right: 4, background: "rgba(0,0,0,0.6)", color: "white", border: "none", borderRadius: "50%", width: 24, height: 24, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} title="Ver en grande">
                        <Eye size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 20 }}>
              <button onClick={() => setFotosModal(false)} style={{ background: "#4F46E5", color: "white", padding: "10px 24px", borderRadius: 8, border: "none", cursor: "pointer", fontWeight: 500 }}>Cerrar</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL GALERÍA */}
      {galeriaModal && selectedEnvio && fotoGrande && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.9)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 70, padding: 20 }}>
          <button onClick={() => setGaleriaModal(false)} style={{ position: "absolute", top: 20, right: 20, background: "rgba(255,255,255,0.2)", color: "white", border: "none", borderRadius: "50%", width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: "1.5rem" }}>
            <X size={24} />
          </button>

          <img src={getImageUrl(fotoGrande.url)} alt={fotoGrande.nombre_archivo || "Foto"} style={{ maxWidth: "90%", maxHeight: "75vh", objectFit: "contain", borderRadius: 8 }} />

          <div style={{ color: "white", marginTop: 15, textAlign: "center" }}>
            <p style={{ margin: 0, fontWeight: 500 }}>Despacho: {selectedEnvio.codigo}</p>
            {fotoGrande.nombre_archivo && <p style={{ margin: "5px 0 0 0", fontSize: "0.9rem", color: "#ccc" }}>{fotoGrande.nombre_archivo}</p>}
          </div>

          {selectedEnvio.fotos && selectedEnvio.fotos.length > 1 && (
            <div style={{ display: "flex", gap: 8, marginTop: 20, overflowX: "auto", maxWidth: "100%", padding: "10px 0" }}>
              {selectedEnvio.fotos.map((foto) => (
                <button key={foto.id} onClick={() => setFotoGrande(foto)} style={{ width: 60, height: 60, borderRadius: 6, overflow: "hidden", border: fotoGrande.id === foto.id ? "3px solid #4F46E5" : "3px solid transparent", cursor: "pointer", padding: 0, flexShrink: 0 }}>
                  <img src={getImageUrl(foto.url)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}