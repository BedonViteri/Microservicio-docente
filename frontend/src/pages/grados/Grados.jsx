import { useState, useEffect } from "react";
import api from "../../config/axios";
import Layout from "../../components/Layout";


const PRIMARY = "#243A76";
const modalBg = { backgroundColor: "rgba(36, 58, 118, 0.5)" };

const NIVELES_CONFIG = {
  Inicial:             { accent: "#c4956a", accentLight: "#faf5ef", accentMid: "#e8d5c0", textAccent: "#8b6842" },
  Preparatoria:        { accent: "#7c8a6e", accentLight: "#f3f6ef", accentMid: "#d4ddc8", textAccent: "#5a6b48" },
  "Básica Elemental":  { accent: "#6a8a9a", accentLight: "#eef4f7", accentMid: "#c5d9e2", textAccent: "#446778" },
  "Básica Media":      { accent: "#6e7499", accentLight: "#f0f1f7", accentMid: "#c8cce0", textAccent: "#4a4f78" },
  "Básica Superior":   { accent: "#243A76", accentLight: "#eef0f7", accentMid: "#c0c8e0", textAccent: "#1a2d5f" },
};

const nivelConfig = (nivel) => NIVELES_CONFIG[nivel] || { accent: "#64748b", accentLight: "#f1f5f9", accentMid: "#cbd5e1", textAccent: "#475569" };

const menuItems = [
  { id: "cursos", label: "Cursos", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg> },
  { id: "nuevo", label: "Nuevo grado", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> },
];

const PAGE_SIZE = 10;

