import { useState, useEffect } from 'react';
import { getEstudiantesPorAsignacion, getAsistenciaPorAsignacionYFecha, registrarAsistenciaGrupal, getResumenAsistencia } from '../../services/docente/docenteService';

export default function DocenteAsistencia({ asignacionActiva }) {
    const [estudiantes, setEstudiantes] = useState([]);
    const [asistencias, setAsistencias] = useState({});
    const [resumenes, setResumenes] = useState([]);
    const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(false);
    const [guardando, setGuardando] = useState(false);
    const [mensaje, setMensaje] = useState({ tipo: '', texto: '' });
    const [vistaResumen, setVistaResumen] = useState(false);

    useEffect(() => {
        if (asignacionActiva) {
            cargarEstudiantes();
        }
    }, [asignacionActiva]);

    useEffect(() => {
        if (asignacionActiva && estudiantes.length > 0) {
            if (vistaResumen) {
                cargarResumen();
            } else {
                cargarAsistenciaDia();
            }
        }
    }, [asignacionActiva, estudiantes, fecha, vistaResumen]);

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
            const response = await getAsistenciaPorAsignacionYFecha(asignacionActiva.idAsignacion, fecha);
            const registros = response.asistencias || [];
            
            const nuevaAsistencia = {};
            // Inicializar todos con PRESENTE (regla de negocio: por defecto para agilizar, pero no se guarda automáticamente)
            estudiantes.forEach(est => {
                nuevaAsistencia[est.idMatricula] = { estado: 'PRESENTE', justificacion: '', idAsistencia: null };
            });
            
            // Sobrescribir si ya hay registros
            registros.forEach(reg => {
                nuevaAsistencia[reg.idMatricula] = {
                    estado: reg.estado,
                    justificacion: reg.justificacion || '',
                    idAsistencia: reg.idAsistencia
                };
            });
            
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
            setResumenes(response.resumenes || []);
        } catch (error) {
            console.error("Error al cargar resumen:", error);
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
        try {
            setGuardando(true);
            setMensaje({ tipo: '', texto: '' });
            
            // Filtrar solo los que no tienen idAsistencia (los nuevos)
            const nuevosRegistros = estudiantes
                .filter(est => !asistencias[est.idMatricula].idAsistencia)
                .map(est => ({
                    idMatricula: est.idMatricula,
                    estado: asistencias[est.idMatricula].estado,
                    justificacion: asistencias[est.idMatricula].justificacion
                }));

            if (nuevosRegistros.length === 0) {
                setMensaje({ tipo: 'warning', texto: 'Todos los estudiantes ya tienen registro para esta fecha.' });
                setGuardando(false);
                return;
            }

            const payload = {
                idAsignacion: asignacionActiva.idAsignacion,
                idPeriodo: 1, 
                fecha: fecha,
                asistencias: nuevosRegistros
            };
            
            // FIXME: id_periodo debe venir de un selector de periodo (trimestre).
            // Por simplicidad, hardcodeamos 1 si no hay selector de trimestres en el prototipo.
            payload.id_periodo = 1; 

            await registrarAsistenciaGrupal(payload);
            setMensaje({ tipo: 'success', texto: 'Asistencia registrada correctamente.' });
            cargarAsistenciaDia();
        } catch (error) {
            console.error(error);
            setMensaje({ tipo: 'error', texto: error.response?.data?.message || 'Error al guardar la asistencia.' });
        } finally {
            setGuardando(false);
        }
    };

    if (!asignacionActiva) {
        return (
            <div className="bg-yellow-50 border border-yellow-100 p-6 rounded-xl text-center">
                <p className="text-yellow-700 font-medium text-sm">Por favor, seleccione una asignatura desde el Panel Principal para gestionar la asistencia.</p>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Control de Asistencia</h2>
                    <p className="text-slate-500 text-sm">
                        {asignacionActiva.asignatura.nombre} - {asignacionActiva.grado.nombre}
                    </p>
                </div>
                
                <div className="flex items-center gap-3">
                    <div className="bg-slate-100 p-1 rounded-lg inline-flex">
                        <button 
                            onClick={() => setVistaResumen(false)}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${!vistaResumen ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Registro Diario
                        </button>
                        <button 
                            onClick={() => setVistaResumen(true)}
                            className={`px-4 py-2 text-sm font-medium rounded-md ${vistaResumen ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Resumen
                        </button>
                    </div>
                </div>
            </div>

            {mensaje.texto && (
                <div className={`m-6 p-4 rounded-lg text-sm ${
                    mensaje.tipo === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 
                    mensaje.tipo === 'error' ? 'bg-red-50 text-red-700 border border-red-200' :
                    'bg-yellow-50 text-yellow-700 border border-yellow-200'
                }`}>
                    {mensaje.texto}
                </div>
            )}

            {!vistaResumen ? (
                <div className="p-6">
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                        <div className="flex items-center gap-3">
                            <label className="text-sm font-medium text-slate-700">Fecha:</label>
                            <input 
                                type="date" 
                                value={fecha}
                                onChange={(e) => setFecha(e.target.value)}
                                className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        
                        <button 
                            onClick={handleGuardar}
                            disabled={guardando || loading}
                            className="bg-blue-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {guardando ? 'Guardando...' : 'Guardar Asistencia'}
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Cargando datos...</div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Estudiante</th>
                                        <th className="px-4 py-3 text-center">Estado</th>
                                        <th className="px-4 py-3">Justificación</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {estudiantes.map((est) => {
                                        const asis = asistencias[est.idMatricula] || { estado: 'PRESENTE', justificacion: '' };
                                        const yaRegistrado = !!asis.id_asistencia;
                                        
                                        return (
                                            <tr key={est.idMatricula} className="border-b border-slate-100 hover:bg-slate-50 transition-colors">
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    {est.estudiante.apellidos} {est.estudiante.nombres}
                                                    {yaRegistrado && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Registrado</span>}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <div className="inline-flex bg-slate-100 rounded-lg p-1">
                                                        {['PRESENTE', 'AUSENTE', 'JUSTIFICADO', 'ATRASO'].map(estado => (
                                                            <button
                                                                key={estado}
                                                                disabled={yaRegistrado}
                                                                onClick={() => handleEstadoChange(est.idMatricula, estado)}
                                                                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                                                                    asis.estado === estado 
                                                                        ? estado === 'PRESENTE' ? 'bg-green-500 text-white shadow-sm' 
                                                                        : estado === 'AUSENTE' ? 'bg-red-500 text-white shadow-sm'
                                                                        : estado === 'JUSTIFICADO' ? 'bg-blue-500 text-white shadow-sm'
                                                                        : 'bg-yellow-500 text-white shadow-sm'
                                                                        : 'text-slate-500 hover:bg-slate-200'
                                                                } ${yaRegistrado ? 'opacity-70 cursor-not-allowed' : ''}`}
                                                            >
                                                                {estado.charAt(0)}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <input 
                                                        type="text" 
                                                        value={asis.justificacion || ''}
                                                        onChange={(e) => handleJustificacionChange(est.idMatricula, e.target.value)}
                                                        disabled={yaRegistrado || (asis.estado !== 'JUSTIFICADO' && asis.estado !== 'ATRASO' && asis.estado !== 'AUSENTE')}
                                                        placeholder={asis.estado === 'JUSTIFICADO' ? 'Especifique motivo...' : ''}
                                                        className="w-full px-3 py-1.5 border border-slate-300 rounded-md text-sm disabled:bg-slate-100 disabled:text-slate-400"
                                                    />
                                                </td>
                                            </tr>
                                        );
                                    })}
                                    {estudiantes.length === 0 && (
                                        <tr>
                                            <td colSpan="3" className="px-4 py-8 text-center text-slate-500">
                                                No hay estudiantes matriculados en esta asignación.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            ) : (
                <div className="p-6">
                    <div className="mb-4">
                        <h3 className="text-lg font-medium text-slate-800">Resumen del Periodo</h3>
                    </div>
                    
                    {loading ? (
                        <div className="text-center py-10 text-slate-500">Cargando resumen...</div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-200 rounded-lg">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Estudiante</th>
                                        <th className="px-4 py-3 text-center text-green-600">Presentes</th>
                                        <th className="px-4 py-3 text-center text-red-600">Ausentes</th>
                                        <th className="px-4 py-3 text-center text-blue-600">Justificados</th>
                                        <th className="px-4 py-3 text-center text-yellow-600">Atrasos</th>
                                        <th className="px-4 py-3 text-center">% Asistencia</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {estudiantes.map(est => {
                                        const res = resumenes.find(r => r.id_matricula === est.idMatricula) || {
                                            total_presentes: 0, total_ausentes: 0, total_justificados: 0, total_atrasos: 0, porcentaje_asistencia: 0
                                        };
                                        return (
                                            <tr key={est.idMatricula} className="border-b border-slate-100 hover:bg-slate-50">
                                                <td className="px-4 py-3 font-medium text-slate-800">
                                                    {est.estudiante.apellidos} {est.estudiante.nombres}
                                                </td>
                                                <td className="px-4 py-3 text-center font-semibold text-slate-700">{res.total_presentes}</td>
                                                <td className="px-4 py-3 text-center font-semibold text-slate-700">{res.total_ausentes}</td>
                                                <td className="px-4 py-3 text-center font-semibold text-slate-700">{res.total_justificados}</td>
                                                <td className="px-4 py-3 text-center font-semibold text-slate-700">{res.total_atrasos}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2.5 py-1 rounded-full font-bold text-xs ${
                                                        res.porcentaje_asistencia >= 80 ? 'bg-green-100 text-green-700' :
                                                        res.porcentaje_asistencia >= 70 ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-red-100 text-red-700'
                                                    }`}>
                                                        {res.porcentaje_asistencia.toFixed(1)}%
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
