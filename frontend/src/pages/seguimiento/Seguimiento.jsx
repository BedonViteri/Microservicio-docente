import { useState } from "react";
import Layout from "../../components/Layout";

const menuSeguimiento = [
  {
    id: "rendimiento",
    label: "Rendimiento",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
      </svg>
    ),
  },
  {
    id: "alertas",
    label: "Alertas",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
  },
  {
    id: "historial",
    label: "Historial",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
];

export default function Seguimiento() {
  const [seccion, setSeccion] = useState("rendimiento");

  return (
    <Layout
      breadcrumb={["Inicio", "Seguimiento"]}
      sidebarTitle="SEGUIMIENTO"
      menuItems={menuSeguimiento}
      seccion={seccion}
      onSeccionChange={setSeccion}
    >
      <h1 className="text-2xl font-bold text-slate-800 mb-2">Seguimiento Académico</h1>
      <p className="text-slate-500 mb-6">Monitoree el desempeño académico de sus estudiantes.</p>
      <div className="bg-white p-8 rounded-xl border border-slate-200 text-center">
        <p className="text-slate-400">
          {seccion === "rendimiento" && "Rendimiento académico — en construcción..."}
          {seccion === "alertas" && "Alertas de bajo rendimiento — en construcción..."}
          {seccion === "historial" && "Historial de seguimiento — en construcción..."}
        </p>
      </div>
    </Layout>
  );
}
