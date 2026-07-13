import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getMisAsignaciones } from '../../services/docente/docenteService';
import DocenteActividades from "./DocenteActividades";
import DocenteAsistencia from "./DocenteAsistencia";

export default function DocentePanel() {
    const [seccion, setSeccion] = useState("panel");
    const [asignaciones, setAsignaciones] = useState([]);
    const [asignacionActiva, setAsignacionActiva] = useState(null);

    useEffect(() => {
        const fetchAsignaciones = async () => {
            try {
                console.log("[React Debug] Obteniendo asignaciones del docente...");
                const data = await getMisAsignaciones();
                console.log("[React Debug] Asignaciones recibidas:", data);
                setAsignaciones(data);
                if (data && data.length > 0) {
                    setAsignacionActiva(data[0]);
                } else {
                    console.warn("[React Debug] El endpoint retornó una lista vacía de asignaciones.");
                }
            } catch (error) {
                console.error("[React Debug] Error al obtener asignaciones:", error);
            }
        };
        fetchAsignaciones();
    }, []);

    const menuItems = [
        {
            id: "panel",
            label: "Panel Principal",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
            )
        },
        {
            id: "actividades",
            label: "Actividades",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
            )
        },
        {
            id: "asistencia",
            label: "Asistencia",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            )
        },
        {
            id: "calificaciones",
            label: "Calificaciones",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
            )
        },
        {
            id: "seguimiento",
            label: "Seguimiento",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
            )
        },
        {
            id: "reportes",
            label: "Reportes",
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            )
        }
    ];

    return (
        <Layout
            breadcrumb={["Portal Docente"]}
            sidebarTitle="MENÚ DOCENTE"
            menuItems={menuItems}
            seccion={seccion}
            onSeccionChange={setSeccion}
        >
            {seccion === "panel" && (
                <div>
                    <h1 className="text-2xl font-bold text-slate-800 mb-2">Panel Docente</h1>
                    <p className="text-slate-500 mb-6">Seleccione una asignatura para gestionar sus actividades o controlar la asistencia.</p>
                    
                    <div className="flex flex-wrap gap-6">
                        {asignaciones.map(a => (
                            <div 
                                key={a.idAsignacion} 
                                className={`w-[320px] bg-white border rounded-2xl shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300 p-6 flex flex-col justify-between ${
                                    asignacionActiva?.idAsignacion === a.idAsignacion 
                                        ? 'border-blue-500 ring-2 ring-blue-500 ring-opacity-20' 
                                        : 'border-slate-200'
                                }`}
                            >
                                <div>
                                    {/* Cabecera del Card */}
                                    <div className="flex justify-between items-start mb-4">
                                        <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full uppercase tracking-wider">
                                            {a.anoLectivo?.nombre || "2026-2027"}
                                        </span>
                                        <div className="text-slate-400">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                                            </svg>
                                        </div>
                                    </div>
                                    
                                    {/* Grado y Asignatura */}
                                    <div className="mb-4">
                                        <h3 className="text-xs text-slate-400 uppercase tracking-wide font-semibold">{a.grado?.nombre}</h3>
                                        <h2 className="text-lg font-bold text-slate-700 mt-1 line-clamp-1">{a.asignatura?.nombre}</h2>
                                    </div>
                                    
                                    {/* Métricas */}
                                    <div className="grid grid-cols-2 gap-4 border-t border-b border-slate-100 py-3 mb-4">
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-medium">Estudiantes</p>
                                            <p className="text-xs font-semibold text-slate-700 mt-0.5">{a.cantidadEstudiantes || 0} matriculados</p>
                                        </div>
                                        <div>
                                            <p className="text-[10px] text-slate-400 uppercase font-medium">Asistencia</p>
                                            <p className="text-xs font-semibold text-green-600 mt-0.5">{a.porcentajeAsistencia || 100.0}% promedio</p>
                                        </div>
                                        <div className="col-span-2">
                                            <p className="text-[10px] text-slate-400 uppercase font-medium">Promedio General</p>
                                            <div className="flex items-center gap-1 mt-0.5">
                                                <svg className="w-3.5 h-3.5 text-yellow-400 fill-current" viewBox="0 0 20 20">
                                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                                </svg>
                                                <span className="text-xs font-bold text-slate-700">{a.promedioCalificaciones || "N/A"}/10</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Acciones */}
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => { setAsignacionActiva(a); setSeccion("actividades"); }} 
                                        className="flex-1 text-center py-2 bg-slate-50 border border-slate-200 text-slate-600 rounded-lg text-xs font-semibold hover:bg-slate-100 hover:text-slate-800 transition"
                                    >
                                        Actividades
                                    </button>
                                    <button 
                                        onClick={() => { setAsignacionActiva(a); setSeccion("asistencia"); }} 
                                        className="flex-1 text-center py-2 bg-blue-600 text-white rounded-lg text-xs font-semibold hover:bg-blue-700 transition shadow-sm"
                                    >
                                        Asistencia
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {seccion === "actividades" && <DocenteActividades asignacionActiva={asignacionActiva} />}
            {seccion === "asistencia" && <DocenteAsistencia asignacionActiva={asignacionActiva} />}
            {seccion === "calificaciones" && <div className="text-slate-500">Módulo de Calificaciones en construcción (Fase E).</div>}
            {seccion === "seguimiento" && <div className="text-slate-500">Módulo de Seguimiento en construcción (Fase F).</div>}
            {seccion === "reportes" && <div className="text-slate-500">Módulo de Reportes en construcción (Fase G).</div>}
        </Layout>
    );
}
