import api from "../../config/axios";





export const getMisAsignaciones = async () => {
    const response = await api.get(`/api/docentes/mis-asignaciones`);
    return response.data;
};

export const getEstudiantesPorAsignacion = async (asignacionId) => {
    const response = await api.get(`/api/docentes/asignaciones/${asignacionId}/estudiantes`);
    return response.data;
};

export const getActividadesPorAsignacion = async (asignacionId) => {
    const response = await api.get(`/api/docente/actividades?idAsignacion=${asignacionId}`);
    return response.data;
};

export const getActividadById = async (id) => {
    const response = await api.get(`/api/docente/actividades/${id}`);
    return response.data;
};

export const createActividad = async (data) => {
    const response = await api.post(`/api/docente/actividades`, data);
    return response.data;
};

export const updateActividad = async (id, data) => {
    const response = await api.put(`/api/docente/actividades/${id}`, data);
    return response.data;
};

export const deleteActividad = async (id) => {
    const response = await api.delete(`/api/docente/actividades/${id}`);
    return response.data;
};

// --- ASISTENCIA ---

export const getAsistenciaPorAsignacionYFecha = async (asignacionId, fecha, idPeriodo = 0) => {
    let url = `/api/docente/asistencias/asignacion/${asignacionId}?fecha=${fecha}`;
    if (idPeriodo > 0) url += `&idPeriodo=${idPeriodo}`;
    const response = await api.get(url);
    return response.data;
};

export const getResumenAsistencia = async (asignacionId, idPeriodo = 0) => {
    let url = `/api/docente/asistencias/asignacion/${asignacionId}/resumen`;
    if (idPeriodo > 0) url += `?idPeriodo=${idPeriodo}`;
    const response = await api.get(url);
    return response.data;
};

export const registrarAsistenciaGrupal = async (data) => {
    const response = await api.post(`/api/docente/asistencias/masivo`, data);
    return response.data;
};

export const actualizarAsistencia = async (id, data) => {
    const response = await api.put(`/api/docente/asistencias/${id}`, data);
    return response.data;
};

// --- CALIFICACIONES ---

export const getCalificacionesEstudiante = async (idMatricula, trimestre) => {
    const response = await api.get(`/api/rpc/calificaciones/${idMatricula}/${trimestre}`);
    return response.data;
};

export const getPromedioFormativo = async (idMatricula, trimestre) => {
    const response = await api.get(`/api/rpc/calificaciones/promedio-formativo/${idMatricula}/${trimestre}`);
    return response.data;
};

export const getPromedioFinal = async (idMatricula, trimestre) => {
    const response = await api.get(`/api/rpc/calificaciones/promedio-final/${idMatricula}/${trimestre}`);
    return response.data;
};

export const registrarCalificacion = async (data) => {
    const response = await api.post(`/api/rpc/calificaciones/registrar`, data);
    return response.data;
};

export const getPeriodosEvaluacion = async () => {
    const response = await api.get(`/api/docente/actividades/periodos`);
    return response.data;
};

