import { useState } from "react";
import Layout from "../../components/Layout";

const menuCalificaciones = [
  {
    id: "registrar",
    label: "Registrar Notas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    ),
  },
  {
    id: "por-estudiante",
    label: "Por Estudiante",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
  },
  {
    id: "consolidado",
    label: "Consolidado",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
  },
];

export default function Calificaciones() {
  const [seccion, setSeccion] = useState("registrar");

  return (
    <Layout
      breadcrumb={["Inicio", "Calificaciones"]}
      sidebarTitle="CALIFICACIONES"
      menuItems={menuCalificaciones}
      seccion={seccion}
      onSeccionChange={setSeccion}
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Calificaciones</h1>
      <p className="text-slate-500 mb-6">Registre y consulte las calificaciones de sus estudiantes.</p>
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <p className="text-slate-400">
          {seccion === "registrar" && "Registro de notas por actividad — en construcción..."}
          {seccion === "por-estudiante" && "Notas por estudiante — en construcción..."}
          {seccion === "consolidado" && "Consolidado de calificaciones — en construcción..."}
        </p>
      </div>
    </Layout>
  );
}
