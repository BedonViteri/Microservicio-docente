import { useState } from "react";
import Layout from "../../components/Layout";

const menuReportes = [
  {
    id: "notas",
    label: "Reporte de Notas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
  {
    id: "asistencia",
    label: "Reporte de Asistencia",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "exportar",
    label: "Exportar PDF",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
  },
];

export default function Reportes() {
  const [seccion, setSeccion] = useState("notas");

  return (
    <Layout
      breadcrumb={["Inicio", "Reportes"]}
      sidebarTitle="REPORTES"
      menuItems={menuReportes}
      seccion={seccion}
      onSeccionChange={setSeccion}
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Reportes</h1>
      <p className="text-slate-500 mb-6">Genere reportes de su gestión académica.</p>
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <p className="text-slate-400">
          {seccion === "notas" && "Reporte de notas — en construcción..."}
          {seccion === "asistencia" && "Reporte de asistencia — en construcción..."}
          {seccion === "exportar" && "Exportar reportes a PDF — en construcción..."}
        </p>
      </div>
    </Layout>
  );
}
