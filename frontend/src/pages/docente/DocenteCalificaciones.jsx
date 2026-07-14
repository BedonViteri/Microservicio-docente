import { useState, useEffect } from "react";
import { 
    getEstudiantesPorAsignacion, 
    getActividadesPorAsignacion, 
    getCalificacionesEstudiante,
    registrarCalificacion 
} from "../../services/docente/docenteService";

export default function DocenteCalificaciones({ asignacionActiva }) {
    const [estudiantes, setEstudiantes] = useState([]);
    const [actividades, setActividades] = useState([]);
    const [calificaciones, setCalificaciones] = useState({}); // { [matriculaId]: { [actId]: nota } }
    const [savingCells, setSavingCells] = useState({}); // { [matriculaId-actId]: boolean }
    const [trimestre, setTrimestre] = useState(1);
    const [loading, setLoading] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
    const asignacionId = asignacionActiva?.idAsignacion || "";

    useEffect(() => {
        if (asignacionId) {
            cargarDatos();
        }
    }, [asignacionId, trimestre]);

    const cargarDatos = async () => {
        try {
            setLoading(true);
            setMensaje({ tipo: "", texto: "" });
            
            // 1. Cargar estudiantes de la asignación
            const ests = await getEstudiantesPorAsignacion(asignacionId);
            setEstudiantes(ests);
            
            // 2. Cargar actividades de la asignación
            const allActs = await getActividadesPorAsignacion(asignacionId);
            // Filtrar las del periodo correspondiente al trimestre (periodoId === trimestre)
            const actsFiltradas = allActs.filter(a => a.idPeriodo === trimestre);
            setActividades(actsFiltradas);
            
            // 3. Cargar calificaciones de cada estudiante en paralelo
            const califsMap = {};
            await Promise.all(ests.map(async (est) => {
                try {
                    const data = await getCalificacionesEstudiante(est.idMatricula, trimestre);
                    const cList = data || [];
                    
                    califsMap[est.idMatricula] = {};
                    cList.forEach(c => {
                        califsMap[est.idMatricula][c.idActividad] = c.nota;
                    });
                } catch (err) {
                    console.error("Error al cargar calificaciones del estudiante:", est.idMatricula, err);
                }
            }));
            
            setCalificaciones(califsMap);
        } catch (error) {
            console.error("Error cargando calificaciones:", error);
            setMensaje({ tipo: "error", texto: "No se pudieron cargar los datos de calificaciones." });
        } finally {
            setLoading(false);
        }
    };

    const handleNotaChange = (matriculaId, actId, value) => {
        // Permitir editar el texto del input localmente
        setCalificaciones(prev => ({
            ...prev,
            [matriculaId]: {
                ...prev[matriculaId],
                [actId]: value
            }
        }));
    };

    const handleNotaSave = async (matriculaId, actId, originalValue) => {
        const estCalif = calificaciones[matriculaId] || {};
        const currentValue = estCalif[actId];
        
        // Si el valor no cambió, no guardar
        if (currentValue === originalValue) return;
        
        // Validar que sea un número válido entre 0 y 10, o vacío
        if (currentValue !== "" && currentValue !== undefined && currentValue !== null) {
            const num = parseFloat(currentValue);
            if (isNaN(num) || num < 0 || num > 10) {
                setMensaje({ tipo: "error", texto: "La nota debe ser un número entre 0.00 y 10.00" });
                // Revertir valor
                setCalificaciones(prev => ({
                    ...prev,
                    [matriculaId]: {
                        ...prev[matriculaId],
                        [actId]: originalValue || ""
                    }
                }));
                return;
            }
        } else {
            // No enviar si es vacío (opcional, o podemos enviar 0)
            return;
        }

        const cellKey = `${matriculaId}-${actId}`;
        try {
            setSavingCells(prev => ({ ...prev, [cellKey]: true }));
            setMensaje({ tipo: "", texto: "" });
            
            await registrarCalificacion({
                idMatricula: parseInt(matriculaId),
                idActividad: parseInt(actId),
                nota: parseFloat(currentValue),
                trimestre: parseInt(trimestre)
            });
            
            // Recargar datos suavemente para actualizar promedios reales del backend y sincronía
            // Pero mantenemos el valor local por comodidad
        } catch (error) {
            console.error("Error al registrar calificación:", error);
            setMensaje({ tipo: "error", texto: "No se pudo guardar la calificación." });
            // Revertir valor en caso de error
            setCalificaciones(prev => ({
                ...prev,
                [matriculaId]: {
                    ...prev[matriculaId],
                    [actId]: originalValue || ""
                }
            }));
        } finally {
            setSavingCells(prev => ({ ...prev, [cellKey]: false }));
        }
    };

    // Calcular promedios locales en tiempo real
    const getPromediosEstudiante = (matriculaId) => {
        const estCalif = calificaciones[matriculaId] || {};
        
        const formativas = [];
        const sumativas = [];
        
        actividades.forEach(act => {
            const notaStr = estCalif[act.idActividad];
            if (notaStr !== undefined && notaStr !== "" && notaStr !== null) {
                const nota = parseFloat(notaStr);
                if (!isNaN(nota)) {
                    if (act.esSumativa) {
                        sumativas.push(nota);
                    } else {
                        formativas.push(nota);
                    }
                }
            }
        });
        
        const promFormativo = formativas.length > 0 ? (formativas.reduce((s, v) => s + v, 0) / formativas.length) : 0.0;
        const promSumativo = sumativas.length > 0 ? (sumativas.reduce((s, v) => s + v, 0) / sumativas.length) : 0.0;
        
        let promFinal = 0.0;
        if (sumativas.length > 0) {
            promFinal = (promFormativo * 0.8) + (promSumativo * 0.2);
        } else {
            promFinal = promFormativo;
        }
        
        return {
            formativo: promFormativo,
            sumativo: promSumativo,
            final: promFinal
        };
    };

    return (
        <div>
            {/* Encabezado Simple */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Calificaciones</h1>
                    <p className="text-slate-500 text-sm mt-1">Registre e ingrese las notas del curso para el trimestre seleccionado.</p>
                </div>
                
                {/* Selector de Trimestre */}
                {asignacionId && (
                    <div className="bg-slate-100 p-1 rounded-lg inline-flex text-xs shadow-sm">
                        {[1, 2, 3].map(t => (
                            <button
                                key={t}
                                onClick={() => setTrimestre(t)}
                                className={`px-4 py-1.5 rounded-md font-semibold transition ${trimestre === t ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Trimestre {t}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {/* Banner de Curso Seleccionado */}
            {asignacionActiva ? (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Curso Seleccionado</p>
                        <h2 className="text-base font-bold text-slate-700 mt-0.5">
                            {asignacionActiva.grado?.nombre} — {asignacionActiva.asignatura?.nombre}
                        </h2>
                    </div>
                    <span className="text-xs text-slate-400 font-medium">
                        Periodo Lectivo: {asignacionActiva.anoLectivo?.nombre || "2026-2027"}
                    </span>
                </div>
            ) : (
                <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-xl text-center mb-6">
                    <p className="text-yellow-700 font-medium text-sm">Por favor, seleccione una asignatura desde el Panel Principal para gestionar sus calificaciones.</p>
                </div>
            )}

            {/* Mensajes de feedback */}
            {mensaje.texto && (
                <div className={`mb-6 p-4 rounded-lg text-sm border ${
                    mensaje.tipo === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 
                    mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border-red-200' :
                    'bg-yellow-50 text-yellow-700 border-yellow-200'
                }`}>
                    {mensaje.texto}
                </div>
            )}

            {asignacionId ? (
                loading ? (
                    <div className="text-center py-10 text-slate-500">Cargando planilla de calificaciones...</div>
                ) : (
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-3 font-semibold sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[180px]">Estudiante</th>
                                        
                                        {/* Columnas de Actividades */}
                                        {actividades.map(act => (
                                            <th key={act.idActividad} className="px-3 py-3 text-center font-semibold min-w-[120px] border-r border-slate-100" title={act.descripcion}>
                                                <div className="font-bold text-slate-700 truncate max-w-[110px]">{act.nombre}</div>
                                                <span className={`text-[8px] font-extrabold uppercase px-1 py-0.5 rounded ${
                                                    act.esSumativa ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'bg-blue-50 text-blue-600 border border-blue-100'
                                                }`}>
                                                    {act.esSumativa ? 'Sumativa' : 'Formativa'}
                                                </span>
                                            </th>
                                        ))}

                                        {actividades.length === 0 && (
                                            <th className="px-4 py-3 text-center text-slate-400 italic font-normal min-w-[200px] border-r border-slate-100">
                                                Sin actividades creadas en este trimestre
                                            </th>
                                        )}

                                        {/* Promedios */}
                                        <th className="px-3 py-3 text-center font-semibold text-blue-600 border-l border-slate-200 bg-slate-50">Prom. Form.</th>
                                        <th className="px-3 py-3 text-center font-semibold text-purple-600 bg-slate-50">Prom. Sum.</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-slate-50 sticky right-0 z-10 border-l border-slate-200">Prom. Final</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {estudiantes.map((est) => {
                                        const prom = getPromediosEstudiante(est.idMatricula);
                                        const estCalif = calificaciones[est.idMatricula] || {};
                                        
                                        return (
                                            <tr key={est.idMatricula} className="hover:bg-slate-50 transition">
                                                <td className="px-4 py-3 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    {est.estudiante.apellidos} {est.estudiante.nombres}
                                                </td>

                                                {/* Celdas de Calificaciones */}
                                                {actividades.map(act => {
                                                    const val = estCalif[act.idActividad] !== undefined ? estCalif[act.idActividad] : "";
                                                    const cellKey = `${est.idMatricula}-${act.idActividad}`;
                                                    const isSaving = savingCells[cellKey];
                                                    
                                                    return (
                                                        <td key={act.idActividad} className="px-3 py-2 text-center border-r border-slate-100 relative group">
                                                            <div className="inline-flex items-center gap-1.5 justify-center">
                                                                <input
                                                                    type="text"
                                                                    value={val}
                                                                    placeholder="—"
                                                                    disabled={isSaving}
                                                                    onChange={(e) => handleNotaChange(est.idMatricula, act.idActividad, e.target.value)}
                                                                    onBlur={() => handleNotaSave(est.idMatricula, act.idActividad, val)}
                                                                    className={`w-12 px-1.5 py-1 text-center font-bold text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                                                                        val !== "" && parseFloat(val) < 7 
                                                                            ? 'bg-red-50 text-red-600 border-red-200' 
                                                                            : val !== "" 
                                                                                ? 'bg-green-50 text-green-700 border-green-200' 
                                                                                : 'border-slate-200 text-slate-400 bg-slate-50/50'
                                                                    }`}
                                                                />
                                                                {isSaving && (
                                                                    <div className="absolute right-1 top-1/2 -translate-y-1/2">
                                                                        <svg className="animate-spin h-3.5 w-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                        </svg>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </td>
                                                    );
                                                })}

                                                {actividades.length === 0 && (
                                                    <td className="px-4 py-3 text-center text-slate-400 italic border-r border-slate-100">
                                                        Debe crear actividades en este trimestre primero.
                                                    </td>
                                                )}

                                                {/* Promedios */}
                                                <td className="px-3 py-3 text-center font-bold text-blue-600 bg-slate-50/50 border-l border-slate-200">
                                                    {prom.formativo.toFixed(2)}
                                                </td>
                                                <td className="px-3 py-3 text-center font-bold text-purple-600 bg-slate-50/50">
                                                    {prom.sumativo.toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-center sticky right-0 bg-white z-10 border-l border-slate-200 font-bold shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    <span className={`px-2 py-1 rounded text-[11px] font-extrabold border ${
                                                        prom.final >= 7 
                                                            ? 'bg-green-50 text-green-700 border-green-150' 
                                                            : prom.final > 0 
                                                                ? 'bg-red-50 text-red-650 border-red-150' 
                                                                : 'bg-slate-50 text-slate-400 border-slate-150'
                                                    }`}>
                                                        {prom.final.toFixed(2)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            ) : (
                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    Seleccione una asignatura para ver su planilla de calificaciones.
                </div>
            )}
        </div>
    );
}
