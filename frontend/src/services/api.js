import axios from "axios";

// ─────────────────────────────────────────────────────────────
// El frontend SOLO habla con el SGA Principal (Java 8080) vía REST.
// El SGA Principal internamente usa gRPC hacia el microservicio
// docente (Django) para actividades, asistencia y calificaciones.
// (Patrón API Gateway — el frontend nunca habla gRPC ni toca Django.)
// ─────────────────────────────────────────────────────────────
const API = "http://localhost:8080/api";

// Datos de referencia (períodos) que aún solo expone Django por REST.
const API_DOCENTE_REST = "http://localhost:8000/api/docente";

const authHeaders = () => {
  const token = localStorage.getItem("token");
  return { Authorization: `Bearer ${token}` };
};

// ─── ASIGNACIONES (backend principal) ────────────────────────
export const getMisAsignaciones = () =>
  axios.get(`${API}/docentes/mis-asignaciones`, { headers: authHeaders() });

export const getEstudiantesPorAsignacion = (asignacionId) =>
  axios.get(`${API}/docentes/asignaciones/${asignacionId}/estudiantes`, {
    headers: authHeaders(),
  });

// ─── ACTIVIDADES (Java → gRPC → Django) ──────────────────────
// Nota: el body viaja en camelCase porque Java usa ProtobufHttpMessageConverter.
export const getActividades = (idAsignacion, idPeriodo) => {
  const params = { idAsignacion };
  if (idPeriodo) params.idPeriodo = idPeriodo;
  return axios.get(`${API}/docente/actividades`, { params, headers: authHeaders() });
};

export const getActividad = (id) =>
  axios.get(`${API}/docente/actividades/${id}`, { headers: authHeaders() });

export const createActividad = (data) =>
  axios.post(`${API}/docente/actividades`, data, { headers: authHeaders() });

export const updateActividad = (id, data) =>
  axios.put(`${API}/docente/actividades/${id}`, data, { headers: authHeaders() });

export const deleteActividad = (id) =>
  axios.delete(`${API}/docente/actividades/${id}`, { headers: authHeaders() });

// ─── ASISTENCIAS (Java → gRPC → Django) ──────────────────────
export const getAsistenciaPorAsignacion = (asignacionId, fecha, idPeriodo = 0) => {
  let url = `${API}/docente/asistencias/asignacion/${asignacionId}?fecha=${fecha}`;
  if (idPeriodo > 0) url += `&idPeriodo=${idPeriodo}`;
  return axios.get(url, { headers: authHeaders() });
};

export const getResumenAsistencia = (asignacionId, idPeriodo = 0) => {
  let url = `${API}/docente/asistencias/asignacion/${asignacionId}/resumen`;
  if (idPeriodo > 0) url += `?idPeriodo=${idPeriodo}`;
  return axios.get(url, { headers: authHeaders() });
};

export const registrarAsistenciaGrupal = (data) =>
  axios.post(`${API}/docente/asistencias/masivo`, data, { headers: authHeaders() });

export const actualizarAsistencia = (id, data) =>
  axios.put(`${API}/docente/asistencias/${id}`, data, { headers: authHeaders() });

// ─── PERÍODOS DE EVALUACIÓN (aún solo REST en Django) ────────
// TODO: exponer como endpoint en el gateway Java cuando exista.
export const getPeriodos = () =>
  axios.get(`${API_DOCENTE_REST}/periodos-evaluacion/`);
