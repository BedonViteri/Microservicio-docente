import { useState, useEffect } from 'react';
import { 
    getEstudiantesPorAsignacion, 
    getAsistenciaPorAsignacionYFecha, 
    registrarAsistenciaGrupal, 
    getResumenAsistencia, 
    actualizarAsistencia 
} from '../../services/docente/docenteService';

export default function DocenteAsistencia({ asignacionActiva }) {
    const [estudiantes, setEstudiantes] = useState([]);
    const [asistencias, setAsistencias] = useState({});
    const [resumenes, setResumenes] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const [seccionActiva, setSeccionActiva] = useState('diario'); // 'diario', 'historial', 'resumen'
    const [autoLlenadoActivo, setAutoLlenadoActivo] = useState(false);

    const hoyStr = new Date().toISOString().split('T')[0];
    const esFechaFutura = fecha > hoyStr;

    useEffect(() => {
        if (asignacionActiva) {
            setMensaje({ tipo: '', texto: '' });
            cargarEstudiantes();
        }
    }, [asignacionActiva]);

    useEffect(() => {
        if (asignacionActiva && estudiantes.length > 0) {
            if (seccionActiva === 'diario') {
                cargarAsistenciaDia();
            } else if (seccionActiva === 'resumen') {
                cargarResumen();
            } else if (seccionActiva === 'historial') {
                cargarHistorial();
            }
        }
    }, [asignacionActiva, estudiantes, fecha, seccionActiva]);

    const cargarEstudiantes = async () => {
        try {
            setLoading(true);
            const data = await getEstudiantesPorAsignacion(asignacionActiva.idAsignacion);
            setEstudiantes(data);
        } catch (error) {
            console.error("Error al cargar estudiantes:", error);
            setMensaje({ tipo: 'error', texto: 'No se pudieron cargar los estudiantes.' });
        } finally {
            setLoading(false);
        }
    };

    const cargarAsistenciaDia = async () => {
        try {
            setLoading(true);
            setAutoLlenadoActivo(false);
            const response = await getAsistenciaPorAsignacionYFecha(asignacionActiva.idAsignacion, fecha);
            const registros = response.asistencias || [];
            
            const nuevaAsistencia = {};
            
            // Inicializar todos con PRESENTE por defecto
            estudiantes.forEach(est => {
                nuevaAsistencia[est.idMatricula] = { estado: 'PRESENTE', justificacion: '', idAsistencia: null };
            });
            
            // Sobrescribir si ya hay registros guardados en la base de datos
            registros.forEach(reg => {
                const idMat = reg.id_matricula !== undefined ? reg.id_matricula : reg.idMatricula;
                nuevaAsistencia[idMat] = {
                    estado: reg.estado,
                    justificacion: reg.justificacion || '',
                    idAsistencia: reg.id_asistencia !== undefined ? reg.id_asistencia : reg.idAsistencia
                };
            });

            // Lógica de auto-guardado automático si la clase ya finalizó hoy y no se ha guardado asistencia
            const tieneRegistrosGuardados = registros.length > 0;
            if (!tieneRegistrosGuardados && fecha === hoyStr) {
                const ahora = new Date();
                // Si la hora de control actual es posterior al fin de la jornada escolar (ej. las 13:00)
                if (ahora.getHours() >= 13) {
                    setAutoLlenadoActivo(true);
                }
            }
            
            setAsistencias(nuevaAsistencia);
        } catch (error) {
            console.error("Error al cargar asistencia:", error);
            setMensaje({ tipo: 'error', texto: 'Error al cargar los registros de asistencia.' });
        } finally {
            setLoading(false);
        }
    };

    const cargarResumen = async () => {
        try {
            setLoading(true);
            const response = await getResumenAsistencia(asignacionActiva.idAsignacion);
            const rawResumenes = response.resumenes || [];
            const normalized = rawResumenes.map(r => ({
                idMatricula: r.id_matricula !== undefined ? r.id_matricula : r.idMatricula,
                totalPresentes: r.total_presentes !== undefined ? r.total_presentes : r.totalPresentes,
                totalAusentes: r.total_ausentes !== undefined ? r.total_ausentes : r.totalAusentes,
                totalJustificados: r.total_justificados !== undefined ? r.total_justificados : r.totalJustificados,
                totalAtrasos: r.total_atrasos !== undefined ? r.total_atrasos : r.totalAtrasos,
                porcentajeAsistencia: r.porcentaje_asistencia !== undefined ? r.porcentaje_asistencia : r.porcentajeAsistencia
            }));
            setResumenes(normalized);
        } catch (error) {
            console.error("Error al cargar resumen:", error);
        } finally {
            setLoading(false);
        }
    };

    const cargarHistorial = async () => {
        try {
            setLoading(true);
            const response = await getAsistenciaPorAsignacionYFecha(asignacionActiva.idAsignacion, "");
            const registros = response.asistencias || [];
            
            const agrupado = {};
            registros.forEach(a => {
                const f = a.fecha;
                if (!agrupado[f]) {
                    agrupado[f] = { fecha: f, presentes: 0, ausentes: 0, justificados: 0, atrasos: 0, total: 0 };
                }
                agrupado[f].total += 1;
                if (a.estado === 'PRESENTE') agrupado[f].presentes += 1;
                else if (a.estado === 'AUSENTE') agrupado[f].ausentes += 1;
                else if (a.estado === 'JUSTIFICADO') agrupado[f].justificados += 1;
                else if (a.estado === 'ATRASO') agrupado[f].atrasos += 1;
            });
            
            const list = Object.values(agrupado).sort((a, b) => b.fecha.localeCompare(a.fecha));
            setHistorial(list);
        } catch (error) {
            console.error("Error al cargar historial:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleEstadoChange = (idMatricula, estado) => {
        setAsistencias(prev => ({
            ...prev,
            [idMatricula]: { ...prev[idMatricula], estado }
        }));
    };

    const handleJustificacionChange = (idMatricula, justificacion) => {
        setAsistencias(prev => ({
            ...prev,
            [idMatricula]: { ...prev[idMatricula], justificacion }
        }));
    };

    const handleGuardar = async () => {
        if (esFechaFutura) return;
        try {
            setGuardando(true);
            setMensaje({ tipo: '', texto: '' });
            
            const response = await getAsistenciaPorAsignacionYFecha(asignacionActiva.idAsignacion, fecha);
            const registrosCargados = response.asistencias || [];
            
            const nuevosRegistros = [];
            const registrosModificados = [];
            
            estudiantes.forEach(est => {
                const current = asistencias[est.idMatricula];
                if (!current) return;
                
                const original = registrosCargados.find(r => (r.id_matricula !== undefined ? r.id_matricula : r.idMatricula) === est.idMatricula);
                
                if (!original) {
                    nuevosRegistros.push({
                        idMatricula: est.idMatricula,
                        estado: current.estado,
                        justificacion: current.justificacion || ''
                    });
                } else {
                    const originalEstado = original.estado;
                    const originalJust = original.justificacion || '';
                    if (current.estado !== originalEstado || (current.justificacion || '') !== originalJust) {
                        registrosModificados.push({
                            idAsistencia: original.id_asistencia !== undefined ? original.id_asistencia : original.idAsistencia,
                            estado: current.estado,
                            justificacion: current.justificacion || ''
                        });
                    }
                }
            });

            if (nuevosRegistros.length === 0 && registrosModificados.length === 0) {
                setMensaje({ tipo: 'warning', texto: 'No se detectaron cambios en el registro diario.' });
                setGuardando(false);
                return;
            }

            // 1. Guardar registros nuevos
            if (nuevosRegistros.length > 0) {
                const payload = {
                    idAsignacion: asignacionActiva.idAsignacion,
                    idPeriodo: 1, 
                    fecha: fecha,
                    asistencias: nuevosRegistros
                };
                await registrarAsistenciaGrupal(payload);
            }

            // 2. Actualizar registros modificados
            for (const mod of registrosModificados) {
                await actualizarAsistencia(mod.idAsistencia, {
                    estado: mod.estado,
                    justificacion: mod.justificacion
                });
            }

            setMensaje({ tipo: 'success', texto: '¡Asistencia general del curso guardada y actualizada correctamente!' });
            cargarAsistenciaDia();
        } catch (error) {
            console.error(error);
            setMensaje({ 
                tipo: 'error', 
                texto: error.response?.data?.message || 'Error al guardar la asistencia general en el servidor.' 
            });
        } finally {
            setGuardando(false);
        }
    };

    const verEditarHistorialFecha = (fechaHistorial) => {
        setFecha(fechaHistorial);
        setSeccionActiva('diario');
    };

    const getIniciales = (nombres, apellidos) => {
        const n = nombres ? nombres.charAt(0) : '';
        const a = apellidos ? apellidos.charAt(0) : '';
        return (n + a).toUpperCase();
    };

    if (!asignacionActiva) {
        return (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 p-8 rounded-2xl text-center shadow-sm">
                <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                </div>
                <h3 className="text-lg font-bold text-amber-800 mb-1">Sin Asignatura Seleccionada</h3>
                <p className="text-amber-700 text-sm max-w-md mx-auto">Selecciona una asignatura del panel lateral o panel principal para cargar la gestión de asistencia.</p>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Cabecera Premium */}
            <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-blue-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none">
                    <svg className="w-64 h-64 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z" />
                    </svg>
                </div>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                    <div>
                        <span className="bg-blue-500/20 text-blue-300 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold tracking-wide uppercase">Asistencia Escolar</span>
                        <h2 className="text-3xl font-extrabold tracking-tight mt-2">{asignacionActiva.asignatura.nombre}</h2>
                        <p className="text-slate-300 text-sm mt-1 flex items-center gap-2">
                            <span>Grado: <strong>{asignacionActiva.grado.nombre}</strong></span>
                            <span>•</span>
                            <span>Año Lectivo: <strong>{asignacionActiva.anoLectivo.nombre}</strong></span>
                        </p>
                    </div>
                    
                    {/* Switcher de Pestañas Premium */}
                    <div className="bg-slate-800/80 backdrop-blur-md p-1.5 rounded-2xl border border-slate-700/50 flex">
                        {[
                            { id: 'diario', label: 'Control Diario', icon: '📝' },
                            { id: 'historial', label: 'Historial', icon: '📅' },
                            { id: 'resumen', label: 'Resumen Periodo', icon: '📊' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setSeccionActiva(tab.id)}
                                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 ${
                                    seccionActiva === tab.id 
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30 translate-y-[-1px]' 
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                                }`}
                            >
                                <span>{tab.icon}</span>
                                <span>{tab.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Mensaje Informativo Flotante */}
            {mensaje.texto && (
                <div className={`p-4 rounded-2xl text-sm border flex items-center gap-3 animate-fade-in shadow-sm ${
                    mensaje.tipo === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                    mensaje.tipo === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' :
                    'bg-amber-50 text-amber-800 border-amber-200'
                }`}>
                    <span className="text-xl">
                        {mensaje.tipo === 'success' ? '✨' : mensaje.tipo === 'error' ? '🚫' : '⚠️'}
                    </span>
                    <span className="font-medium">{mensaje.texto}</span>
                </div>
            )}

            {/* VISTA 1: REGISTRO DIARIO */}
            {seccionActiva === 'diario' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                    {/* Banner de Jornada Escolar Finalizada */}
                    {autoLlenadoActivo && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 p-4 rounded-2xl text-blue-900 text-sm flex items-start gap-3 shadow-inner">
                            <span className="text-xl mt-0.5">💡</span>
                            <div>
                                <h4 className="font-bold text-blue-950">Auto-llenado de Jornada Finalizado</h4>
                                <p className="text-blue-800 text-xs mt-0.5">El horario de la clase ha concluido. El sistema pre-cargó automáticamente el estado de todos los estudiantes como <strong>PRESENTE</strong> para facilitar tu registro. Modifica los ausentes y haz clic en <strong>Guardar Cambios</strong>.</p>
                            </div>
                        </div>
                    )}

                    {/* Controles de Registro */}
                    <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                        <div className="flex items-center gap-3">
                            <span className="text-slate-500 font-semibold text-sm">Fecha a registrar:</span>
                            <div className="relative">
                                <input 
                                    type="date" 
                                    value={fecha}
                                    max={hoyStr}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                                />
                            </div>
                        </div>

                        {esFechaFutura ? (
                            <div className="bg-rose-50 border border-rose-200 px-4 py-2 rounded-xl text-rose-700 font-bold text-xs">
                                ❌ No se puede registrar asistencia en fechas futuras
                            </div>
                        ) : (
                            <button
                                onClick={handleGuardar}
                                disabled={guardando || loading}
                                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm px-6 py-3 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 disabled:opacity-50 flex items-center gap-2"
                            >
                                {guardando ? (
                                    <>
                                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        <span>Guardando...</span>
                                    </>
                                ) : (
                                    <>
                                        <span>💾</span>
                                        <span>Guardar Asistencia General</span>
                                    </>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Tabla de Estudiantes */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                            <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Sincronizando información...</span>
                        </div>
                    ) : (
                        <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs tracking-wider uppercase border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Estudiante</th>
                                        <th className="px-6 py-4 text-center">Estado de Asistencia</th>
                                        <th className="px-6 py-4">Observación / Justificación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {estudiantes.map((est) => {
                                        const asis = asistencias[est.idMatricula] || { estado: 'PRESENTE', justificacion: '' };
                                        const yaRegistrado = !!asis.idAsistencia;
                                        
                                        return (
                                            <tr key={est.idMatricula} className="hover:bg-slate-50/50 transition-colors">
                                                {/* Estudiante avatar e info */}
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 text-slate-600 flex items-center justify-center text-xs font-bold border border-slate-300/40">
                                                            {getIniciales(est.estudiante.nombres, est.estudiante.apellidos)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm leading-snug">
                                                                {est.estudiante.apellidos} {est.estudiante.nombres}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                                                                <span>C.I. {est.estudiante.cedula}</span>
                                                                {yaRegistrado && (
                                                                    <>
                                                                        <span>•</span>
                                                                        <span className="text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">Guardado</span>
                                                                    </>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                </td>
                                                {/* Control de Estados con Estilos Premium */}
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex bg-slate-100 p-1.5 rounded-2xl gap-1 border border-slate-200/50 shadow-inner">
                                                        {[
                                                            { key: 'PRESENTE', label: 'Presente', badge: 'bg-emerald-500 text-white shadow-md shadow-emerald-500/20' },
                                                            { key: 'AUSENTE', label: 'Ausente', badge: 'bg-rose-500 text-white shadow-md shadow-rose-500/20' },
                                                            { key: 'JUSTIFICADO', label: 'Justificado', badge: 'bg-blue-500 text-white shadow-md shadow-blue-500/20' },
                                                            { key: 'ATRASO', label: 'Atraso', badge: 'bg-amber-500 text-white shadow-md shadow-amber-500/20' }
                                                        ].map(state => {
                                                            const isActive = asis.estado === state.key;
                                                            return (
                                                                <button
                                                                    key={state.key}
                                                                    type="button"
                                                                    disabled={esFechaFutura}
                                                                    onClick={() => handleEstadoChange(est.idMatricula, state.key)}
                                                                    className={`px-4 py-2 rounded-xl text-xs font-bold tracking-tight transition-all duration-300 ${
                                                                        isActive 
                                                                            ? state.badge 
                                                                            : 'text-slate-400 hover:text-slate-800 hover:bg-white'
                                                                    }`}
                                                                >
                                                                    {state.label}
                                                                </button>
                                                            );
                                                        })}
                                                    </div>
                                                </td>
                                                {/* Input de Justificación */}
                                                <td className="px-6 py-4">
                                                    <div className="relative">
                                                        <input 
                                                            type="text" 
                                                            value={asis.justificacion || ''}
                                                            onChange={(e) => handleJustificacionChange(est.idMatricula, e.target.value)}
                                                            disabled={esFechaFutura || (asis.estado !== 'JUSTIFICADO' && asis.estado !== 'ATRASO' && asis.estado !== 'AUSENTE')}
                                                            placeholder={
                                                                asis.estado === 'JUSTIFICADO' ? 'Escribe el motivo del justificativo...' :
                                                                asis.estado === 'ATRASO' ? 'Escribe la justificación del atraso...' :
                                                                asis.estado === 'AUSENTE' ? 'Razón de inasistencia (opcional)...' :
                                                                'No requiere justificación'
                                                            }
                                                            className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white disabled:bg-slate-100/60 disabled:text-slate-400 disabled:placeholder-slate-300 disabled:border-transparent transition-all"
                                                        />
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {estudiantes.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-6 py-12 text-center text-slate-400">
                                                <div className="text-3xl mb-2">👥</div>
                                                <p className="font-semibold text-slate-500">Sin estudiantes matriculados</p>
                                                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">No se encontraron estudiantes registrados en este grado y año lectivo.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 2: HISTORIAL DE ASISTENCIAS */}
            {seccionActiva === 'historial' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Bitácora Histórica</h3>
                        <p className="text-slate-500 text-xs mt-0.5">Control y métricas globales de asistencia por día de clase.</p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                            <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Buscando historial de asistencias...</span>
                        </div>
                    ) : (
                        <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs tracking-wider uppercase border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Fecha de Clase</th>
                                        <th className="px-6 py-4 text-center text-emerald-600">Presentes</th>
                                        <th className="px-6 py-4 text-center text-rose-600">Ausentes</th>
                                        <th className="px-6 py-4 text-center text-blue-600">Justificados</th>
                                        <th className="px-6 py-4 text-center text-amber-600">Atrasos</th>
                                        <th className="px-6 py-4 text-center">Asistencia Promedio</th>
                                        <th className="px-6 py-4 text-center">Acciones</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historial.map((item) => {
                                        const pct = item.total > 0 ? ((item.presentes + item.justificados + item.atrasos) / item.total) * 100 : 0;
                                        return (
                                            <tr key={item.fecha} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-lg">📅</span>
                                                        <span className="font-bold text-slate-800 text-sm">{item.fecha}</span>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{item.presentes}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{item.ausentes}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{item.justificados}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{item.atrasos}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className={`px-2.5 py-1 rounded-full font-extrabold text-[10px] ${
                                                            pct >= 85 ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' :
                                                            pct >= 70 ? 'bg-amber-50 text-amber-700 border border-amber-200' :
                                                            'bg-rose-50 text-rose-700 border border-rose-200'
                                                        }`}>
                                                            {pct.toFixed(1)}%
                                                        </span>
                                                        {/* Mini Barra de progreso */}
                                                        <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${
                                                                    pct >= 85 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                                                                }`}
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <button 
                                                        onClick={() => verEditarHistorialFecha(item.fecha)}
                                                        className="bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-600 hover:text-white px-3 py-1.5 rounded-xl text-xs font-bold tracking-tight transition-all duration-300"
                                                    >
                                                        📝 Ver / Editar
                                                    </button>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {historial.length === 0 && (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                                <div className="text-3xl mb-2">📁</div>
                                                <p className="font-semibold text-slate-500">Historial vacío</p>
                                                <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">Todavía no has registrado ninguna asistencia para este curso. Las asistencias registradas se listarán aquí.</p>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* VISTA 3: RESUMEN ACUMULADO */}
            {seccionActiva === 'resumen' && (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 space-y-6">
                    <div>
                        <h3 className="text-lg font-bold text-slate-800">Resumen del Periodo Académico</h3>
                        <p className="text-slate-500 text-xs mt-0.5">Estadísticas acumuladas de todos los estudiantes inscritos en la materia.</p>
                    </div>

                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-3">
                            <div className="w-8 h-8 border-4 border-slate-300 border-t-blue-600 rounded-full animate-spin"></div>
                            <span className="text-sm font-medium">Calculando porcentajes acumulados...</span>
                        </div>
                    ) : (
                        <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm bg-white">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-50 text-slate-500 font-semibold text-xs tracking-wider uppercase border-b border-slate-100">
                                    <tr>
                                        <th className="px-6 py-4">Estudiante</th>
                                        <th className="px-6 py-4 text-center text-emerald-600">Presentes</th>
                                        <th className="px-6 py-4 text-center text-rose-600">Ausentes</th>
                                        <th className="px-6 py-4 text-center text-blue-600">Justificados</th>
                                        <th className="px-6 py-4 text-center text-amber-600">Atrasos</th>
                                        <th className="px-6 py-4 text-center">% Asistencia</th>
                                        <th className="px-6 py-4 text-center">Estado Alerta</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {estudiantes.map(est => {
                                        const res = resumenes.find(r => r.idMatricula === est.idMatricula) || {
                                            totalPresentes: 0, totalAusentes: 0, totalJustificados: 0, totalAtrasos: 0, porcentajeAsistencia: 0
                                        };
                                        const pct = res.porcentajeAsistencia;
                                        
                                        // Clasificación escolar de asistencia
                                        let alertBadge = 'bg-emerald-50 text-emerald-700 border border-emerald-100';
                                        let alertText = 'Excelente';
                                        if (pct < 70) {
                                            alertBadge = 'bg-rose-50 text-rose-700 border border-rose-100 animate-pulse';
                                            alertText = 'En Riesgo';
                                        } else if (pct < 80) {
                                            alertBadge = 'bg-amber-50 text-amber-700 border border-amber-100';
                                            alertText = 'Regular';
                                        }

                                        return (
                                            <tr key={est.idMatricula} className="hover:bg-slate-50/50 transition-colors">
                                                <td className="px-6 py-4">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-[10px] font-bold border border-slate-200">
                                                            {getIniciales(est.estudiante.nombres, est.estudiante.apellidos)}
                                                        </div>
                                                        <div>
                                                            <div className="font-bold text-slate-800 text-sm leading-snug">
                                                                {est.estudiante.apellidos} {est.estudiante.nombres}
                                                            </div>
                                                            <div className="text-[10px] text-slate-400 mt-0.5">Matrícula #{est.idMatricula}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{res.totalPresentes}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{res.totalAusentes}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{res.totalJustificados}</td>
                                                <td className="px-6 py-4 text-center font-bold text-slate-700">{res.totalAtrasos}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="flex flex-col items-center gap-1">
                                                        <span className="font-extrabold text-slate-800 text-sm">{pct.toFixed(1)}%</span>
                                                        <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                            <div 
                                                                className={`h-full rounded-full ${
                                                                    pct >= 80 ? 'bg-emerald-500' : pct >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                                                                }`}
                                                                style={{ width: `${pct}%` }}
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${alertBadge}`}>
                                                        {alertText}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
