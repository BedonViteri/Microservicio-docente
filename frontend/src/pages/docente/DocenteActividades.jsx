import { useState, useEffect } from "react";
import api from "../../config/axios";
import { getActividadesPorAsignacion, getEstudiantesPorAsignacion, createActividad, updateActividad, deleteActividad } from "../../services/docente/docenteService";

const PRIMARY = "#243A76";

export default function DocenteActividades({ asignacionActiva, setSeccion }) {
    const [actividades, setActividades] = useState([]);
    const [estudiantes, setEstudiantes] = useState([]);
    const [calificacionesMap, setCalificacionesMap] = useState({});
    const [loading, setLoading] = useState(false);
    const [vistaModo, setVistaModo] = useState("carpetas"); // 'carpetas' | 'tarjetas'
    const [selectedFolder, setSelectedFolder] = useState(null); // null o tipo de actividad (ej. 'TAREA')
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
        }
    }, [asignacionSel]);

    const cargarActividades = async (asignacionId) => {
        try {
            setLoading(true);
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

            {asignacionSel ? (
                loading ? (
                    <div className="text-center py-10 text-slate-500">Cargando actividades y métricas...</div>
                ) : (
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
                                                                onClick={() => setSeccion("calificaciones")}
                                                                className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg font-bold transition shadow-sm"
                                                            >
                                                                Calificar
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
                                                        onClick={() => setSeccion("calificaciones")}
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
                            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-105 text-red-600 mb-4 border border-red-200">
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
