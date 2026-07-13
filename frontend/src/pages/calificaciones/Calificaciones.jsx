import { useState, useEffect } from "react";
import api from "../../config/axios";
import Layout from "../../components/Layout";
const PRIMARY = "#243A76";
const modalBg = { backgroundColor: "rgba(36, 58, 118, 0.5)" };

const COLORES = [
  { bg: "bg-blue-50",   icon: "text-blue-500",   border: "#3b82f6" },
  { bg: "bg-green-50",  icon: "text-green-500",  border: "#22c55e" },
  { bg: "bg-purple-50", icon: "text-purple-500", border: "#a855f7" },
  { bg: "bg-amber-50",  icon: "text-amber-500",  border: "#f59e0b" },
  { bg: "bg-rose-50",   icon: "text-rose-500",   border: "#f43f5e" },
  { bg: "bg-teal-50",   icon: "text-teal-500",   border: "#14b8a6" },
  { bg: "bg-indigo-50", icon: "text-indigo-500", border: "#6366f1" },
  { bg: "bg-pink-50",   icon: "text-pink-500",   border: "#ec4899" },
];

const IconLibro = ({ className }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
  </svg>
);

const IconBack = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
  </svg>
);

const calMenuItems = [
  { id: "cursos", label: "Cursos / Asignaturas", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg> },
];

