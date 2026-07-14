import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import {
  getMisAsignaciones,
  getActividades,
  getPeriodos,
  createActividad,
  deleteActividad,
} from "../../services/api";

const PRIMARY = "#243A76";

const TIPOS = ["TAREA", "LECCION", "PROYECTO", "EXAMEN", "FORMATIVA", "SUMATIVA"];

const menuActividades = [
  {
    id: "lista",
    label: "Lista de Actividades",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
      </svg>
    ),
  },
  {
    id: "crear",
    label: "Crear Actividad",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
      </svg>
    ),
  },
];

const formVacio = {
  idAsignacion: "",
  idPeriodo: "",
  tipo: "TAREA",
  nombre: "",
  descripcion: "",
  fechaEntrega: "",
  ponderacion: "0",
  notaMaxima: "10",
  esSumativa: false,
};

export default function Actividades() {
  const [seccion, setSeccion] = useState("lista");
  const [asignaciones, setAsignaciones] = useState([]);
  const [periodos, setPeriodos] = useState([]);
  const [asignacionSel, setAsignacionSel] = useState("");
  const [actividades, setActividades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState(formVacio);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState(null);

  useEffect(() => {
    cargarInicial();
  }, []);

  useEffect(() => {
    if (asignacionSel) cargarActividades(asignacionSel);
    else setActividades([]);
  }, [asignacionSel]);

  const cargarInicial = async () => {
    try {
      const [asigRes, perRes] = await Promise.all([getMisAsignaciones(), getPeriodos()]);
      setAsignaciones(asigRes.data || []);
      setPeriodos(perRes.data || []);
      if (asigRes.data?.length > 0) setAsignacionSel(String(asigRes.data[0].idAsignacion));
    } catch (error) {
      console.error("Error cargando datos iniciales:", error);
    }
  };

  const cargarActividades = async (idAsignacion) => {
    try {
      setLoading(true);
      const res = await getActividades(idAsignacion);
      // El gateway puede devolver un arreglo directo o {actividades:[...]}
      const data = Array.isArray(res.data) ? res.data : (res.data?.actividades || []);
      setActividades(data);
    } catch (error) {
      console.error("Error cargando actividades:", error);
      setActividades([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setMensaje(null);
    try {
      const payload = {
        idAsignacion: parseInt(form.idAsignacion),
        idPeriodo: parseInt(form.idPeriodo),
        tipo: form.tipo,
        nombre: form.nombre,
        descripcion: form.descripcion,
        fechaEntrega: form.fechaEntrega,
        ponderacion: parseFloat(form.ponderacion),
        notaMaxima: parseFloat(form.notaMaxima),
        esSumativa: form.esSumativa,
      };
      await createActividad(payload);
      setMensaje({ tipo: "ok", texto: "Actividad creada correctamente." });
      setForm(formVacio);
      if (String(payload.idAsignacion) === asignacionSel) {
        cargarActividades(asignacionSel);
      }
      setSeccion("lista");
    } catch (error) {
      console.error("Error creando actividad:", error);
      setMensaje({ tipo: "error", texto: "No se pudo crear la actividad. Revise los datos." });
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!confirm("¿Eliminar esta actividad?")) return;
    try {
      await deleteActividad(id);
      cargarActividades(asignacionSel);
    } catch (error) {
      console.error("Error eliminando actividad:", error);
    }
  };

  const nombreAsignacion = (a) =>
    `${a.asignatura?.nombre || "Asignatura"} — ${a.grado?.nombre || ""}`;

  return (
    <Layout
      breadcrumb={["Inicio", "Actividades"]}
      sidebarTitle="ACTIVIDADES"
      menuItems={menuActividades}
      seccion={seccion}
      onSeccionChange={setSeccion}
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-1">Actividades</h1>
      <p className="text-slate-500 mb-6">Gestione las actividades de sus cursos asignados.</p>

      {mensaje && (
        <div className={`mb-4 px-4 py-2 rounded-lg text-sm ${
          mensaje.tipo === "ok" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {mensaje.texto}
        </div>
      )}

      {/* SECCIÓN: LISTA */}
      {seccion === "lista" && (
        <div>
          {/* Selector de curso */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 mb-4">
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
              Curso
            </label>
            <select
              value={asignacionSel}
              onChange={(e) => setAsignacionSel(e.target.value)}
              className="w-full md:w-96 border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50 focus:outline-none"
            >
              {asignaciones.length === 0 && <option value="">Sin asignaciones</option>}
              {asignaciones.map((a) => (
                <option key={a.idAsignacion} value={a.idAsignacion}>
                  {nombreAsignacion(a)}
                </option>
              ))}
            </select>
          </div>

          {/* Tabla */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            {loading ? (
              <p className="text-center text-slate-400 py-10">Cargando actividades...</p>
            ) : actividades.length === 0 ? (
              <p className="text-center text-slate-400 py-10">No hay actividades registradas para este curso.</p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                    <th className="text-left px-4 py-3">Nombre</th>
                    <th className="text-left px-4 py-3">Tipo</th>
                    <th className="text-left px-4 py-3">Entrega</th>
                    <th className="text-center px-4 py-3">Nota Máx.</th>
                    <th className="text-center px-4 py-3">Pond.</th>
                    <th className="text-center px-4 py-3">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {actividades.map((act) => (
                    <tr key={act.idActividad} className="border-t border-slate-100 hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-700">{act.nombre}</td>
                      <td className="px-4 py-3">
                        <span className="bg-blue-50 text-blue-700 text-xs font-semibold px-2 py-1 rounded">
                          {act.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500">{act.fechaEntrega}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{act.notaMaxima}</td>
                      <td className="px-4 py-3 text-center text-slate-600">{act.ponderacion}</td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => handleEliminar(act.idActividad)}
                          className="text-red-500 hover:text-red-700 text-xs font-medium"
                        >
                          Eliminar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* SECCIÓN: CREAR */}
      {seccion === "crear" && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-xl border border-slate-200 max-w-2xl space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Curso</label>
              <select
                required
                value={form.idAsignacion}
                onChange={(e) => setForm({ ...form, idAsignacion: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
              >
                <option value="">Seleccione...</option>
                {asignaciones.map((a) => (
                  <option key={a.idAsignacion} value={a.idAsignacion}>{nombreAsignacion(a)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Período</label>
              <select
                required
                value={form.idPeriodo}
                onChange={(e) => setForm({ ...form, idPeriodo: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
              >
                <option value="">Seleccione...</option>
                {periodos.map((p) => (
                  <option key={p.id_periodo} value={p.id_periodo}>{p.nombre}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Nombre</label>
            <input
              required
              type="text"
              value={form.nombre}
              onChange={(e) => setForm({ ...form, nombre: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
              placeholder="Ej: Tarea 1 - Fracciones"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Descripción</label>
            <textarea
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Tipo</label>
              <select
                value={form.tipo}
                onChange={(e) => setForm({ ...form, tipo: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
              >
                {TIPOS.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Entrega</label>
              <input
                required
                type="date"
                value={form.fechaEntrega}
                onChange={(e) => setForm({ ...form, fechaEntrega: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Nota Máx.</label>
              <input
                type="number"
                step="0.01"
                value={form.notaMaxima}
                onChange={(e) => setForm({ ...form, notaMaxima: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase">Ponderación</label>
              <input
                type="number"
                step="0.01"
                value={form.ponderacion}
                onChange={(e) => setForm({ ...form, ponderacion: e.target.value })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={form.esSumativa}
              onChange={(e) => setForm({ ...form, esSumativa: e.target.checked })}
            />
            Es actividad sumativa
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={guardando}
              style={{ backgroundColor: PRIMARY }}
              className="text-white px-5 py-2 rounded-lg text-sm font-medium hover:opacity-90 disabled:opacity-60"
            >
              {guardando ? "Guardando..." : "Crear Actividad"}
            </button>
            <button
              type="button"
              onClick={() => { setForm(formVacio); setSeccion("lista"); }}
              className="px-5 py-2 rounded-lg text-sm font-medium text-slate-500 hover:bg-slate-100"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}
    </Layout>
  );
}
