import { useState, useEffect } from "react";
import { 
    getEstudiantesPorAsignacion, 
    getActividadesPorAsignacion, 
    getCalificacionesEstudiante,
    getPromedioFinal,
    registrarCalificacion,
    getPeriodosEvaluacion
} from "../../services/docente/docenteService";

const PRIMARY = "#243A76";

export default function DocenteCalificaciones({ asignacionActiva, asignaciones, onAsignacionChange }) {
    const [estudiantes, setEstudiantes] = useState([]);
    const [actividades, setActividades] = useState([]);
    const [calificaciones, setCalificaciones] = useState({}); // { [matriculaId]: { [actId]: nota } }
    const [calificacionesOriginales, setCalificacionesOriginales] = useState({}); // { [matriculaId]: { [actId]: nota } }
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [trimestre, setTrimestre] = useState(1);
    const [mensaje, setMensaje] = useState({ tipo: "", texto: "" });
    const [subVista, setSubVista] = useState("planilla"); // 'planilla' | 'resumen'
    const [resumenData, setResumenData] = useState({}); // { [matriculaId]: { t1, t2, t3, anual } }
    const [loadingResumen, setLoadingResumen] = useState(false);
    const [periodos, setPeriodos] = useState([]);
    const asignacionId = asignacionActiva?.idAsignacion || "";

    // 1. Cargar periodos al cambiar asignación
    useEffect(() => {
        const fetchPeriods = async () => {
            try {
                const pers = await getPeriodosEvaluacion();
                const sorted = (pers || []).sort((a, b) => a.id_periodo - b.id_periodo);
                setPeriodos(sorted);
                if (sorted.length > 0) {
                    const hasCurrent = sorted.some(p => p.id_periodo === trimestre);
                    if (!hasCurrent) {
                        setTrimestre(sorted[0].id_periodo);
                    }
                }
            } catch (err) {
                console.error("Error al cargar periodos de evaluacion:", err);
            }
        };
        if (asignacionId) {
            fetchPeriods();
        }
    }, [asignacionId]);

    // 2. Cargar datos específicos al cambiar variables de vista
    useEffect(() => {
        if (asignacionId && periodos.length > 0) {
            if (subVista === "planilla") {
                cargarDatos();
            } else {
                cargarResumen();
            }
        }
    }, [asignacionId, trimestre, subVista, periodos]);

    const cargarDatos = async (isSilent = false) => {
        try {
            if (!isSilent) setLoading(true);
            if (!isSilent) setMensaje({ tipo: "", texto: "" });
            
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
            const originalsMap = {};
            
            await Promise.all(ests.map(async (est) => {
                try {
                    const data = await getCalificacionesEstudiante(est.idMatricula, trimestre);
                    const cList = data || [];
                    
                    califsMap[est.idMatricula] = {};
                    originalsMap[est.idMatricula] = {};
                    
                    cList.forEach(c => {
                        califsMap[est.idMatricula][c.idActividad] = c.nota;
                        originalsMap[est.idMatricula][c.idActividad] = c.nota;
                    });
                } catch (err) {
                    console.error("Error al cargar calificaciones del estudiante:", est.idMatricula, err);
                }
            }));
            
            setCalificaciones(califsMap);
            setCalificacionesOriginales(originalsMap);
        } catch (error) {
            console.error("Error cargando calificaciones:", error);
            setMensaje({ tipo: "error", texto: "No se pudieron cargar los datos de calificaciones." });
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    const cargarResumen = async () => {
        try {
            setLoadingResumen(true);
            setMensaje({ tipo: "", texto: "" });
            
            const ests = await getEstudiantesPorAsignacion(asignacionId);
            setEstudiantes(ests);
            
            const rMap = {};
            await Promise.all(ests.map(async (est) => {
                try {
                    const pFinals = await Promise.all(periodos.map(async (p) => {
                        const score = await getPromedioFinal(est.idMatricula, p.id_periodo);
                        return { id_periodo: p.id_periodo, nota: parseFloat(score) || 0.0 };
                    }));
                    
                    const termScores = {};
                    pFinals.forEach(item => {
                        termScores[item.id_periodo] = item.nota;
                    });
                    
                    const activeTerms = pFinals.map(item => item.nota).filter(v => v > 0);
                    const anual = activeTerms.length > 0 
                        ? (activeTerms.reduce((s, v) => s + v, 0) / activeTerms.length) 
                        : 0.0;
                    
                    rMap[est.idMatricula] = {
                        ...termScores,
                        anual: anual
                    };
                } catch (err) {
                    console.error("Error al cargar promedios de estudiante:", est.idMatricula, err);
                }
            }));
            
            setResumenData(rMap);
        } catch (error) {
            console.error("Error al cargar resumen:", error);
            setMensaje({ tipo: "error", texto: "No se pudo cargar el resumen anual." });
        } finally {
            setLoadingResumen(false);
        }
    };

    const handleNotaChange = (matriculaId, actId, value) => {
        // Filtrar caracteres no numéricos y solo permitir punto decimal
        let cleanValue = value.replace(/[^0-9.]/g, '');
        
        // Evitar múltiples puntos
        const parts = cleanValue.split('.');
        if (parts.length > 2) {
            cleanValue = parts[0] + '.' + parts.slice(1).join('');
        }
        
        // Limitar rango máximo a 10
        if (cleanValue !== "") {
            const num = parseFloat(cleanValue);
            if (!isNaN(num) && num > 10) {
                cleanValue = "10";
            }
        }

        setCalificaciones(prev => ({
            ...prev,
            [matriculaId]: {
                ...prev[matriculaId],
                [actId]: cleanValue
            }
        }));
    };

    const handleGuardarCalificaciones = async () => {
        const modifiedList = [];
        
        for (const est of estudiantes) {
            const estCalif = calificaciones[est.idMatricula] || {};
            const originalMap = calificacionesOriginales[est.idMatricula] || {};
            
            for (const act of actividades) {
                const currentValue = estCalif[act.idActividad] !== undefined ? estCalif[act.idActividad] : "";
                const originalValue = originalMap[act.idActividad] !== undefined ? originalMap[act.idActividad] : "";
                
                if (currentValue.toString() !== originalValue.toString()) {
                    if (currentValue !== "" && currentValue !== undefined && currentValue !== null) {
                        const num = parseFloat(currentValue);
                        if (isNaN(num) || num < 0 || num > 10) {
                            setMensaje({ tipo: "error", texto: "La nota de un estudiante debe ser un número entre 0.00 y 10.00." });
                            return;
                        }
                        modifiedList.push({
                            idMatricula: est.idMatricula,
                            idActividad: act.idActividad,
                            nota: num
                        });
                    }
                }
            }
        }
        
        if (modifiedList.length === 0) {
            setMensaje({ tipo: "success", texto: "No se detectaron cambios para guardar." });
            return;
        }
        
        try {
            setGuardando(true);
            setMensaje({ tipo: "", texto: "" });
            
            await Promise.all(modifiedList.map(async (m) => {
                await registrarCalificacion({
                    idMatricula: m.idMatricula,
                    idActividad: m.idActividad,
                    nota: m.nota,
                    trimestre: parseInt(trimestre)
                });
            }));
            
            setMensaje({ tipo: "success", texto: "Calificaciones guardadas exitosamente." });
            setTimeout(() => {
                setMensaje({ tipo: "", texto: "" });
            }, 3000);
            await cargarDatos(true);
        } catch (error) {
            console.error("Error al registrar calificaciones:", error);
            setMensaje({ tipo: "error", texto: "Ocurrió un error al guardar las calificaciones." });
        } finally {
            setGuardando(false);
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

    const getColumnAverages = () => {
        const ests = estudiantes;
        if (ests.length === 0) return null;
        
        const periodAverages = {};
        periodos.forEach(p => {
            let sum = 0, count = 0;
            ests.forEach(est => {
                const r = resumenData[est.idMatricula];
                if (r && r[p.id_periodo] > 0) {
                    sum += r[p.id_periodo];
                    count++;
                }
            });
            periodAverages[p.id_periodo] = count > 0 ? (sum / count) : 0.0;
        });
        
        let anualSum = 0, anualCount = 0;
        ests.forEach(est => {
            const r = resumenData[est.idMatricula];
            if (r && r.anual > 0) {
                anualSum += r.anual;
                anualCount++;
            }
        });
        const anualAvg = anualCount > 0 ? (anualSum / anualCount) : 0.0;
        
        return {
            periods: periodAverages,
            anual: anualAvg
        };
    };

    const getNotaCualitativa = (nota) => {
        const val = parseFloat(nota);
        if (isNaN(val) || val <= 0) return "";
        if (val >= 10.0) return "A+";
        if (val >= 9.0) return "A-";
        if (val >= 8.0) return "B+";
        if (val >= 7.0) return "B-";
        if (val >= 6.0) return "C+";
        if (val >= 5.0) return "C-";
        return "D";
    };

    const getCualitativaColor = (cualitativa) => {
        if (!cualitativa) return "";
        if (cualitativa.startsWith('A')) return 'bg-blue-50 text-blue-700 border border-blue-200';
        if (cualitativa.startsWith('B')) return 'bg-green-50 text-green-700 border border-green-200';
        if (cualitativa.startsWith('C')) return 'bg-yellow-50 text-yellow-700 border border-yellow-200';
        return 'bg-red-50 text-red-700 border border-red-200';
    };

    return (
        <div>
            {/* Encabezado Simple */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Calificaciones</h1>
                    <p className="text-slate-500 text-sm mt-1">Registre, ingrese y analice las notas del curso.</p>
                </div>
                
                {/* Selector de sub-vista e inputs */}
                {asignacionId && (
                    <div className="flex items-center gap-4 flex-wrap">
                        {/* Selector Planilla / Resumen */}
                        <div className="bg-slate-100 p-1 rounded-lg inline-flex text-xs shadow-sm">
                            <button
                                onClick={() => setSubVista("planilla")}
                                className={`px-4 py-1.5 rounded-md font-semibold transition ${subVista === 'planilla' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Planilla de Notas
                            </button>
                            <button
                                onClick={() => setSubVista("resumen")}
                                className={`px-4 py-1.5 rounded-md font-semibold transition ${subVista === 'resumen' ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Resumen Anual
                            </button>
                        </div>

                        {subVista === "planilla" && periodos.length > 0 && (
                            <>
                                <div className="bg-slate-100 p-1 rounded-lg inline-flex text-xs shadow-sm">
                                    {periodos.map(p => (
                                        <button
                                            key={p.id_periodo}
                                            onClick={() => setTrimestre(p.id_periodo)}
                                            className={`px-4 py-1.5 rounded-md font-semibold transition ${trimestre === p.id_periodo ? 'bg-white shadow-sm text-blue-600 font-bold' : 'text-slate-500 hover:text-slate-700'}`}
                                        >
                                            {p.nombre.split(" ")[0]} {p.nombre.split(" ")[1] || ""}
                                        </button>
                                    ))}
                                </div>
                                
                                <button
                                    onClick={handleGuardarCalificaciones}
                                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-xs font-bold transition shadow-sm"
                                >
                                    Guardar Calificaciones
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>

            {/* Banner de Curso Seleccionado */}
            {asignacionActiva ? (
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl shadow-sm mb-6 flex justify-between items-center">
                    <div>
                        <p className="text-[10px] uppercase font-bold text-blue-500 tracking-wider">Asignatura / Curso</p>
                        {asignaciones && asignaciones.length > 0 ? (
                            <select
                                value={asignacionActiva.idAsignacion || ""}
                                onChange={(e) => {
                                    const selected = asignaciones.find(a => a.idAsignacion.toString() === e.target.value);
                                    if (selected && onAsignacionChange) onAsignacionChange(selected);
                                }}
                                className="bg-white border border-blue-200 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 mt-1 cursor-pointer"
                            >
                                {asignaciones.map(a => (
                                    <option key={a.idAsignacion} value={a.idAsignacion}>
                                        {a.grado?.nombre || a.grado} — {a.asignatura?.nombre || a.asignatura}
                                    </option>
                                ))}
                            </select>
                        ) : (
                            <h2 className="text-base font-bold text-slate-700 mt-0.5">
                                {asignacionActiva.grado?.nombre} — {asignacionActiva.asignatura?.nombre}
                            </h2>
                        )}
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
                subVista === "planilla" ? (
                    loading ? (
                        <div className="text-center py-10 text-slate-500">Cargando planilla de calificaciones...</div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4 space-y-6">
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
                                                        const haEntregado = val !== "" && val !== undefined && val !== null;
                                                        
                                                        return (
                                                            <td key={act.idActividad} className="px-3 py-2 text-center border-r border-slate-100">
                                                                <input
                                                                    type="text"
                                                                    value={val}
                                                                    placeholder="—"
                                                                    onChange={(e) => handleNotaChange(est.idMatricula, act.idActividad, e.target.value)}
                                                                    className={`w-12 px-1.5 py-1 text-center font-bold text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                                                                        haEntregado && parseFloat(val) < 7 
                                                                            ? 'bg-red-50 text-red-655 border-red-200' 
                                                                            : haEntregado 
                                                                                ? 'bg-green-50 text-green-700 border-green-200' 
                                                                                : 'border-slate-200 text-slate-400 bg-slate-50/50'
                                                                    }`}
                                                                />
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

                            {/* Leyenda explicativa cualitativa */}
                            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-[11px] text-slate-500 space-y-1">
                                <p className="font-bold text-slate-700">Leyenda de Equivalencias Cualitativas:</p>
                                <ul className="list-disc pl-4 space-y-0.5">
                                    <li><strong className="text-blue-600">A+ / A-</strong>: Rango Excelente / Sobresaliente (9.00 - 10.00)</li>
                                    <li><strong className="text-green-600">B+ / B-</strong>: Rango Muy Bueno / Alcanza (7.00 - 8.99)</li>
                                    <li><strong className="text-yellow-600">C+ / C-</strong>: Rango Regular / Próximo a alcanzar (5.00 - 6.99)</li>
                                    <li><strong className="text-red-600">D</strong>: Rango Deficiente / No alcanza (menos de 5.00)</li>
                                </ul>
                            </div>
                        </div>
                    )
                ) : (
                    /* SUB-VISTA: RESUMEN ANUAL */
                    loadingResumen ? (
                        <div className="text-center py-10 text-slate-500">Generando resumen de calificaciones anuales...</div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-4 space-y-6">
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse text-xs">
                                    <thead>
                                        <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
                                            <th className="px-6 py-3 font-semibold sticky left-0 bg-slate-50 z-10 border-r border-slate-200 min-w-[200px]">Estudiante</th>
                                            {periodos.map(p => (
                                                <th key={p.id_periodo} className="px-4 py-3 font-semibold text-center">{p.nombre}</th>
                                            ))}
                                            <th className="px-6 py-3 font-semibold text-center border-l border-slate-200 bg-slate-50 sticky right-0 z-10">Promedio Anual</th>
                                            <th className="px-6 py-3 font-semibold text-center">Equivalencia</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {estudiantes.map((est) => {
                                            const r = resumenData[est.idMatricula] || { anual: 0 };
                                            const cualitativa = getNotaCualitativa(r.anual);
                                            
                                            return (
                                                <tr key={est.idMatricula} className="hover:bg-slate-50 transition">
                                                    <td className="px-6 py-4 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                        {est.estudiante.apellidos} {est.estudiante.nombres}
                                                    </td>
                                                    {periodos.map(p => (
                                                        <td key={p.id_periodo} className="px-4 py-3 text-center font-bold text-slate-650">
                                                            {r[p.id_periodo] > 0 ? r[p.id_periodo].toFixed(2) : "—"}
                                                        </td>
                                                    ))}
                                                    <td className="px-6 py-4 text-center sticky right-0 bg-white z-10 border-l border-slate-200 font-extrabold shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] text-blue-650">
                                                        <span className="text-sm">{r.anual > 0 ? r.anual.toFixed(2) : "0.00"}</span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold">
                                                        {cualitativa && (
                                                            <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold border ${getCualitativaColor(cualitativa)}`}>
                                                                {cualitativa}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {/* Fila de Promedio General del Curso */}
                                        {estudiantes.length > 0 && (() => {
                                            const colAvgs = getColumnAverages();
                                            if (!colAvgs) return null;
                                            const cualitativaCurso = getNotaCualitativa(colAvgs.anual);
                                            
                                            return (
                                                <tr className="bg-slate-50/80 font-bold border-t border-slate-200 shadow-[0_-2px_5px_-2px_rgba(0,0,0,0.05)]">
                                                    <td className="px-6 py-4 font-bold text-slate-800 sticky left-0 bg-slate-50 z-10 border-r border-slate-200">
                                                        Promedio General del Curso
                                                    </td>
                                                    {periodos.map(p => {
                                                        const pAvg = colAvgs.periods[p.id_periodo] || 0.0;
                                                        return (
                                                            <td key={p.id_periodo} className="px-4 py-3 text-center text-slate-700">
                                                                {pAvg > 0 ? pAvg.toFixed(2) : "0.00"}
                                                            </td>
                                                        );
                                                    })}
                                                    <td className="px-6 py-4 text-center sticky right-0 bg-slate-50 z-10 border-l border-slate-200 text-blue-700 font-extrabold text-sm">
                                                        {colAvgs.anual > 0 ? colAvgs.anual.toFixed(2) : "0.00"}
                                                    </td>
                                                    <td className="px-6 py-4 text-center font-bold">
                                                        {cualitativaCurso && (
                                                            <span className={`px-2.5 py-1 rounded text-[10px] font-extrabold border ${getCualitativaColor(cualitativaCurso)}`}>
                                                                {cualitativaCurso}
                                                            </span>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })()}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                )
            ) : (
                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    Seleccione una asignatura para ver su planilla de calificaciones.
                </div>
            )}
        </div>
    );
}