export default function Calificaciones() {
  const [asignaciones, setAsignaciones]   = useState([]);
  const [matriculas, setMatriculas]       = useState([]);
  const [calificaciones, setCalificaciones] = useState(null);
  const [vista, setVista]                 = useState("cursos");   // cursos | estudiantes | notas
  const [asignacionSel, setAsignacionSel] = useState(null);
  const [estudianteSel, setEstudianteSel] = useState(null);
  const [trimestre, setTrimestre]         = useState(1);
  const [busqueda, setBusqueda]           = useState("");
  const [loading, setLoading]             = useState(false);
  const [anoActual, setAnoActual]         = useState(null);


  useEffect(() => {
    api.get(`/api/anos-lectivos/actual`)
      .then(r => {
        setAnoActual(r.data);
        cargarAsignaciones(r.data.idAnoLectivo);
      })
      .catch(() => cargarAsignaciones(null));
  }, []);

  const cargarAsignaciones = (idAno) => {
    setLoading(true);
    const url = idAno
      ? `/api/asignaciones/ano-lectivo/${idAno}`
      : `/api/asignaciones`;
    api.get(url)
      .then(r => setAsignaciones(r.data.filter(a => a.activo)))
      .finally(() => setLoading(false));
  };

  const verEstudiantes = (asignacion) => {
    setAsignacionSel(asignacion);
    setLoading(true);
    setVista("estudiantes");
    setBusqueda("");
    api.get(`/api/matriculas`)
      .then(r => setMatriculas(r.data))
      .finally(() => setLoading(false));
  };

  const verCalificaciones = (matricula) => {
    setEstudianteSel(matricula);
    setLoading(true);
    setVista("notas");
    api.get(`/api/calificaciones/matricula/${matricula.idMatricula}/trimestre/${trimestre}`)
      .then(r => setCalificaciones(r.data))
      .finally(() => setLoading(false));
  };

  const cambiarTrimestre = (t) => {
    setTrimestre(t);
    setLoading(true);
    api.get(`/api/calificaciones/matricula/${estudianteSel.idMatricula}/trimestre/${t}`)
      .then(r => setCalificaciones(r.data))
      .finally(() => setLoading(false));
  };

  const asignacionesFiltradas = asignaciones.filter(a =>
    `${a.asignatura} ${a.grado} ${a.docente}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  const matriculasFiltradas = matriculas.filter(m =>
    `${m.estudiante} ${m.grado}`.toLowerCase().includes(busqueda.toLowerCase())
  );

  // ── VISTA: CURSOS ─────────────────────────────────────────
  if (vista === "cursos") return (
    <Layout breadcrumb={["Inicio", "Calificaciones"]} sidebarTitle="Calificaciones" menuItems={calMenuItems} seccion="cursos" onSeccionChange={(id) => { setVista(id); }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-lg font-bold text-slate-700">Calificaciones</h1>
          <p className="text-xs text-slate-400">
            {anoActual ? `Año lectivo: ${anoActual.nombre}` : "Selecciona un curso para ver calificaciones"}
          </p>
        </div>
        <div className="relative">
          <input type="text" placeholder="Buscar curso, asignatura..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 w-56 focus:outline-none" />
          <svg className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Cargando cursos...</div>
      ) : asignacionesFiltradas.length === 0 ? (
        <div className="text-center py-20 text-slate-400 text-sm">No hay cursos activos</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {asignacionesFiltradas.map((a, i) => {
            const c = COLORES[i % COLORES.length];
            return (
              <button key={a.idAsignacion} onClick={() => verEstudiantes(a)}
                className="bg-white border border-slate-200 rounded-xl p-5 flex flex-col items-center gap-3 hover:shadow-md transition-all group text-center"
                onMouseEnter={e => e.currentTarget.style.borderColor = c.border}
                onMouseLeave={e => e.currentTarget.style.borderColor = ""}>
                <div className={`${c.bg} p-3 rounded-xl ${c.icon}`}>
                  <IconLibro className="w-10 h-10" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-700 group-hover:text-[#243A76] transition">{a.asignatura}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{a.grado}</p>
                  <p className="text-xs text-slate-300 mt-0.5">{a.docente}</p>
                </div>
                {a.esTutor && (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">Tutor</span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </Layout>
  );

  // ── VISTA: ESTUDIANTES DEL CURSO ─────────────────────────
  if (vista === "estudiantes") return (
    <Layout breadcrumb={["Inicio", "Calificaciones", asignacionSel?.asignatura]} sidebarTitle="Calificaciones" menuItems={calMenuItems} seccion="cursos" onSeccionChange={(id) => { setVista(id); }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setVista("cursos"); setBusqueda(""); }}
            style={{ borderColor: PRIMARY, color: PRIMARY }}
            className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-blue-50 transition">
            <IconBack /> Volver
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-700">{asignacionSel?.asignatura}</h1>
            <p className="text-xs text-slate-400">{asignacionSel?.grado} — {asignacionSel?.docente}</p>
          </div>
        </div>
        <div className="relative">
          <input type="text" placeholder="Buscar estudiante..."
            value={busqueda} onChange={e => setBusqueda(e.target.value)}
            className="pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 w-56 focus:outline-none" />
          <svg className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-sm">Cargando estudiantes...</div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: PRIMARY }} className="text-white text-xs">
                {["#", "Estudiante", "Grado", "Estado", "Ver notas"].map(h => (
                  <th key={h} className={`px-4 py-3 font-semibold ${h === "Ver notas" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matriculasFiltradas.map((m, i) => (
                <tr key={m.idMatricula} className={`border-t border-slate-100 hover:bg-slate-50 transition ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                  <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div style={{ backgroundColor: PRIMARY }} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                        {m.estudiante?.charAt(0)}
                      </div>
                      <p className="font-semibold text-slate-700 text-xs">{m.estudiante}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-slate-500">{m.grado || "—"}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium bg-green-100 text-green-700">{m.estado || "ACTIVO"}</span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => verCalificaciones(m)}
                      style={{ backgroundColor: PRIMARY }}
                      className="text-white text-xs px-3 py-1.5 rounded-lg hover:opacity-90 transition font-medium">
                      Ver notas
                    </button>
                  </td>
                </tr>
              ))}
              {matriculasFiltradas.length === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-slate-400 text-sm">Sin estudiantes</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );

  // ── VISTA: CALIFICACIONES DEL ESTUDIANTE (via RPC) ────────
  if (vista === "notas") return (
    <Layout breadcrumb={["Inicio", "Calificaciones", asignacionSel?.asignatura, estudianteSel?.estudiante]} sidebarTitle="Calificaciones" menuItems={calMenuItems} seccion="cursos" onSeccionChange={(id) => { setVista(id); }}>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => { setVista("estudiantes"); setCalificaciones(null); }}
            style={{ borderColor: PRIMARY, color: PRIMARY }}
            className="flex items-center gap-1 px-3 py-1.5 border rounded-lg text-xs font-medium hover:bg-blue-50 transition">
            <IconBack /> Volver
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-700">{estudianteSel?.estudiante}</h1>
            <p className="text-xs text-slate-400">{asignacionSel?.asignatura} — {asignacionSel?.grado}</p>
          </div>
        </div>

        {/* Selector de trimestre */}
        <div className="flex gap-2">
          {[1, 2, 3].map(t => (
            <button key={t} onClick={() => cambiarTrimestre(t)}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold transition"
              style={trimestre === t
                ? { backgroundColor: PRIMARY, color: "white" }
                : { border: `1px solid ${PRIMARY}`, color: PRIMARY }}>
              Trimestre {t}
            </button>
          ))}
        </div>
      </div>

      {/* Tarjetas de promedios */}
      {calificaciones && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          {[
            { label: "Promedio Formativo", valor: calificaciones.promedioFormativo, color: "bg-blue-50 text-blue-700 border-blue-200" },
            { label: "Promedio Sumativo",  valor: calificaciones.promedioSumativo,  color: "bg-purple-50 text-purple-700 border-purple-200" },
            { label: "Promedio Final",     valor: calificaciones.promedioFinal,     color: "bg-green-50 text-green-700 border-green-200" },
          ].map(({ label, valor, color }) => (
            <div key={label} className={`rounded-xl border p-4 text-center ${color}`}>
              <p className="text-xs font-medium opacity-70 mb-1">{label}</p>
              <p className="text-3xl font-bold">{Number(valor || 0).toFixed(2)}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabla de calificaciones */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="text-center py-16 text-slate-400 text-sm">Consultando calificaciones via RPC...</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr style={{ backgroundColor: PRIMARY }} className="text-white text-xs">
                {["#", "Actividad", "Tipo", "Nota", "Trimestre"].map(h => (
                  <th key={h} className={`px-4 py-3 font-semibold ${h === "Nota" ? "text-center" : "text-left"}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {calificaciones?.calificaciones?.length > 0 ? (
                calificaciones.calificaciones.map((c, i) => (
                  <tr key={i} className={`border-t border-slate-100 hover:bg-slate-50 transition ${i % 2 === 0 ? "" : "bg-slate-50/40"}`}>
                    <td className="px-4 py-3 text-slate-400 text-xs">{i + 1}</td>
                    <td className="px-4 py-3 text-xs text-slate-700 font-medium">{c.actividad || `Actividad ${c.idActividad}`}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{c.tipoActividad || "—"}</td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${Number(c.nota) >= 7 ? "bg-green-100 text-green-700" : "bg-red-100 text-red-600"}`}>
                        {Number(c.nota || 0).toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">Trimestre {c.trimestre}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-sm">
                    Sin calificaciones en el Trimestre {trimestre}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Nota informativa RPC */}
      <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
        <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        Datos obtenidos via RPC desde el microservicio sga-docente (puerto 9090)
      </div>
    </Layout>
  );
}
