import { useState, useEffect } from "react";
import api from "../../config/axios";
import Layout from "../../components/Layout";


const PRIMARY = "#243A76";

const ROLES = [
  { id: 1, nombre: "DIRECTOR" },
  { id: 2, nombre: "SECRETARIA" },
  { id: 3, nombre: "DOCENTE" },
  { id: 4, nombre: "SOPORTE_TECNICO" },
];

const estadoBadge = (estado) => {
  const map = {
    ACTIVO: "bg-green-100 text-green-700",
    INACTIVO: "bg-slate-100 text-slate-500",
    BLOQUEADO: "bg-red-100 text-red-600",
  };
  return map[estado] || "bg-slate-100 text-slate-500";
};

const menuItems = [
  { id: "lista", label: "Lista de usuarios", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg> },
  { id: "nuevo", label: "Nuevo usuario", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" /></svg> },
];

export default function Usuarios() {
  const [usuarios, setUsuarios] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [seccion, setSeccion] = useState("lista");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [usuarioEdit, setUsuarioEdit] = useState(null);

  const [form, setForm] = useState({
    nombres: "", apellidos: "", correo: "", roles: [],
  });

  
  

  const cargar = () => {
    setLoading(true);
    api.get(`/api/usuarios`)
        .then(r => setUsuarios(r.data))
        .catch(() => setError("Error al cargar usuarios"))
        .finally(() => setLoading(false));
  };

  useEffect(() => { cargar(); }, []);

  const filtrados = usuarios.filter(u =>
      u.username?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.correo?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.roles?.some(r => r.toLowerCase().includes(busqueda.toLowerCase()))
  );

  const handleCrear = async (e) => {
    e.preventDefault();
    if (form.roles.length === 0) { setError("Selecciona al menos un rol"); return; }
    setSaving(true); setError("");
    try {
      await api.post(`/api/usuarios`, {
        ...form,
        roles: form.roles.map(Number),
      });
      setSuccess("Usuario creado. Se enviaron las credenciales al correo.");
      setShowModal(false);
      setForm({ nombres: "", apellidos: "", correo: "", roles: [] });
      cargar();
    } catch (e) {
      setError(e.response?.data?.message || "Error al crear usuario");
    } finally {
      setSaving(false);
    }
  };

  const handleEditar = async (e) => {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      await api.put(`/api/usuarios/${usuarioEdit.idUsuario}`, {
        correo: usuarioEdit.correo,
        roles: usuarioEdit.roles.map(r => {
          const found = ROLES.find(x => x.nombre === r);
          return found ? found.id : null;
        }).filter(Boolean),
      });
      setSuccess("Usuario actualizado correctamente.");
      setShowEditModal(false);
      cargar();
    } catch (e) {
      setError(e.response?.data?.message || "Error al actualizar");
    } finally {
      setSaving(false);
    }
  };

  const handleEstado = async (id, estado) => {
    try {
      await axios.patch(`${API}/usuarios/${id}/estado?estado=${estado}`, {});
      setSuccess(`Usuario ${estado === "ACTIVO" ? "activado" : "desactivado"} correctamente.`);
      cargar();
    } catch { setError("Error al cambiar estado"); }
    setShowConfirm(null);
  };

  const handleReset = async (id) => {
    try {
      await axios.patch(`${API}/usuarios/${id}/reset-password`, {});
      setSuccess("Contraseña reseteada. Se envió al correo del usuario.");
      cargar();
    } catch { setError("Error al resetear contraseña"); }
    setShowConfirm(null);
  };

  const handleEliminar = async (id) => {
    try {
      await api.delete(`/api/usuarios/${id}`);
      setSuccess("Usuario eliminado correctamente.");
      cargar();
    } catch { setError("No se puede eliminar este usuario."); }
    setShowConfirm(null);
  };

  const toggleRol = (id) => {
    setForm(f => ({
      ...f,
      roles: f.roles.includes(id) ? f.roles.filter(r => r !== id) : [...f.roles, id],
    }));
  };

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t); }
  }, [success]);

  const modalBg = { backgroundColor: "rgba(36, 58, 118, 0.5)" };

  const handleSeccion = (id) => {
    setSeccion(id);
    if (id === "nuevo") { setShowModal(true); setError(""); }
  };

  return (
      <Layout
        breadcrumb={["Inicio", "Usuarios"]}
        sidebarTitle="Usuarios"
        menuItems={menuItems}
        seccion={seccion}
        onSeccionChange={handleSeccion}
      >

        {/* Alertas */}
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

        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-700">Usuarios</h1>
            <p className="text-xs text-slate-400">{filtrados.length} usuario{filtrados.length !== 1 ? "s" : ""} encontrado{filtrados.length !== 1 ? "s" : ""}</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                  type="text"
                  placeholder="Buscar usuario..."
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
              Nuevo usuario
            </button>
          </div>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? (
              <div className="p-12 text-center text-slate-400 text-sm">Cargando usuarios...</div>
          ) : filtrados.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-sm">No se encontraron usuarios</div>
          ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                  <tr style={{ backgroundColor: PRIMARY }} className="text-white text-xs">
                    <th className="text-left px-4 py-3 font-semibold">#</th>
                    <th className="text-left px-4 py-3 font-semibold">Usuario</th>
                    <th className="text-left px-4 py-3 font-semibold">Correo</th>
                    <th className="text-left px-4 py-3 font-semibold">Roles</th>
                    <th className="text-left px-4 py-3 font-semibold">Estado</th>
                    <th className="text-left px-4 py-3 font-semibold">Primer ingreso</th>
                    <th className="text-center px-4 py-3 font-semibold">Acciones</th>
                  </tr>
                  </thead>
                  <tbody>
                  {filtrados.map((u, i) => (
                      <tr key={u.idUsuario} className={`border-t border-slate-100 hover:bg-slate-50 transition ${i % 2 === 0 ? "" : "bg-slate-50/50"}`}>
                        <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div style={{ backgroundColor: PRIMARY }} className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold uppercase flex-shrink-0">
                              {u.username?.charAt(0)}
                            </div>
                            <span className="font-medium text-slate-700">{u.username}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-500">{u.correo}</td>
                        <td className="px-4 py-3">
                          <div className="flex flex-wrap gap-1">
                            {u.roles?.map(r => (
                                <span key={r} className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                            {r.replace("_", " ")}
                          </span>
                            ))}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoBadge(u.estado)}`}>
                        {u.estado}
                      </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {u.primerIngreso ? (
                              <span className="text-xs px-2 py-1 rounded-full bg-amber-100 text-amber-700 font-medium">Pendiente</span>
                          ) : (
                              <span className="text-xs px-2 py-1 rounded-full bg-green-100 text-green-700 font-medium">Completo</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-1">
                            {/* Editar */}
                            <button
                                onClick={() => { setUsuarioEdit({ ...u, roles: [...u.roles] }); setShowEditModal(true); setError(""); }}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                                title="Editar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                              </svg>
                            </button>
                            {/* Reset password */}
                            <button
                                onClick={() => setShowConfirm({ tipo: "reset", id: u.idUsuario, nombre: u.username })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-amber-600 hover:bg-amber-50 transition"
                                title="Resetear contraseña"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                              </svg>
                            </button>
                            {/* Activar/Desactivar */}
                            {u.estado === "ACTIVO" ? (
                                <button
                                    onClick={() => setShowConfirm({ tipo: "desactivar", id: u.idUsuario, nombre: u.username })}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition"
                                    title="Desactivar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                  </svg>
                                </button>
                            ) : (
                                <button
                                    onClick={() => setShowConfirm({ tipo: "activar", id: u.idUsuario, nombre: u.username })}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition"
                                    title="Activar"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                  </svg>
                                </button>
                            )}
                            {/* Eliminar */}
                            <button
                                onClick={() => setShowConfirm({ tipo: "eliminar", id: u.idUsuario, nombre: u.username })}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition"
                                title="Eliminar"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
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
                  <h2 className="text-white font-bold text-base">Nuevo Usuario</h2>
                  <button onClick={() => { setShowModal(false); setError(""); }} className="text-white text-opacity-70 hover:text-opacity-100">✕</button>
                </div>
                <form onSubmit={handleCrear} className="p-6 space-y-4">
                  {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{error}</div>}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Nombres</label>
                      <input
                          type="text"
                          value={form.nombres}
                          onChange={e => setForm({ ...form, nombres: e.target.value })}
                          placeholder="Ej: María José"
                          required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Apellidos</label>
                      <input
                          type="text"
                          value={form.apellidos}
                          onChange={e => setForm({ ...form, apellidos: e.target.value })}
                          placeholder="Ej: Rodríguez Pérez"
                          required
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Correo electrónico</label>
                    <input
                        type="email"
                        value={form.correo}
                        onChange={e => setForm({ ...form, correo: e.target.value })}
                        placeholder="correo@ejemplo.com"
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                    />
                    <p className="text-xs text-slate-400 mt-1">Las credenciales se enviarán a este correo.</p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Roles</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map(r => (
                          <label key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-sm ${form.roles.includes(r.id) ? "border-[#243A76] bg-blue-50 text-[#243A76] font-medium" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                            <input type="checkbox" checked={form.roles.includes(r.id)} onChange={() => toggleRol(r.id)} className="hidden" />
                            {form.roles.includes(r.id) ? (
                                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                            ) : (
                                <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                            )}
                            {r.nombre.replace("_", " ")}
                          </label>
                      ))}
                    </div>
                  </div>

                  <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    <p className="text-xs text-blue-600">
                      <strong>Usuario generado automáticamente</strong> a partir del nombre y apellido.<br />
                      La contraseña será aleatoria y se enviará al correo indicado.
                    </p>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => { setShowModal(false); setError(""); }} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                      Cancelar
                    </button>
                    <button type="submit" disabled={saving} style={{ backgroundColor: PRIMARY }} className="flex-1 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60">
                      {saving ? "Creando..." : "Crear usuario"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
        )}

        {/* MODAL EDITAR */}
        {showEditModal && usuarioEdit && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalBg}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                <div style={{ backgroundColor: PRIMARY }} className="px-6 py-4 flex items-center justify-between">
                  <h2 className="text-white font-bold text-base">Editar — {usuarioEdit.username}</h2>
                  <button onClick={() => setShowEditModal(false)} className="text-white text-opacity-70 hover:text-opacity-100">✕</button>
                </div>
                <form onSubmit={handleEditar} className="p-6 space-y-4">
                  {error && <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{error}</div>}

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Correo electrónico</label>
                    <input
                        type="email"
                        value={usuarioEdit.correo}
                        onChange={e => setUsuarioEdit({ ...usuarioEdit, correo: e.target.value })}
                        required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wide">Roles</label>
                    <div className="grid grid-cols-2 gap-2">
                      {ROLES.map(r => {
                        const activo = usuarioEdit.roles.includes(r.nombre);
                        return (
                            <label key={r.id} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-sm ${activo ? "border-[#243A76] bg-blue-50 text-[#243A76] font-medium" : "border-slate-200 text-slate-600 hover:border-slate-300"}`}>
                              <input
                                  type="checkbox"
                                  checked={activo}
                                  onChange={() => {
                                    const roles = activo
                                        ? usuarioEdit.roles.filter(x => x !== r.nombre)
                                        : [...usuarioEdit.roles, r.nombre];
                                    setUsuarioEdit({ ...usuarioEdit, roles });
                                  }}
                                  className="hidden"
                              />
                              {activo ? (
                                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                              ) : (
                                  <span className="w-4 h-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                              )}
                              {r.nombre.replace("_", " ")}
                            </label>
                        );
                      })}
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

        {/* MODAL CONFIRMACIÓN */}
        {showConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalBg}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
                <div className={`px-6 py-4 ${
                    showConfirm.tipo === "eliminar" ? "bg-red-600" :
                        showConfirm.tipo === "reset" ? "bg-amber-500" :
                            showConfirm.tipo === "desactivar" ? "bg-orange-500" : "bg-green-500"
                }`}>
                  <h2 className="text-white font-bold text-base">
                    {showConfirm.tipo === "eliminar" ? "Eliminar usuario" :
                        showConfirm.tipo === "reset" ? "Resetear contraseña" :
                            showConfirm.tipo === "desactivar" ? "Desactivar usuario" : "Activar usuario"}
                  </h2>
                </div>
                <div className="p-6">
                  <p className="text-slate-600 text-sm">
                    {showConfirm.tipo === "eliminar"
                        ? `¿Eliminar permanentemente al usuario "${showConfirm.nombre}"? Esta acción no se puede deshacer.`
                        : showConfirm.tipo === "reset"
                            ? `¿Resetear la contraseña de "${showConfirm.nombre}"? Se enviará una nueva al correo.`
                            : showConfirm.tipo === "desactivar"
                                ? `¿Desactivar al usuario "${showConfirm.nombre}"? No podrá ingresar al sistema.`
                                : `¿Activar al usuario "${showConfirm.nombre}"?`}
                  </p>
                  <div className="flex gap-3 mt-5">
                    <button onClick={() => setShowConfirm(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                      Cancelar
                    </button>
                    <button
                        onClick={() => {
                          if (showConfirm.tipo === "eliminar") handleEliminar(showConfirm.id);
                          else if (showConfirm.tipo === "reset") handleReset(showConfirm.id);
                          else if (showConfirm.tipo === "desactivar") handleEstado(showConfirm.id, "INACTIVO");
                          else handleEstado(showConfirm.id, "ACTIVO");
                        }}
                        className={`flex-1 py-2 text-white rounded-lg text-sm font-medium transition ${
                            showConfirm.tipo === "eliminar" ? "bg-red-600 hover:bg-red-700" :
                                showConfirm.tipo === "reset" ? "bg-amber-500 hover:bg-amber-600" :
                                    showConfirm.tipo === "desactivar" ? "bg-orange-500 hover:bg-orange-600" :
                                        "bg-green-500 hover:bg-green-600"
                        }`}
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