export default function Grados() {
  const [grados, setGrados] = useState([]);
  const [loading, setLoading] = useState(true);
  const [seccion, setSeccion] = useState("cursos");
  const [gradoSel, setGradoSel] = useState(null);
  const [showCrearParalelo, setShowCrearParalelo] = useState(false);
  const [nuevaLetra, setNuevaLetra] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const [paraleloSel, setParaleloSel] = useState(null);
  const [estudiantesParalelo, setEstudiantesParalelo] = useState([]);
  const [loadingEstudiantes, setLoadingEstudiantes] = useState(false);
  const [anoLectivoActual, setAnoLectivoActual] = useState(null);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);

  
  

  const cargar = () => {
    setLoading(true);
    api.get(`/api/grados`)
      .then(r => setGrados(r.data))
      .catch(() => setError("Error al cargar grados"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    cargar();
    api.get(`/api/anos-lectivos/actual`)
      .then(r => setAnoLectivoActual(r.data))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t); }
  }, [success]);

  const handleSeccion = (id) => {
    setSeccion(id);
    if (id === "nuevo") { setShowModal(true); setError(""); }
    if (id === "cursos") { setGradoSel(null); setParaleloSel(null); }
  };

  const nivelesAgrupados = {};
  grados.forEach(g => {
    const nivel = g.nivelEducativo || "Sin nivel";
    if (!nivelesAgrupados[nivel]) nivelesAgrupados[nivel] = [];
    nivelesAgrupados[nivel].push(g);
  });

  const crearParalelo = async () => {
    if (!nuevaLetra.trim()) return;
    setSaving(true);
    try {
      await api.post(`/api/grados/${gradoSel.idGrado}/paralelos?letra=${nuevaLetra.trim().toUpperCase()}`, {});
      setSuccess(`Paralelo ${nuevaLetra.toUpperCase()} creado`);
      setShowCrearParalelo(false);
      setNuevaLetra("");
      cargar();
      const updated = (await api.get(`/api/grados/${gradoSel.idGrado}`)).data;
      setGradoSel(updated);
    } catch (e) {
      setError(e.response?.data?.message || "Error al crear paralelo");
    } finally { setSaving(false); }
  };

  const verEstudiantes = async (paralelo, grado) => {
    if (!anoLectivoActual) {
      setError("No hay un año lectivo activo configurado");
      return;
    }
    setParaleloSel({ ...paralelo, gradoNombre: grado.nombre, nivelEducativo: grado.nivelEducativo });
    setLoadingEstudiantes(true);
    setBusqueda("");
    setPagina(1);
    try {
      const r = await api.get(`/api/estudiantes/por-grado`, {
        headers: H,
        params: { idGrado: grado.idGrado, idAnoLectivo: anoLectivoActual.idAnoLectivo, idParalelo: paralelo.idParalelo }
      });
      setEstudiantesParalelo(r.data);
    } catch {
      setError("Error al cargar estudiantes");
      setEstudiantesParalelo([]);
    } finally { setLoadingEstudiantes(false); }
  };

  const filtrados = estudiantesParalelo
    .filter(e => `${e.nombres} ${e.apellidos} ${e.cedula || ""} ${e.codigoEstudiante || ""}`.toLowerCase().includes(busqueda.toLowerCase()))
    .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`));
  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaReal = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaReal - 1) * PAGE_SIZE, paginaReal * PAGE_SIZE);

  return (
    <Layout
      breadcrumb={
        paraleloSel
          ? ["Inicio", "Grados", gradoSel?.nombre || "", `Paralelo ${paraleloSel.letra}`]
          : gradoSel
            ? ["Inicio", "Grados", gradoSel.nombre]
            : ["Inicio", "Grados"]
      }
      sidebarTitle="Grados"
      menuItems={menuItems}
      seccion={seccion}
      onSeccionChange={handleSeccion}
    >
      {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex justify-between"><span className="text-red-600 text-sm">{error}</span><button onClick={() => setError("")} className="text-red-400 ml-4">✕</button></div>}
      {success && <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex justify-between"><span className="text-green-600 text-sm">{success}</span><button onClick={() => setSuccess("")} className="text-green-400 ml-4">✕</button></div>}

      {loading ? (
        <div className="p-12 text-center text-slate-400 text-sm">Cargando grados...</div>
      ) : paraleloSel ? (
        /* ── VISTA ESTUDIANTES DEL PARALELO ── */
        <div>
          <button
            onClick={() => { setParaleloSel(null); setEstudiantesParalelo([]); setBusqueda(""); setPagina(1); }}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver a paralelos
          </button>

          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-700">{paraleloSel.gradoNombre} "{paraleloSel.letra}"</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {paraleloSel.nivelEducativo} — {filtrados.length} estudiante{filtrados.length !== 1 ? "s" : ""} matriculado{filtrados.length !== 1 ? "s" : ""}
                {anoLectivoActual && ` — ${anoLectivoActual.nombre}`}
              </p>
            </div>
          </div>

          <div className="mb-4">
            <input
              type="text"
              placeholder="Buscar estudiante..."
              value={busqueda}
              onChange={e => { setBusqueda(e.target.value); setPagina(1); }}
              className="w-full max-w-md px-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-white"
            />
          </div>

          {loadingEstudiantes ? (
            <div className="p-12 text-center text-slate-400 text-sm">Cargando estudiantes...</div>
          ) : filtrados.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
              {busqueda ? "No se encontraron estudiantes con esa búsqueda." : "No hay estudiantes matriculados en este paralelo."}
            </div>
          ) : (
            <>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100" style={{ backgroundColor: "#f8f9fc" }}>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estudiante</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Cédula</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Código</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Representante</th>
                      <th className="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginados.map((e, i) => (
                      <tr key={e.idEstudiante} className="border-b border-slate-50 hover:bg-slate-50 transition">
                        <td className="px-4 py-3 text-slate-400 text-xs">{(paginaReal - 1) * PAGE_SIZE + i + 1}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: PRIMARY }}>
                              {e.nombres?.[0]}{e.apellidos?.[0]}
                            </div>
                            <div>
                              <p className="font-medium text-slate-700">{e.apellidos} {e.nombres}</p>
                              {e.correo && <p className="text-xs text-slate-400">{e.correo}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-slate-600">{e.cedula || "—"}</td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-xs">{e.codigoEstudiante || "—"}</td>
                        <td className="px-4 py-3 text-slate-600">{e.representante || "—"}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${e.estado === "ACTIVO" ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                            {e.estado}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {totalPaginas > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <p className="text-xs text-slate-400">
                    Mostrando {(paginaReal - 1) * PAGE_SIZE + 1}–{Math.min(paginaReal * PAGE_SIZE, filtrados.length)} de {filtrados.length}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setPagina(p => Math.max(1, p - 1))} disabled={paginaReal === 1}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition">
                      Anterior
                    </button>
                    {Array.from({ length: totalPaginas }, (_, i) => i + 1)
                      .filter(p => p === 1 || p === totalPaginas || Math.abs(p - paginaReal) <= 1)
                      .map((p, idx, arr) => (
                        <span key={p}>
                          {idx > 0 && arr[idx - 1] < p - 1 && <span className="px-1 text-slate-300">...</span>}
                          <button onClick={() => setPagina(p)}
                            className={`px-3 py-1.5 text-xs rounded-lg transition ${p === paginaReal ? "text-white" : "border border-slate-200 hover:bg-slate-50"}`}
                            style={p === paginaReal ? { backgroundColor: PRIMARY } : {}}>
                            {p}
                          </button>
                        </span>
                      ))}
                    <button onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))} disabled={paginaReal === totalPaginas}
                      className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-40 transition">
                      Siguiente
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      ) : !gradoSel ? (
        /* ── VISTA PRINCIPAL: Tarjetas grandes agrupadas por nivel ── */
        <div>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-700">Grados y Cursos</h1>
              <p className="text-sm text-slate-400 mt-0.5">{grados.length} grados configurados — Escuela "Provincias Unidas"</p>
            </div>
          </div>

          {Object.entries(nivelesAgrupados).map(([nivel, gradosNivel]) => {
            const c = nivelConfig(nivel);
            return (
              <div key={nivel} className="mb-8">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-1.5 h-7 rounded-full" style={{ backgroundColor: c.accent }} />
                  <h2 className="text-base font-bold uppercase tracking-wide" style={{ color: c.textAccent }}>{nivel}</h2>
                  <span className="text-sm text-slate-400 ml-1">({gradosNivel.length} grado{gradosNivel.length !== 1 ? "s" : ""})</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {gradosNivel.map(g => (
                    <GradoCard key={g.idGrado} grado={g} config={c} onClick={() => setGradoSel(g)} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* ── VISTA DETALLE: Paralelos del grado seleccionado ── */
        <div>
          <button
            onClick={() => setGradoSel(null)}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 mb-4 transition"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
            Volver a grados
          </button>

          <div className="flex items-center justify-between mb-5">
            <div>
              <h1 className="text-xl font-bold text-slate-700">{gradoSel.nombre}</h1>
              <p className="text-sm text-slate-400 mt-0.5">
                {gradoSel.nivelEducativo} — {gradoSel.tipoEscala === "CUALITATIVA" ? "Escala cualitativa" : "Escala cuantitativa"} — Capacidad máx: {gradoSel.capacidadMax || 35} alumnos
              </p>
            </div>
            <button
              onClick={() => { setShowCrearParalelo(true); setNuevaLetra(""); setError(""); }}
              style={{ backgroundColor: PRIMARY }}
              className="flex items-center gap-2 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:opacity-90 transition shadow-sm"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Nuevo paralelo
            </button>
          </div>

          {(!gradoSel.paralelos || gradoSel.paralelos.length === 0) ? (
            <div className="p-12 text-center text-slate-400 text-sm bg-white rounded-xl border border-slate-200">
              No hay paralelos configurados para este grado.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {gradoSel.paralelos.map(p => {
                const c = nivelConfig(gradoSel.nivelEducativo);
                return (
                  <ParaleloCard key={p.idParalelo} paralelo={p} grado={gradoSel} config={c} onVerEstudiantes={() => verEstudiantes(p, gradoSel)} />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* MODAL CREAR PARALELO */}
      {showCrearParalelo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
            <div style={{ backgroundColor: PRIMARY }} className="px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">Nuevo Paralelo — {gradoSel.nombre}</h2>
              <button onClick={() => setShowCrearParalelo(false)} className="text-white text-opacity-70 hover:text-opacity-100">✕</button>
            </div>
            <div className="p-6">
              {error && <div className="mb-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{error}</div>}
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Letra del paralelo</label>
              <input
                type="text"
                maxLength={1}
                value={nuevaLetra}
                onChange={e => setNuevaLetra(e.target.value.toUpperCase())}
                placeholder="Ej: D"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50 text-center text-2xl font-bold uppercase"
                style={{ color: PRIMARY }}
              />
              <div className="flex gap-3 mt-5">
                <button onClick={() => setShowCrearParalelo(false)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button
                  onClick={crearParalelo}
                  disabled={!nuevaLetra.trim() || saving}
                  style={{ backgroundColor: PRIMARY }}
                  className="flex-1 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60"
                >
                  {saving ? "Creando..." : "Crear paralelo"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL CREAR GRADO */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalBg}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div style={{ backgroundColor: PRIMARY }} className="px-6 py-4 flex items-center justify-between">
              <h2 className="text-white font-bold text-base">Nuevo Grado</h2>
              <button onClick={() => { setShowModal(false); setSeccion("cursos"); }} className="text-white text-opacity-70 hover:text-opacity-100">✕</button>
            </div>
            <GradoForm
              onCancel={() => { setShowModal(false); setSeccion("cursos"); }}
              onSuccess={(msg) => { setShowModal(false); setSeccion("cursos"); setSuccess(msg); cargar(); }}
              onError={setError}
              headers={H}
            />
          </div>
        </div>
      )}
    </Layout>
  );
}

/* ── TARJETA DE GRADO — diseño con borde lateral y fondo claro ── */
function GradoCard({ grado, config, onClick }) {
  const totalParalelos = grado.paralelos?.length || 0;
  const paralelosActivos = grado.paralelos?.filter(p => p.activo).length || 0;

  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all cursor-pointer group"
      style={{ border: `1px solid ${config.accentMid}`, borderLeft: `5px solid ${config.accent}` }}
    >
      {/* Cabecera */}
      <div className="px-5 pt-5 pb-4" style={{ backgroundColor: config.accentLight }}>
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3.5">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
              style={{ backgroundColor: config.accent }}>
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-[15px] leading-snug text-slate-800">{grado.nombre}</h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: config.accentMid, color: config.textAccent }}>
                  {grado.nivelEducativo}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${grado.activo ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                  {grado.activo ? "Activo" : "Inactivo"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="px-5 py-4 flex items-center divide-x divide-slate-100">
        <div className="flex-1 text-center pr-3">
          <p className="text-2xl font-bold" style={{ color: config.accent }}>{totalParalelos}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Paralelos</p>
        </div>
        <div className="flex-1 text-center px-3">
          <p className="text-2xl font-bold" style={{ color: config.accent }}>{paralelosActivos}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Activos</p>
        </div>
        <div className="flex-1 text-center pl-3">
          <p className="text-2xl font-bold" style={{ color: config.accent }}>{grado.capacidadMax || 35}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Cap. Máx</p>
        </div>
      </div>

      {/* Detalles */}
      <div className="px-5 pb-3 flex items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
          {grado.tipoEscala === "CUALITATIVA" ? "Cualitativa" : "Cuantitativa"}
        </span>
        <span className="flex items-center gap-1">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" /></svg>
          Orden {grado.orden}
        </span>
      </div>

      {/* Acciones */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${config.accentMid}` }}>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400" title="Estudiantes" onClick={e => e.stopPropagation()}>
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400" title="Configurar" onClick={e => e.stopPropagation()}>
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400" title="Horario" onClick={e => e.stopPropagation()}>
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
        </div>
        <button
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition shadow-sm"
          style={{ backgroundColor: config.accent }}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          Ver paralelos
        </button>
      </div>
    </div>
  );
}

