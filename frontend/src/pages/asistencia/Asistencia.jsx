import { useState } from "react";
import Layout from "../../components/Layout";

const menuAsistencia = [
  {
    id: "registrar",
    label: "Registrar Asistencia",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    id: "por-curso",
    label: "Consultar por Curso",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
      </svg>
    ),
  },
  {
    id: "resumen",
    label: "Resumen",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
];

export default function Asistencia() {
  const [seccion, setSeccion] = useState("registrar");

  return (
    <Layout
      breadcrumb={["Inicio", "Asistencia"]}
      sidebarTitle="ASISTENCIA"
      menuItems={menuAsistencia}
      seccion={seccion}
      onSeccionChange={setSeccion}
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Asistencia</h1>
      <p className="text-slate-500 mb-6">Registre y consulte la asistencia de sus estudiantes.</p>
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <p className="text-slate-400">
          {seccion === "registrar" && "Registro de asistencia diaria — en construcción..."}
          {seccion === "por-curso" && "Consulta de asistencia por curso — en construcción..."}
          {seccion === "resumen" && "Resumen de asistencia — en construcción..."}
        </p>
      </div>
    </Layout>
  );
}
