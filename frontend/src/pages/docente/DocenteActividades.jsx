import { useState, useEffect } from "react";
import api from "../../config/axios";
import { getActividadesPorAsignacion, getEstudiantesPorAsignacion, createActividad, updateActividad, deleteActividad, registrarCalificacion } from "../../services/docente/docenteService";

const PRIMARY = "#243A76";

export default function DocenteActividades({ asignacionActiva }) {
    const [actividades, setActividades] = useState([]);
    const [estudiantes, setEstudiantes] = useState([]);
    const [calificacionesMap, setCalificacionesMap] = useState({}); // { [actId]: [ { idMatricula, nota } ] }
    const [loading, setLoading] = useState(false);
    const [vistaModo, setVistaModo] = useState("carpetas"); // 'carpetas' | 'tarjetas'
    const [selectedFolder, setSelectedFolder] = useState(null); // null o tipo de actividad (ej. 'TAREA')
    const [gradingActivity, setGradingActivity] = useState(null); // null o objeto actividad activa para calificar
    const [savingGradingCells, setSavingGradingCells] = useState({}); // { [matriculaId]: boolean }
    const [mensajeFeedback, setMensajeFeedback] = useState({ tipo: "", texto: "" });
    const asignacionSel = asignacionActiva?.idAsignacion || "";

    const [showModal, setShowModal] = useState(false);
    const [formData, setFormData] = useState({
        idActividad: null,
        nombre: "",
        descripcion: "",
        tipo: "TAREA",
        fechaEntrega: ""
    });

    // Estados para modal de eliminación personalizado
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [actividadToDelete, setActividadToDelete] = useState(null);

    useEffect(() => {
        if (asignacionSel) {
            cargarActividades(asignacionSel);
        } else {
            setActividades([]);
            setEstudiantes([]);
            setCalificacionesMap({});
            setGradingActivity(null);
        }
    }, [asignacionSel]);

    const cargarActividades = async (asignacionId) => {
        try {
            setLoading(true);
            setMensajeFeedback({ tipo: "", texto: "" });
            console.log("[React Debug - Actividades] Cargando actividades para asignacion:", asignacionId);
            
            // 1. Obtener actividades de la asignación
            const data = await getActividadesPorAsignacion(asignacionId);
            
            // 2. Obtener estudiantes matriculados en la asignación
            const ests = await getEstudiantesPorAsignacion(asignacionId);
            setEstudiantes(ests);

            // 3. Obtener calificaciones de todos los estudiantes para mapear métricas
            const allCalificaciones = [];
            await Promise.all(ests.map(async (est) => {
                try {
                    const res = await api.get(`/api/calificaciones/matricula/${est.idMatricula}/trimestre/1`);
                    const cList = res.data?.calificaciones || [];
                    allCalificaciones.push(...cList);
                } catch (err) {
                    console.error("Error al obtener calificaciones de matrícula:", est.idMatricula, err);
                }
            }));

            // Agrupar calificaciones por idActividad
            const grouped = {};
            allCalificaciones.forEach(c => {
                const actId = c.idActividad;
                if (!grouped[actId]) {
                    grouped[actId] = [];
                }
                grouped[actId].push(c);
            });

            setCalificacionesMap(grouped);
            setActividades(data);
        } catch (error) {
            console.error("[React Debug - Actividades] Error cargando actividades:", error);
        } finally {
            setLoading(false);
        }
    };

    const getActividadMetrics = (actId) => {
        const califs = calificacionesMap[actId] || [];
        const totalCount = estudiantes.length;
        
        // Calificados reales
        const gradedCalifs = califs.filter(c => c.nota !== undefined && c.nota !== null);
        const gradedCount = gradedCalifs.length;
        
        // Calcular promedio
        const sumNotas = gradedCalifs.reduce((sum, c) => sum + parseFloat(c.nota), 0);
        const promedio = gradedCount > 0 ? (sumNotas / gradedCount) : 0;
        
        const fullyGraded = totalCount > 0 && gradedCount === totalCount;
        
        return {
            gradedCount,
            totalCount,
            promedio,
            fullyGraded
        };
    };

    const getNotaCualitativa = (nota) => {
        const val = parseFloat(nota);
        if (isNaN(val)) return "";
        if (val >= 9.0) return "DAR";
        if (val >= 7.0) return "AAR";
        if (val >= 5.0) return "PAR";
        return "NAR";
    };

    const handleGradingNotaChange = (matriculaId, value) => {
        const actId = gradingActivity.idActividad;
        
        // Actualizar el valor en calificacionesMap localmente
        setCalificacionesMap(prev => {
            const currentList = prev[actId] || [];
            const existing = currentList.find(c => c.idMatricula === matriculaId);
            
            let newList;
            if (existing) {
                newList = currentList.map(c => c.idMatricula === matriculaId ? { ...c, nota: value } : c);
            } else {
                newList = [...currentList, { idActividad: actId, idMatricula: matriculaId, nota: value }];
            }
            
            return {
                ...prev,
                [actId]: newList
            };
        });
    };

    const handleGradingNotaSave = async (matriculaId, originalValue) => {
        const actId = gradingActivity.idActividad;
        const currentList = calificacionesMap[actId] || [];
        const record = currentList.find(c => c.idMatricula === matriculaId);
        const currentValue = record ? record.nota : "";

        if (currentValue === originalValue) return;

        // Validar nota
        if (currentValue !== "" && currentValue !== undefined && currentValue !== null) {
            const num = parseFloat(currentValue);
            if (isNaN(num) || num < 0 || num > 10) {
                setMensajeFeedback({ tipo: "error", texto: "La nota debe ser un número entre 0.00 y 10.00." });
                // Revertir nota
                handleGradingNotaChange(matriculaId, originalValue || "");
                return;
            }
        } else {
            return;
        }

        try {
            setSavingGradingCells(prev => ({ ...prev, [matriculaId]: true }));
            setMensajeFeedback({ tipo: "", texto: "" });

            await registrarCalificacion({
                idMatricula: parseInt(matriculaId),
                idActividad: parseInt(actId),
                nota: parseFloat(currentValue),
                trimestre: 1 // Por defecto trimestre 1 para actividades
            });

            // Actualizar la lista local con el valor numérico
            setCalificacionesMap(prev => {
                const list = prev[actId] || [];
                return {
                    ...prev,
                    [actId]: list.map(c => c.idMatricula === matriculaId ? { ...c, nota: parseFloat(currentValue), notaCualitativa: getNotaCualitativa(currentValue) } : c)
                };
            });
        } catch (error) {
            console.error("Error al registrar calificación de la actividad:", error);
            setMensajeFeedback({ tipo: "error", texto: "No se pudo guardar la calificación." });
            // Revertir nota
            handleGradingNotaChange(matriculaId, originalValue || "");
        } finally {
            setSavingGradingCells(prev => ({ ...prev, [matriculaId]: false }));
        }
    };

    const handleOpenModal = (act = null) => {
        if (act) {
            setFormData({
                idActividad: act.idActividad,
                nombre: act.nombre,
                descripcion: act.descripcion,
                tipo: act.tipo,
                fechaEntrega: act.fechaEntrega ? act.fechaEntrega.substring(0, 10) : "" 
            });
        } else {
            setFormData({
                idActividad: null,
                nombre: "",
                descripcion: "",
                tipo: selectedFolder || "TAREA",
                fechaEntrega: ""
            });
        }
        setShowModal(true);
    };

    const handleSave = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                asignacionId: parseInt(asignacionSel),
                periodoId: 1, 
                nombre: formData.nombre,
                descripcion: formData.descripcion,
                tipo: formData.tipo,
                fechaEntrega: formData.fechaEntrega,
                ponderacion: 10,
                notaMaxima: 10,
                esSumativa: formData.tipo === 'EXAMEN_TRIMESTRAL'
            };

            if (formData.idActividad) {
                await updateActividad(formData.idActividad, payload);
            } else {
                await createActividad(payload);
            }
            setShowModal(false);
            cargarActividades(asignacionSel);
        } catch (error) {
            console.error("Error guardando actividad:", error);
            alert("Ocurrió un error al guardar la actividad.");
        }
    };

    const triggerDeleteConfirmation = (act) => {
        setActividadToDelete(act);
        setShowDeleteModal(true);
    };

    const executeDelete = async () => {
        if (!actividadToDelete) return;
        try {
            await deleteActividad(actividadToDelete.idActividad);
            setShowDeleteModal(false);
            setActividadToDelete(null);
            cargarActividades(asignacionSel);
        } catch (error) {
            console.error("Error eliminando actividad:", error);
            alert("Error al eliminar la actividad.");
        }
    };

    // Agrupar actividades por Tipo
    const tiposDeActividad = [...new Set(actividades.map(a => a.tipo))];

    const getTipoLabel = (tipo) => {
        switch (tipo) {
            case 'TAREA': return 'Tareas';
            case 'TALLER': return 'Talleres';
            case 'EXAMEN_TRIMESTRAL': return 'Exámenes Trimestrales';
            default: return tipo.replace('_', ' ').charAt(0) + tipo.slice(1).toLowerCase().replace('_', ' ') + 's';
        }
    };

    const getFolderColor = (tipo) => {
        switch (tipo) {
            case 'TAREA': return 'text-blue-500 bg-blue-50 border-blue-200';
            case 'TALLER': return 'text-emerald-500 bg-emerald-50 border-emerald-200';
            case 'EXAMEN_TRIMESTRAL': return 'text-rose-500 bg-rose-50 border-rose-200';
            default: return 'text-slate-500 bg-slate-50 border-slate-200';
        }
    };

    return (
        <div>
            {/* Cabecera Simple */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Actividades</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestione las tareas, lecciones y exámenes de sus alumnos.</p>
                </div>
                
                {!gradingActivity && (
                    <div className="flex items-center gap-3">
                        {/* Switcher de Vista */}
                        <div className="bg-slate-100 p-1 rounded-lg inline-flex text-xs shadow-sm">
                            <button
                                onClick={() => { setVistaModo("carpetas"); setSelectedFolder(null); }}
                                className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${vistaModo === 'carpetas' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                </svg>
                                Vista Carpetas
                            </button>
                            <button
                                onClick={() => { setVistaModo("tarjetas"); setSelectedFolder(null); }}
                                className={`px-3 py-1.5 rounded-md font-medium transition flex items-center gap-1.5 ${vistaModo === 'tarjetas' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                                </svg>
                                Vista Lista
                            </button>
                        </div>

                        {asignacionSel && (
                            <button
                                onClick={() => handleOpenModal()}
                                style={{ backgroundColor: PRIMARY }}
                                className="text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition shadow-sm flex items-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                </svg>
                                Nueva Actividad
                            </button>
                        )}
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
                    <p className="text-yellow-700 font-medium text-sm">Por favor, seleccione una asignatura desde el Panel Principal para gestionar sus actividades.</p>
                </div>
            )}

            {/* Mensaje Feedback */}
            {mensajeFeedback.texto && (
                <div className={`mb-6 p-4 rounded-lg text-sm border ${
                    mensajeFeedback.tipo === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'
                }`}>
                    {mensajeFeedback.texto}
                </div>
            )}

            {asignacionSel ? (
                loading ? (
                    <div className="text-center py-10 text-slate-500">Cargando actividades y métricas...</div>
                ) : gradingActivity ? (
                    /* MODO DETALLE: CALIFICAR ACTIVIDAD ESPECÍFICA */
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="flex items-center gap-3">
                                <button 
                                    onClick={() => { setGradingActivity(null); cargarActividades(asignacionSel); }}
                                    className="text-slate-500 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition border border-slate-200"
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                    </svg>
                                    Volver
                                </button>
                                <div>
                                    <h2 className="font-bold text-slate-800 text-lg">Calificar Actividad: {gradingActivity.nombre}</h2>
                                    <p className="text-slate-400 text-xs mt-0.5">{gradingActivity.descripcion || "Sin descripción."}</p>
                                </div>
                            </div>
                            
                            <div className="text-right">
                                <span className={`px-2.5 py-1 rounded text-xs font-extrabold uppercase ${getFolderColor(gradingActivity.tipo)}`}>
                                    {getTipoLabel(gradingActivity.tipo)}
                                </span>
                                <p className="text-slate-400 text-[10px] mt-1 font-medium">Entrega: {gradingActivity.fechaEntrega}</p>
                            </div>
                        </div>

                        {/* Listado de Estudiantes a Calificar */}
                        <div className="overflow-x-auto border border-slate-200 rounded-xl">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-3 font-semibold">Estudiante</th>
                                        <th className="px-6 py-3 font-semibold text-center">Estado de Entrega</th>
                                        <th className="px-6 py-3 font-semibold text-center">Nota (0.0 - 10.0)</th>
                                        <th className="px-6 py-3 font-semibold">Equivalencia Cualitativa</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {estudiantes.map((est) => {
                                        const califs = calificacionesMap[gradingActivity.idActividad] || [];
                                        const cRecord = califs.find(c => c.idMatricula === est.idMatricula);
                                        const notaVal = cRecord ? cRecord.nota : "";
                                        const cualitativa = cRecord ? cRecord.notaCualitativa || getNotaCualitativa(cRecord.nota) : "";
                                        
                                        const isSaving = savingGradingCells[est.idMatricula];
                                        const haEntregado = notaVal !== "" && notaVal !== undefined && notaVal !== null;
                                        
                                        return (
                                            <tr key={est.idMatricula} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 font-semibold text-slate-800">
                                                    {est.estudiante.apellidos} {est.estudiante.nombres}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] uppercase ${
                                                        haEntregado 
                                                            ? 'bg-green-50 text-green-700 border border-green-200' 
                                                            : 'bg-slate-100 text-slate-400 border border-slate-200'
                                                    }`}>
                                                        {haEntregado ? 'Calificado' : 'Sin Calificar'}
                                                    </span>
                                                </td>
                                                <td className="px-6 py-2 text-center relative">
                                                    <div className="inline-flex items-center gap-1.5 justify-center">
                                                        <input 
                                                            type="text"
                                                            value={notaVal}
                                                            placeholder="—"
                                                            disabled={isSaving}
                                                            onChange={(e) => handleGradingNotaChange(est.idMatricula, e.target.value)}
                                                            onBlur={() => handleGradingNotaSave(est.idMatricula, notaVal)}
                                                            className={`w-14 px-2 py-1 text-center font-bold text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition ${
                                                                haEntregado && parseFloat(notaVal) < 7 
                                                                    ? 'bg-red-50 text-red-650 border-red-200' 
                                                                    : haEntregado 
                                                                        ? 'bg-green-50 text-green-700 border-green-200' 
                                                                        : 'border-slate-200 text-slate-400 bg-slate-50/50'
                                                            }`}
                                                        />
                                                        {isSaving && (
                                                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                                                <svg className="animate-spin h-3.5 w-3.5 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                                </svg>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 font-bold">
                                                    {cualitativa && (
                                                        <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold ${
                                                            cualitativa === 'DAR' ? 'bg-blue-50 text-blue-700 border border-blue-200' :
                                                            cualitativa === 'AAR' ? 'bg-green-50 text-green-700 border border-green-200' :
                                                            cualitativa === 'PAR' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                                                            'bg-red-50 text-red-700 border border-red-200'
                                                        }`}>
                                                            {cualitativa}
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ) : (
                    /* LISTADO GENERAL DE ACTIVIDADES (FOLDER O TARJETAS) */
                    <div>
                        {/* MODO 1: VISTA DE CARPETAS */}
                        {vistaModo === "carpetas" && (
                            <div>
                                {selectedFolder === null ? (
                                    /* Vista Raíz: Carpetas por Tipo */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                        {tiposDeActividad.map(tipo => {
                                            const actsTipo = actividades.filter(a => a.tipo === tipo);
                                            const col = getFolderColor(tipo);
                                            return (
                                                <div 
                                                    key={tipo}
                                                    onClick={() => setSelectedFolder(tipo)}
                                                    className="bg-white border border-slate-200 rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 p-5 flex items-center gap-4 cursor-pointer"
                                                >
                                                    <div className={`p-4 rounded-xl border ${col}`}>
                                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                                                        </svg>
                                                    </div>
                                                    <div>
                                                        <h3 className="font-bold text-slate-700 text-lg">{getTipoLabel(tipo)}</h3>
                                                        <p className="text-slate-400 text-xs mt-0.5">{actsTipo.length} {actsTipo.length === 1 ? 'actividad' : 'actividades'}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {actividades.length === 0 && (
                                            <div className="col-span-full text-center py-12 text-slate-400">
                                                No hay actividades registradas en esta asignatura.
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    /* Vista Carpeta Abierta: Lista de Actividades de ese Tipo */
                                    <div>
                                        <div className="flex items-center gap-2 mb-4">
                                            <button 
                                                onClick={() => setSelectedFolder(null)}
                                                className="text-slate-500 hover:text-slate-700 p-1.5 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1 transition"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                                                </svg>
                                                Volver a Carpetas
                                            </button>
                                            <span className="text-slate-300">/</span>
                                            <span className="text-slate-600 font-bold text-xs">{getTipoLabel(selectedFolder)}</span>
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {actividades.filter(a => a.tipo === selectedFolder).map(act => {
                                                const m = getActividadMetrics(act.idActividad);
                                                return (
                                                    <div 
                                                        key={act.idActividad}
                                                        className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col justify-between hover:shadow-md transition-all"
                                                    >
                                                        <div>
                                                            <div className="flex justify-between items-start mb-2">
                                                                <h3 className="font-bold text-slate-800 text-base">{act.nombre}</h3>
                                                                <span className={`px-2.5 py-0.5 rounded-full font-bold text-[10px] uppercase ${
                                                                    m.fullyGraded ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                                }`}>
                                                                    {m.fullyGraded ? 'Calificado' : 'Pendiente'}
                                                                </span>
                                                            </div>
                                                            <p className="text-slate-500 text-xs line-clamp-2 mb-4">{act.descripcion || "Sin descripción."}</p>
                                                            
                                                            <div className="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs mb-4">
                                                                <div>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">Calificados</p>
                                                                    <p className="font-bold text-slate-700 mt-0.5">{m.gradedCount} / {m.totalCount}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">Promedio</p>
                                                                    <p className="font-bold text-blue-600 mt-0.5">{m.promedio.toFixed(1)} / 10</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">Vencimiento</p>
                                                                    <p className="font-semibold text-slate-600 mt-0.5 text-[10px] truncate" title={act.fechaEntrega}>
                                                                        {act.fechaEntrega}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        <div className="flex justify-between items-center border-t border-slate-100 pt-3">
                                                            <button 
                                                                onClick={() => setGradingActivity(act)}
                                                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-bold transition shadow-sm"
                                                            >
                                                                Calificar Actividad
                                                            </button>
                                                            <div className="flex gap-2">
                                                                <button 
                                                                    onClick={() => handleOpenModal(act)}
                                                                    className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-600 px-3 py-1.5 rounded-lg font-medium transition"
                                                                >
                                                                    Editar
                                                                </button>
                                                                <button 
                                                                    onClick={() => triggerDeleteConfirmation(act)}
                                                                    className="text-xs bg-rose-50 hover:bg-rose-100 text-rose-600 px-3 py-1.5 rounded-lg font-medium transition"
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* MODO 2: VISTA DE TARJETAS HORIZONTALES */}
                        {vistaModo === "tarjetas" && (
                            <div className="space-y-4">
                                {actividades.map(act => {
                                    const m = getActividadMetrics(act.idActividad);
                                    const col = getFolderColor(act.tipo);
                                    
                                    return (
                                        <div 
                                            key={act.idActividad}
                                            className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:shadow-md transition"
                                        >
                                            <div className="flex items-start gap-4 flex-1">
                                                <div className={`p-3 rounded-xl border hidden sm:block ${col}`}>
                                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2" />
                                                    </svg>
                                                </div>
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${col}`}>
                                                            {getTipoLabel(act.tipo)}
                                                        </span>
                                                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                                                            m.fullyGraded ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'
                                                        }`}>
                                                            {m.fullyGraded ? 'Calificado' : 'Pendiente'}
                                                        </span>
                                                    </div>
                                                    <h3 className="font-bold text-slate-800 text-base">{act.nombre}</h3>
                                                    <p className="text-slate-500 text-xs line-clamp-1">{act.descripcion || "Sin descripción."}</p>
                                                </div>
                                            </div>

                                            {/* Métricas de la tarjeta */}
                                            <div className="flex flex-wrap items-center gap-6 text-xs border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">Calificados</p>
                                                    <p className="font-bold text-slate-700 mt-0.5">{m.gradedCount} / {m.totalCount}</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">Promedio</p>
                                                    <p className="font-bold text-blue-600 mt-0.5">{m.promedio.toFixed(1)} / 10</p>
                                                </div>
                                                <div>
                                                    <p className="text-[10px] text-slate-400 uppercase font-medium">Vencimiento</p>
                                                    <p className="font-medium text-slate-600 mt-0.5">{act.fechaEntrega}</p>
                                                </div>
                                                
                                                <div className="flex items-center gap-2 ml-auto lg:ml-0">
                                                    <button 
                                                        onClick={() => setGradingActivity(act)}
                                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition shadow-sm"
                                                    >
                                                        Calificar
                                                    </button>
                                                    <button 
                                                        onClick={() => handleOpenModal(act)}
                                                        className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                                                        title="Editar"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                    <button 
                                                        onClick={() => triggerDeleteConfirmation(act)}
                                                        className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                                        title="Eliminar"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                                {actividades.length === 0 && (
                                    <div className="text-center py-12 text-slate-400 bg-white border border-slate-200 rounded-2xl">
                                        No hay actividades registradas en esta asignatura.
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )
            ) : (
                <div className="text-center py-10 text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    Seleccione una asignatura para ver sus actividades.
                </div>
            )}

            {/* Modal para Crear / Editar Actividad */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-slate-100">
                        <div style={{ backgroundColor: PRIMARY }} className="px-6 py-4 flex items-center justify-between text-white">
                            <h3 className="font-semibold text-lg">{formData.idActividad ? "Editar" : "Nueva"} Actividad</h3>
                            <button onClick={() => setShowModal(false)} className="text-white hover:text-slate-200 transition">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleSave} className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Título / Nombre</label>
                                <input 
                                    type="text" 
                                    required
                                    value={formData.nombre}
                                    onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Tipo de Actividad</label>
                                <select 
                                    value={formData.tipo}
                                    onChange={(e) => setFormData({...formData, tipo: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                >
                                    <option value="TAREA">Tarea</option>
                                    <option value="TALLER">Taller</option>
                                    <option value="EXAMEN_TRIMESTRAL">Examen Trimestral</option>
                                </select>
                            </div>
                            <div className="mb-4">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Descripción</label>
                                <textarea 
                                    rows="3"
                                    value={formData.descripcion}
                                    onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                ></textarea>
                            </div>
                            <div className="mb-6">
                                <label className="block text-sm font-semibold text-slate-700 mb-1">Fecha de Entrega / Vencimiento</label>
                                <input 
                                    type="date" 
                                    required
                                    value={formData.fechaEntrega}
                                    onChange={(e) => setFormData({...formData, fechaEntrega: e.target.value})}
                                    className="w-full p-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                                />
                            </div>
                            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                                <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 text-sm font-medium text-slate-650 bg-slate-100 hover:bg-slate-200 rounded-xl transition">Cancelar</button>
                                <button type="submit" style={{ backgroundColor: PRIMARY }} className="px-4 py-2 text-sm font-bold text-white hover:opacity-90 rounded-xl transition">
                                    Guardar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Confirmación de Eliminación Personalizado */}
            {showDeleteModal && actividadToDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-sm px-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100 animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center">
                            {/* Icono de advertencia en rojo */}
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-50 text-red-650 mb-4 border border-red-200">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-slate-800">¿Eliminar actividad?</h3>
                            <p className="text-slate-500 text-xs mt-2 px-4">
                                ¿Está seguro de que desea eliminar la actividad <strong>"{actividadToDelete.nombre}"</strong>? Todos los datos de calificaciones asociados se borrarán permanentemente. Esta acción no se puede deshacer.
                            </p>
                        </div>
                        <div className="bg-slate-50 px-6 py-4 flex flex-row-reverse gap-3 border-t border-slate-100">
                            <button
                                onClick={executeDelete}
                                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition shadow-sm"
                            >
                                Sí, eliminar actividad
                            </button>
                            <button
                                onClick={() => { setShowDeleteModal(false); setActividadToDelete(null); }}
                                className="px-4 py-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-medium transition"
                            >
                                Cancelar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
