import { useState, useEffect } from "react";
import Layout from "../../components/Layout";
import { getMisAsignaciones } from '../../services/docente/docenteService';
import DocenteActividades from "./DocenteActividades";
import DocenteAsistencia from "./DocenteAsistencia";

export default function DocentePanel() {
    const [seccion, setSeccion] = useState("panel");
    const [asignacionActiva, setAsignacionActiva] = useState(null);

    useEffect(() => {
        const fetchAsignaciones = async () => {
            try {
                console.log("[React Debug] Obteniendo asignaciones del docente...");
                const data = await getMisAsignaciones();
                console.log("[React Debug] Asignaciones recibidas:", data);
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
                    <p className="text-slate-500 mb-6">Bienvenido a su espacio de trabajo. Seleccione un módulo en el menú lateral para gestionar sus cursos asignados.</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center">
                            <div className="bg-blue-50 p-4 rounded-full text-blue-500 mb-4">
                                {menuItems[1].icon}
                            </div>
                            <h3 className="font-semibold text-slate-700">Gestión de Actividades</h3>
                            <p className="text-sm text-slate-400 mt-1">Cree y evalúe tareas, exámenes y proyectos.</p>
                            <button onClick={() => setSeccion("actividades")} className="mt-4 text-sm text-blue-600 font-medium hover:underline">Ir a Actividades →</button>
                        </div>
                        {/* More quick links can be added here */}
                    </div>
                </div>
            )}

            {seccion === "actividades" && <DocenteActividades />}
            {seccion === "asistencia" && <DocenteAsistencia asignacionActiva={asignacionActiva} />}
            {seccion === "calificaciones" && <div className="text-slate-500">Módulo de Calificaciones en construcción (Fase E).</div>}
            {seccion === "seguimiento" && <div className="text-slate-500">Módulo de Seguimiento en construcción (Fase F).</div>}
            {seccion === "reportes" && <div className="text-slate-500">Módulo de Reportes en construcción (Fase G).</div>}
        </Layout>
    );
}
