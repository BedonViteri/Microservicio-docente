import { useState, useEffect } from 'react';
import { 
    getEstudiantesPorAsignacion, 
    getAsistenciaPorAsignacionYFecha, 
    registrarAsistenciaGrupal, 
    getResumenAsistencia, 
    actualizarAsistencia 
} from '../../services/docente/docenteService';

export default function DocenteAsistencia({ asignacionActiva, asignaciones, onAsignacionChange }) {
    const [estudiantes, setEstudiantes] = useState([]);
    const [asistencias, setAsistencias] = useState({});
    const [resumenes, setResumenes] = useState([]);
    const [historial, setHistorial] = useState([]);
    const [todosLosRegistros, setTodosLosRegistros] = useState([]);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const [seccionActiva, setSeccionActiva] = useState('diario'); // 'diario', 'historial', 'resumen'
    const [subVistaResumen, setSubVistaResumen] = useState('general'); // 'general', 'dias' (matriz)
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
            } else {
                cargarDatosHistorialYResumen();
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
            
            // Sobrescribir si ya hay registros
            registros.forEach(reg => {
                const idMat = reg.id_matricula !== undefined ? reg.id_matricula : reg.idMatricula;
                nuevaAsistencia[idMat] = {
                    estado: reg.estado,
                    justificacion: reg.justificacion || '',
                    idAsistencia: reg.id_asistencia !== undefined ? reg.id_asistencia : reg.idAsistencia
                };
            });

            // Lógica de auto-guardado automático si la clase ya finalizó hoy
            const tieneRegistrosGuardados = registros.length > 0;
            if (!tieneRegistrosGuardados && fecha === hoyStr) {
                const ahora = new Date();
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

    const cargarDatosHistorialYResumen = async () => {
        try {
            setLoading(true);
            
            // Consultar todos los registros de asistencia para agrupar
            const response = await getAsistenciaPorAsignacionYFecha(asignacionActiva.idAsignacion, "");
            const registros = response.asistencias || [];
            setTodosLosRegistros(registros);
            
            // Generar historial agrupado por fecha
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
            
            // Generar resúmenes localmente a partir de los registros reales para máxima precisión y sincronización inmediata
            const calculatedResumenes = estudiantes.map(est => {
                const studentAsis = registros.filter(r => (r.id_matricula !== undefined ? r.id_matricula : r.idMatricula) === est.idMatricula);
                
                let totalPresentes = 0;
                let totalAusentes = 0;
                let totalJustificados = 0;
                let totalAtrasos = 0;
                
                studentAsis.forEach(r => {
                    if (r.estado === 'PRESENTE') totalPresentes += 1;
                    else if (r.estado === 'AUSENTE') totalAusentes += 1;
                    else if (r.estado === 'JUSTIFICADO') totalJustificados += 1;
                    else if (r.estado === 'ATRASO') totalAtrasos += 1;
                });
                
                const total = totalPresentes + totalAusentes + totalJustificados + totalAtrasos;
                const porcentajeAsistencia = total > 0 ? ((totalPresentes + totalJustificados + totalAtrasos) / total) * 100 : 0;
                
                return {
                    idMatricula: est.idMatricula,
                    totalPresentes,
                    totalAusentes,
                    totalJustificados,
                    totalAtrasos,
                    porcentajeAsistencia
                };
            });
            setResumenes(calculatedResumenes);
        } catch (error) {
            console.error("Error al cargar datos generales de asistencia:", error);
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
                setMensaje({ tipo: 'warning', texto: 'No se detectaron cambios para guardar.' });
                setGuardando(false);
                return;
            }

            if (nuevosRegistros.length > 0) {
                const payload = {
                    idAsignacion: asignacionActiva.idAsignacion,
                    idPeriodo: 1, 
                    fecha: fecha,
                    asistencias: nuevosRegistros
                };
                await registrarAsistenciaGrupal(payload);
            }

            for (const mod of registrosModificados) {
                await actualizarAsistencia(mod.idAsistencia, {
                    estado: mod.estado,
                    justificacion: mod.justificacion
                });
            }

            setMensaje({ tipo: 'success', texto: 'Asistencia registrada correctamente.' });
            cargarAsistenciaDia();
        } catch (error) {
            console.error(error);
            setMensaje({ tipo: 'error', texto: error.response?.data?.message || 'Error al guardar la asistencia.' });
        } finally {
            setGuardando(false);
        }
    };

    const verEditarHistorialFecha = (fechaHistorial) => {
        setFecha(fechaHistorial);
        setSeccionActiva('diario');
    };

    // Obtener las fechas únicas en las que se ha registrado asistencia
    const fechasUnicas = [...new Set(todosLosRegistros.map(r => r.fecha))].sort((a, b) => a.localeCompare(b));

    const formatFechaCorta = (fechaStr) => {
        if (!fechaStr) return '';
        const parts = fechaStr.split('-');
        if (parts.length === 3) {
            return `${parts[2]}/${parts[1]}`;
        }
        return fechaStr;
    };

    return (
        <div>
            {/* Encabezado Simple */}
            <div className="flex justify-between items-end mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Asistencia</h1>
                    <p className="text-slate-500 text-sm mt-1">Gestione el control diario y acumulado de asistencia de sus cursos.</p>
                </div>
                {asignacionActiva && (
                    <div className="bg-slate-100 p-1 rounded-lg inline-flex shadow-sm">
                        <button 
                            onClick={() => setSeccionActiva('diario')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition ${seccionActiva === 'diario' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Registro Diario
                        </button>
                        <button 
                            onClick={() => setSeccionActiva('historial')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition ${seccionActiva === 'historial' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Historial
                        </button>
                        <button 
                            onClick={() => setSeccionActiva('resumen')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition ${seccionActiva === 'resumen' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Resumen
                        </button>
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
                    <p className="text-yellow-700 font-medium text-sm">Por favor, seleccione una asignatura desde el Panel Principal para gestionar su asistencia.</p>
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

            {/* VISTA 1: REGISTRO DIARIO */}
            {seccionActiva === 'diario' && asignacionActiva && (
                <div className="space-y-6">
                    {autoLlenadoActivo && (
                        <div className="p-4 bg-blue-50 border border-blue-200 text-blue-800 rounded-xl text-xs">
                            ⚠️ <strong>Auto-llenado activo:</strong> La clase de hoy ya finalizó. Se pre-cargó la asistencia como PRESENTE para todos los estudiantes de forma automática. Guarde para registrar en el sistema.
                        </div>
                    )}

                    <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-wrap items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-700">Fecha:</label>
                            <input 
                                type="date" 
                                value={fecha}
                                max={hoyStr}
                                onChange={(e) => setFecha(e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                            />
                        </div>
                        
                        {esFechaFutura ? (
                            <span className="text-red-600 text-xs font-semibold">❌ No se puede registrar asistencia en fechas futuras.</span>
                        ) : (
                            <button 
                                onClick={handleGuardar}
                                disabled={guardando || loading}
                                className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                            >
                                {guardando ? 'Guardando...' : 'Guardar Asistencia'}
                            </button>
                        )}
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Cargando estudiantes...</div>
                    ) : (
                        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-3 font-semibold">Estudiante</th>
                                        <th className="px-6 py-3 font-semibold text-center">Estado</th>
                                        <th className="px-6 py-3 font-semibold max-w-[200px]">Justificación / Observación</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {estudiantes.map((est) => {
                                        const asis = asistencias[est.idMatricula] || { estado: 'PRESENTE', justificacion: '' };
                                        
                                        return (
                                            <tr key={est.idMatricula} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 font-medium text-slate-800">
                                                    {est.estudiante.apellidos} {est.estudiante.nombres}
                                                </td>
                                                <td className="px-6 py-4 text-center">
                                                    <div className="inline-flex bg-slate-100 rounded-lg p-1">
                                                        {['PRESENTE', 'AUSENTE', 'JUSTIFICADO', 'ATRASO'].map(estado => (
                                                            <button
                                                                key={estado}
                                                                type="button"
                                                                disabled={esFechaFutura}
                                                                onClick={() => handleEstadoChange(est.idMatricula, estado)}
                                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                                                                    asis.estado === estado 
                                                                        ? estado === 'PRESENTE' ? 'bg-green-500 text-white shadow-sm' 
                                                                        : estado === 'AUSENTE' ? 'bg-red-500 text-white shadow-sm'
                                                                        : estado === 'JUSTIFICADO' ? 'bg-blue-500 text-white shadow-sm'
                                                                        : 'bg-yellow-500 text-white shadow-sm'
                                                                        : 'text-slate-500 hover:bg-slate-200'
                                                                }`}
                                                            >
                                                                <span className="hidden md:inline">
                                                                    {estado === 'PRESENTE' ? 'Presente' : estado === 'AUSENTE' ? 'Ausente' : estado === 'JUSTIFICADO' ? 'Justificado' : 'Atraso'}
                                                                </span>
                                                                <span className="inline md:hidden">
                                                                    {estado === 'PRESENTE' ? 'P' : estado === 'AUSENTE' ? 'A' : estado === 'JUSTIFICADO' ? 'J' : 'AT'}
                                                                </span>
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4 max-w-[200px]">
                                                    <input 
                                                        type="text" 
                                                        value={asis.justificacion || ''}
                                                        onChange={(e) => handleJustificacionChange(est.idMatricula, e.target.value)}
                                                        disabled={esFechaFutura || (asis.estado !== 'JUSTIFICADO' && asis.estado !== 'ATRASO' && asis.estado !== 'AUSENTE')}
                                                        placeholder={asis.estado === 'JUSTIFICADO' ? 'Justificar...' : ''}
                                                        className="w-full px-2 py-1 border border-slate-200 rounded text-[11px] focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                                                    />
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

            {/* VISTA 2: HISTORIAL */}
            {seccionActiva === 'historial' && asignacionActiva && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-6">
                    <h3 className="text-base font-bold text-slate-800 mb-4">Registro Histórico de Clases</h3>
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Cargando historial...</div>
                    ) : (
                        <table className="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                    <th className="px-6 py-3 font-semibold">Fecha</th>
                                    <th className="px-6 py-3 font-semibold text-center text-green-600">Presentes</th>
                                    <th className="px-6 py-3 font-semibold text-center text-red-600">Ausentes</th>
                                    <th className="px-6 py-3 font-semibold text-center text-blue-600">Justificados</th>
                                    <th className="px-6 py-3 font-semibold text-center text-yellow-600">Atrasos</th>
                                    <th className="px-6 py-3 font-semibold text-center">Asistencia Total</th>
                                    <th className="px-6 py-3 font-semibold text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historial.map((item) => {
                                    const pct = item.total > 0 ? ((item.presentes + item.justificados + item.atrasos) / item.total) * 100 : 0;
                                    return (
                                        <tr key={item.fecha} className="hover:bg-slate-50 transition">
                                            <td className="px-6 py-4 font-semibold text-slate-850">{item.fecha}</td>
                                            <td className="px-6 py-4 text-center font-semibold text-slate-700">{item.presentes}</td>
                                            <td className="px-6 py-4 text-center font-semibold text-slate-700">{item.ausentes}</td>
                                            <td className="px-6 py-4 text-center font-semibold text-slate-700">{item.justificados}</td>
                                            <td className="px-6 py-4 text-center font-semibold text-slate-700">{item.atrasos}</td>
                                            <td className="px-6 py-4 text-center">
                                                <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                                    pct >= 80 ? 'bg-green-100 text-green-700' :
                                                    pct >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                    'bg-red-100 text-red-700'
                                                }`}>
                                                    {pct.toFixed(1)}%
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <button 
                                                    onClick={() => verEditarHistorialFecha(item.fecha)}
                                                    className="text-blue-600 hover:text-blue-800 font-semibold text-xs transition"
                                                >
                                                    Ver / Editar
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {historial.length === 0 && (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-10 text-center text-slate-500">
                                            No se han guardado registros de asistencia en esta asignatura.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* VISTA 3: RESUMEN (VISTA GENERAL / VISTA POR DIAS DETALLADA) */}
            {seccionActiva === 'resumen' && asignacionActiva && (
                <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm p-6 space-y-6">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                        <div>
                            <h3 className="text-base font-bold text-slate-800">Resumen del Periodo Académico</h3>
                            <p className="text-slate-500 text-xs mt-1">Estadísticas acumuladas generales y detalle diario por alumno.</p>
                        </div>
                        {/* Selector de sub-vistas */}
                        <div className="bg-slate-100 p-1 rounded-lg inline-flex text-xs shadow-sm">
                            <button
                                onClick={() => setSubVistaResumen('general')}
                                className={`px-3 py-1.5 rounded-md font-medium transition ${subVistaResumen === 'general' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Vista General
                            </button>
                            <button
                                onClick={() => setSubVistaResumen('dias')}
                                className={`px-3 py-1.5 rounded-md font-medium transition ${subVistaResumen === 'dias' ? 'bg-white shadow-sm text-blue-600 font-semibold' : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                Vista por Días
                            </button>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Cargando datos del periodo...</div>
                    ) : subVistaResumen === 'general' ? (
                        /* SUB-VISTA 1: VISTA GENERAL (SOLO SUMATORIAS) */
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left border-collapse text-sm">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-xs text-slate-500 uppercase tracking-wider">
                                        <th className="px-6 py-3 font-semibold">Estudiante</th>
                                        <th className="px-6 py-3 font-semibold text-center text-green-600">Presentes (P)</th>
                                        <th className="px-6 py-3 font-semibold text-center text-red-600">Ausentes (A)</th>
                                        <th className="px-6 py-3 font-semibold text-center text-blue-600">Justificados (J)</th>
                                        <th className="px-6 py-3 font-semibold text-center text-yellow-600">Atrasos (AT)</th>
                                        <th className="px-6 py-3 font-semibold text-center">% Cumplimiento</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {estudiantes.map((est) => {
                                        const res = resumenes.find(r => r.idMatricula === est.idMatricula) || {
                                            totalPresentes: 0, totalAusentes: 0, totalJustificados: 0, totalAtrasos: 0, porcentajeAsistencia: 0
                                        };
                                        const pct = res.porcentajeAsistencia;
                                        
                                        return (
                                            <tr key={est.idMatricula} className="hover:bg-slate-50 transition">
                                                <td className="px-6 py-4 font-medium text-slate-800">
                                                    {est.estudiante.apellidos} {est.estudiante.nombres}
                                                </td>
                                                <td className="px-6 py-4 text-center font-bold text-green-600">{res.totalPresentes}</td>
                                                <td className="px-6 py-4 text-center font-bold text-red-600">{res.totalAusentes}</td>
                                                <td className="px-6 py-4 text-center font-bold text-blue-600">{res.totalJustificados}</td>
                                                <td className="px-6 py-4 text-center font-bold text-yellow-600">{res.totalAtrasos}</td>
                                                <td className="px-6 py-4 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                                        pct >= 80 ? 'bg-green-100 text-green-700' :
                                                        pct >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {pct.toFixed(1)}%
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* SUB-VISTA 2: VISTA DETALLADA POR DIAS (MATRIZ COMPLETA) */
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                    <tr className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-500 uppercase tracking-wider">
                                        <th className="px-4 py-3 font-semibold sticky left-0 bg-slate-50 z-10 border-r border-slate-200">Estudiante</th>
                                        {fechasUnicas.map(f => (
                                            <th key={f} className="px-2 py-3 text-center font-semibold min-w-[50px] border-r border-slate-100" title={f}>
                                                {formatFechaCorta(f)}
                                            </th>
                                        ))}
                                        <th className="px-3 py-3 text-center font-semibold text-green-600 border-l border-slate-200">P</th>
                                        <th className="px-3 py-3 text-center font-semibold text-rose-600">A</th>
                                        <th className="px-3 py-3 text-center font-semibold text-blue-600">J</th>
                                        <th className="px-3 py-3 text-center font-semibold text-amber-600">AT</th>
                                        <th className="px-4 py-3 text-center font-semibold text-slate-700 bg-slate-50 sticky right-0 z-10 border-l border-slate-200">Asist %</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-slate-700">
                                    {estudiantes.map((est) => {
                                        const res = resumenes.find(r => r.idMatricula === est.idMatricula) || {
                                            totalPresentes: 0, totalAusentes: 0, totalJustificados: 0, totalAtrasos: 0, porcentajeAsistencia: 0
                                        };
                                        const pct = res.porcentajeAsistencia;
                                        
                                        return (
                                            <tr key={est.idMatricula} className="hover:bg-slate-50 transition">
                                                <td className="px-4 py-3 font-semibold text-slate-800 sticky left-0 bg-white z-10 border-r border-slate-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                                                    {est.estudiante.apellidos} {est.estudiante.nombres}
                                                </td>
                                                
                                                {fechasUnicas.map(f => {
                                                    const rec = todosLosRegistros.find(r => 
                                                        (r.id_matricula !== undefined ? r.id_matricula : r.idMatricula) === est.idMatricula && r.fecha === f
                                                    );
                                                    
                                                    let indicator = '—';
                                                    let badgeClass = 'text-slate-300';
                                                    
                                                    if (rec) {
                                                        if (rec.estado === 'PRESENTE') {
                                                            indicator = 'P';
                                                            badgeClass = 'text-green-700 font-bold bg-green-50 px-1.5 py-0.5 rounded border border-green-200';
                                                        } else if (rec.estado === 'AUSENTE') {
                                                            indicator = 'A';
                                                            badgeClass = 'text-red-700 font-bold bg-red-50 px-1.5 py-0.5 rounded border border-red-200';
                                                        } else if (rec.estado === 'JUSTIFICADO') {
                                                            indicator = 'J';
                                                            badgeClass = 'text-blue-700 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200';
                                                        } else if (rec.estado === 'ATRASO') {
                                                            indicator = 'AT';
                                                            badgeClass = 'text-yellow-700 font-bold bg-yellow-50 px-1 py-0.5 rounded border border-yellow-200';
                                                        }
                                                    }
                                                    
                                                    return (
                                                        <td key={f} className="px-2 py-3 text-center border-r border-slate-100">
                                                            <span className={badgeClass} title={rec && rec.justificacion ? `Justificación: ${rec.justificacion}` : ''}>
                                                                {indicator}
                                                            </span>
                                                        </td>
                                                    );
                                                })}
                                                
                                                <td className="px-3 py-3 text-center font-semibold text-green-600 border-l border-slate-200">{res.totalPresentes}</td>
                                                <td className="px-3 py-3 text-center font-semibold text-rose-600">{res.totalAusentes}</td>
                                                <td className="px-3 py-3 text-center font-semibold text-blue-600">{res.totalJustificados}</td>
                                                <td className="px-3 py-3 text-center font-semibold text-amber-600">{res.totalAtrasos}</td>
                                                
                                                <td className="px-4 py-3 text-center sticky right-0 bg-white z-10 border-l border-slate-200 font-bold">
                                                    <span className={`px-2 py-1 rounded text-[11px] font-extrabold ${
                                                        pct >= 80 ? 'bg-green-50 text-green-700 border border-green-150' :
                                                        pct >= 70 ? 'bg-yellow-50 text-yellow-700 border border-yellow-150' :
                                                        'bg-red-50 text-red-700 border border-red-150'
                                                    }`}>
                                                        {pct.toFixed(1)}%
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