/* ── TARJETA DE PARALELO — mismo diseño adaptado ── */
function ParaleloCard({ paralelo, grado, config, onVerEstudiantes }) {
  return (
    <div
      className="bg-white rounded-2xl overflow-hidden hover:shadow-lg transition-all"
      style={{ border: `1px solid ${config.accentMid}`, borderLeft: `5px solid ${config.accent}` }}
    >
      {/* Cabecera */}
      <div className="px-5 pt-5 pb-4" style={{ backgroundColor: config.accentLight }}>
        <div className="flex items-start gap-3.5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm"
            style={{ backgroundColor: config.accent }}>
            <span className="text-white text-xl font-bold">{paralelo.letra}</span>
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-[15px] leading-snug text-slate-800">{grado.nombre} "{paralelo.letra}"</h3>
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md" style={{ backgroundColor: config.accentMid, color: config.textAccent }}>
                {grado.nivelEducativo}
              </span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${paralelo.activo ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-500"}`}>
                {paralelo.activo ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="px-5 py-4 flex items-center divide-x divide-slate-100">
        <div className="flex-1 text-center pr-3">
          <p className="text-2xl font-bold" style={{ color: config.accent }}>{paralelo.totalEstudiantes ?? 0}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Estudiantes</p>
        </div>
        <div className="flex-1 text-center px-3">
          <p className="text-2xl font-bold" style={{ color: config.accent }}>{grado.capacidadMax || 35}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Capacidad</p>
        </div>
        <div className="flex-1 text-center pl-3">
          <p className="text-2xl font-bold" style={{ color: config.accent }}>{grado.tipoEscala === "CUALITATIVA" ? "C" : "N"}</p>
          <p className="text-[10px] text-slate-400 font-semibold uppercase mt-0.5">Escala</p>
        </div>
      </div>

      {/* Info tutor */}
      <div className="px-5 pb-3 flex items-center gap-2 text-xs text-slate-400">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
        Tutor: Sin asignar
      </div>

      {/* Acciones */}
      <div className="px-5 py-3 flex items-center justify-between" style={{ borderTop: `1px solid ${config.accentMid}` }}>
        <div className="flex items-center gap-1">
          <button className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400" title="Estudiantes" onClick={onVerEstudiantes}>
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400" title="Asignaturas">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </button>
          <button className="p-2 rounded-lg hover:bg-slate-100 transition text-slate-400" title="Horario">
            <svg className="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
          </button>
        </div>
        <button
          className="flex items-center gap-2 text-white text-sm font-medium px-4 py-2 rounded-lg hover:opacity-90 transition shadow-sm"
          style={{ backgroundColor: config.accent }}
          onClick={onVerEstudiantes}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          Ver detalle
        </button>
      </div>
    </div>
  );
}

function GradoForm({ onCancel, onSuccess, onError, headers }) {
  const [nombre, setNombre] = useState("");
  const [orden, setOrden] = useState("");
  const [capacidad, setCapacidad] = useState("35");
  const [idNivel, setIdNivel] = useState("");
  const [niveles, setNiveles] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get(`/api/grados`, { headers }).then(r => {
      const seen = new Set();
      const nivs = [];
      r.data.forEach(g => {
        if (g.idNivel && !seen.has(g.idNivel)) {
          seen.add(g.idNivel);
          nivs.push({ id: g.idNivel, nombre: g.nivelEducativo });
        }
      });
      setNiveles(nivs);
    });
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true); onError("");
    try {
      await api.post(`/api/grados`, {
        nombre,
        orden: Number(orden),
        capacidadMax: Number(capacidad),
        idNivel: idNivel ? Number(idNivel) : null,
      }, { headers });
      onSuccess("Grado creado correctamente");
    } catch (err) {
      onError(err.response?.data?.message || "Error al crear grado");
    } finally { setSaving(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Nombre del grado</label>
        <input type="text" value={nombre} onChange={e => setNombre(e.target.value)} required placeholder="Ej: Quinto año EGB"
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Orden</label>
          <input type="number" value={orden} onChange={e => setOrden(e.target.value)} required placeholder="1"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Capacidad máx.</label>
          <input type="number" value={capacidad} onChange={e => setCapacidad(e.target.value)} placeholder="35"
            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50" />
        </div>
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">Nivel educativo</label>
        <select value={idNivel} onChange={e => setIdNivel(e.target.value)}
          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none bg-slate-50">
          <option value="">Seleccionar nivel</option>
          {niveles.map(n => <option key={n.id} value={n.id}>{n.nombre}</option>)}
        </select>
      </div>
      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
          Cancelar
        </button>
        <button type="submit" disabled={saving} style={{ backgroundColor: PRIMARY }}
          className="flex-1 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-60">
          {saving ? "Creando..." : "Crear grado"}
        </button>
      </div>
    </form>
  );
}

