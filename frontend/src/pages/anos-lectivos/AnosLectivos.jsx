import { useState, useEffect } from "react";
import api from "../../config/axios";
import Layout from "../../components/Layout";

const PRIMARY = "#243A76";
const modalBg = { backgroundColor: "rgba(36, 58, 118, 0.5)" };

const menuItems = [
  { id: "lista", label: "Lista de períodos", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg> },
  { id: "nuevo", label: "Nuevo período", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> },
];

export default function AnosLectivos() {
  const [anos, setAnos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState("lista");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [anoEdit, setAnoEdit] = useState(null);

  const [form, setForm] = useState({ nombre: "", fechaInicio: "", fechaFin: "" });


  const cargar = () => {
    setLoading(true);
    api.get(`/api/anos-lectivos`)
      .then(r => setAnos(r.data))
      .catch(() => setError("Error al cargar años lectivos"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t); }
  }, [success]);

  const filtrados = anos.filter(a =>
    a.nombre?.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleCrear = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.post(`/api/anos-lectivos`, form);
      setSuccess("Año lectivo creado correctamente.");
      setShowModal(false);
      setForm({ nombre: "", fechaInicio: "", fechaFin: "" });
      cargar();
    } catch (e) {
      setError(e.response?.data?.message || "Error al crear el año lectivo");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.put(`/api/anos-lectivos/${anoEdit.idAnoLectivo}`, {
        nombre: anoEdit.nombre,
        fechaInicio: anoEdit.fechaInicio,
        fechaFin: anoEdit.fechaFin,
      });
      setSuccess("Año lectivo actualizado correctamente.");
      setShowEditModal(false);
      cargar();
    } catch (e) {
      setError(e.response?.data?.message || "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleEstablecerActual = async (id) => {
    try {
      await api.patch(`/api/anos-lectivos/${id}/establecer-actual`, {});
      setSuccess("Año lectivo establecido como actual.");
      cargar();
    } catch {
      setError("Error al establecer el año lectivo actual");
    }
    setShowConfirm(null);
  };

  const handleSeccion = (id) => {
    setSeccion(id);
    if (id === "nuevo") { setShowModal(true); setError(""); }
  };

  return (
    <Layout
      breadcrumb={["Inicio", "Años Lectivos"]}
      sidebarTitle="Años Lectivos"
      menuItems={menuItems}
      seccion={seccion}
      onSeccionChange={handleSeccion}
    >

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-red-600 text-sm">{error}</span>
          <button onClick={() => setError("")} className="text-red-400 hover:text-red-600">✕</button>
        </div>
      )}
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 rounded-lg px-4 py-3 flex items-center justify-between">
          <span className="text-green-600 text-sm">{success}</span>
          <button onClick={() => setSuccess("")} className="text-green-400 hover:text-green-600">✕</button>
        </div>
      )}

      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-700">Años Lectivos</h1>
          <p className="text-xs text-slate-400">{filtrados.length} período{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="text"
              placeholder="Buscar año lectivo..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
              className="pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none bg-slate-50 w-48"
            />
            <svg className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <button
            onClick={() => { setShowModal(true); setError(""); }}
            style={{ backgroundColor: PRIMARY }}
            className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition shadow-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nuevo año lectivo
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-sm">Cargando años lectivos...</div>
        ) : filtrados.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No se encontraron años lectivos</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ backgroundColor: PRIMARY }} className="text-white text-xs">
                  <th className="text-left px-4 py-3 font-semibold">#</th>
                  <th className="text-left px-4 py-3 font-semibold">Nombre</th>
                  <th className="text-left px-4 py-3 font-semibold">Fecha inicio</th>
                  <th className="text-left px-4 py-3 font-semibold">Fecha fin</th>
                  <th className="text-left px-4 py-3 font-semibold">Estado</th>
                  <th className="text-center px-4 py-3 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filtrados.map((a, i) => (
                  <tr key={a.idAnoLectivo} className={`border-t border-slate-100 hover:bg-slate-50 transition ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{a.nombre}</td>
                    <td className="px-4 py-3 text-slate-500">{a.fechaInicio}</td>
                    <td className="px-4 py-3 text-slate-500">{a.fechaFin}</td>
                    <td className="px-4 py-3">
                      {a.esActual ? (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">Actual</span>
                      ) : (
                        <span className="text-xs px-2 py-1 rounded-full font-medium bg-slate-100 text-slate-500">Cerrado</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => { setAnoEdit(a); setShowEditModal(true); setError(""); }}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                          title="Editar"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        {!a.esActual && (
                          <button
                            onClick={() => setShowConfirm({ id: a.idAnoLectivo, nombre: a.nombre })}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition"
                            title="Establecer como actual"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL CREAR */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div style={{ backgroundColor: PRIMARY }} className="px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">Nuevo Año Lectivo</h2>
              <button onClick={() => { setShowModal(false); setError(""); }} className="text-white text-opacity-70 hover:text-opacity-100">✕</button>
            </div>
            <form onSubmit={handleCrear} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{error}</div>}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Nombre</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej: 2026-2027"
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha inicio</label>
                  <input
                    type="date"
                    value={form.fechaInicio}
                    onChange={e => setForm({ ...form, fechaInicio: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha fin</label>
                  <input
                    type="date"
                    value={form.fechaFin}
                    onChange={e => setForm({ ...form, fechaFin: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowModal(false); setError(""); }} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ backgroundColor: PRIMARY }} className="flex-1 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60">
                  {saving ? "Creando..." : "Crear año lectivo"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL EDITAR */}
      {showEditModal && anoEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div style={{ backgroundColor: PRIMARY }} className="px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">Editar — {anoEdit.nombre}</h2>
              <button onClick={() => setShowEditModal(false)} className="text-white text-opacity-70 hover:text-opacity-100">✕</button>
            </div>
            <form onSubmit={handleEditar} className="p-6 space-y-4">
              {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{error}</div>}

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Nombre</label>
                <input
                  type="text"
                  value={anoEdit.nombre}
                  onChange={e => setAnoEdit({ ...anoEdit, nombre: e.target.value })}
                  required
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha inicio</label>
                  <input
                    type="date"
                    value={anoEdit.fechaInicio}
                    onChange={e => setAnoEdit({ ...anoEdit, fechaInicio: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Fecha fin</label>
                  <input
                    type="date"
                    value={anoEdit.fechaFin}
                    onChange={e => setAnoEdit({ ...anoEdit, fechaFin: e.target.value })}
                    required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button type="submit" disabled={saving} style={{ backgroundColor: PRIMARY }} className="flex-1 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60">
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CONFIRMAR ESTABLECER ACTUAL */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 bg-green-500">
              <h2 className="text-white font-bold text-base">Establecer año lectivo actual</h2>
            </div>
            <div className="p-6">
              <p className="text-slate-600 text-sm">
                ¿Establecer "{showConfirm.nombre}" como el año lectivo actual? El año lectivo anterior dejará de estar activo.
              </p>
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowConfirm(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button
                  onClick={() => handleEstablecerActual(showConfirm.id)}
                  className="flex-1 py-2 text-white rounded-lg text-sm font-medium bg-green-500 hover:bg-green-600 transition"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
