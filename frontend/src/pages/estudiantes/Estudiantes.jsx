import { useState, useEffect } from "react";
import api from "../../config/axios";
import Layout from "../../components/Layout";


const PRIMARY = "#243A76";
const modalBg = { backgroundColor: "rgba(36, 58, 118, 0.5)" };

const estadoBadge = (e) => {
  const s = (e||"").toUpperCase();
  if (s === "ACTIVO" || s === "ACTIVA") return "bg-green-100 text-green-700";
  if (s === "INACTIVO" || s === "INACTIVA") return "bg-slate-100 text-slate-500";
  if (s === "RETIRADO" || s === "RETIRADA") return "bg-red-100 text-red-600";
  if (s === "TRASLADADA") return "bg-amber-100 text-amber-700";
  if (s === "PROMOVIDA") return "bg-blue-100 text-blue-700";
  if (s === "REPROBADA") return "bg-orange-100 text-orange-700";
  return "bg-slate-100 text-slate-500";
};

const PAGE_SIZE = 15;

const FORM0 = {
  cedula:"", nombres:"", apellidos:"", fechaNacimiento:"", genero:"",
  direccion:"", telefono:"", correo:"",
  nacionalidad:"Ecuatoriana", etnia:"", lugarNacimiento:"", viveCon:"",
  numerosHermanos:"", beneficioSocial:false,
  discapacidad:false, tipoDiscapacidad:"", porcentajeDisc:"", carnetConadis:"",
};
const REP0 = { cedula:"", nombres:"", apellidos:"", parentesco:"", telefonoPrincipal:"", telefonoAlt:"", correo:"", direccion:"" };
const MED0 = {
  tipoSangre:"", alergias:"", enfermedadesCronicas:"", medicamentos:"",
  contactoEmergenciaNombre:"", contactoEmergenciaTelefono:"", contactoEmergenciaParentesco:"",
  observacionesMedicas:"",
};

// ── Componentes base ──────────────────────────────────────────
const F = ({ label, children, span=1 }) => (
    <div style={{ gridColumn:`span ${span}` }}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      {children}
    </div>
);

const I = ({ v, onChange, ph, type="text", req }) => (
    <input type={type} value={v??""} onChange={onChange} placeholder={ph} required={req}
           className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#243A76] focus:ring-1 focus:ring-[#243A76]" />
);

const Sel = ({ v, onChange, opts, placeholder="Seleccionar" }) => (
    <select value={v??""} onChange={onChange}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#243A76]">
      <option value="">{placeholder}</option>
      {opts.map(o => Array.isArray(o)
          ? <option key={o[0]} value={o[0]}>{o[1]}</option>
          : <option key={o} value={o}>{o}</option>
      )}
    </select>
);

const TA = ({ v, onChange, ph, rows=2 }) => (
    <textarea value={v??""} onChange={onChange} placeholder={ph} rows={rows}
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-[#243A76] resize-none" />
);

const Chk = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-2 cursor-pointer w-fit select-none">
      <input type="checkbox" checked={!!checked} onChange={onChange} className="w-4 h-4 accent-[#243A76]" />
      <span className="text-sm text-slate-600 font-medium">{label}</span>
    </label>
);

const Divider = ({ label }) => (
    <div className="col-span-3 flex items-center gap-2 mt-1">
      <span className="text-xs font-bold uppercase tracking-wider" style={{ color: PRIMARY }}>{label}</span>
      <div className="flex-1 h-px bg-slate-200" />
    </div>
);

// ── Tabs de formulario ────────────────────────────────────────
const TabPersonal = ({ d, s }) => (
    <div className="grid grid-cols-3 gap-x-4 gap-y-3 pb-2">
      <Divider label="Identificación" />
      <F label="Cédula"><I v={d.cedula} onChange={e=>s({...d,cedula:e.target.value})} ph="0000000000" /></F>
      <F label="Nombres *" span={2}><I v={d.nombres} onChange={e=>s({...d,nombres:e.target.value})} ph="Nombres completos" req /></F>
      <F label="Apellidos *" span={2}><I v={d.apellidos} onChange={e=>s({...d,apellidos:e.target.value})} ph="Apellidos completos" req /></F>
      <F label="Fecha nacimiento"><I type="date" v={d.fechaNacimiento} onChange={e=>s({...d,fechaNacimiento:e.target.value})} req /></F>

      <Divider label="Datos personales" />
      <F label="Género">
        <Sel v={d.genero} onChange={e=>s({...d,genero:e.target.value})} opts={[["M","Masculino"],["F","Femenino"]]} />
      </F>
      <F label="Nacionalidad">
        <Sel v={d.nacionalidad} onChange={e=>s({...d,nacionalidad:e.target.value})}
             opts={["Ecuatoriana","Colombiana","Venezolana","Peruana","Otra"]} placeholder="Seleccionar" />
      </F>
      <F label="Etnia (MINEDUC)">
        <Sel v={d.etnia} onChange={e=>s({...d,etnia:e.target.value})}
             opts={["Mestizo/a","Indígena","Afroecuatoriano/a","Montubio/a","Blanco/a","Otro"]} />
      </F>
      <F label="Lugar de nacimiento" span={2}><I v={d.lugarNacimiento} onChange={e=>s({...d,lugarNacimiento:e.target.value})} ph="Ej: El Empalme, Guayas" /></F>
      <F label="Vive con">
        <Sel v={d.viveCon} onChange={e=>s({...d,viveCon:e.target.value})}
             opts={["Padre y Madre","Solo Padre","Solo Madre","Abuelos","Tíos","Otros familiares","Tutor legal"]} />
      </F>
      <F label="Teléfono"><I v={d.telefono} onChange={e=>s({...d,telefono:e.target.value})} ph="09XXXXXXXX" /></F>
      <F label="Correo electrónico" span={2}><I type="email" v={d.correo} onChange={e=>s({...d,correo:e.target.value})} ph="correo@ejemplo.com" /></F>
      <F label="Dirección domiciliaria" span={3}><I v={d.direccion} onChange={e=>s({...d,direccion:e.target.value})} ph="Barrio, calle, referencia..." /></F>
      <F label="Nº hermanos en la institución"><I type="number" v={d.numerosHermanos} onChange={e=>s({...d,numerosHermanos:e.target.value})} ph="0" /></F>
      <div className="col-span-2 flex items-end pb-1">
        <Chk checked={d.beneficioSocial} onChange={e=>s({...d,beneficioSocial:e.target.checked})} label="Recibe bono o beneficio social" />
      </div>

      <Divider label="Discapacidad" />
      <div className="col-span-3">
        <Chk checked={d.discapacidad} onChange={e=>s({...d,discapacidad:e.target.checked,tipoDiscapacidad:"",porcentajeDisc:"",carnetConadis:""})} label="Presenta discapacidad" />
      </div>
      {d.discapacidad && <>
        <F label="Tipo de discapacidad">
          <Sel v={d.tipoDiscapacidad} onChange={e=>s({...d,tipoDiscapacidad:e.target.value})}
               opts={["Visual","Auditiva","Física - Motora","Intelectual","Psicosocial","Múltiple"]} />
        </F>
        <F label="Porcentaje (%)"><I type="number" v={d.porcentajeDisc} onChange={e=>s({...d,porcentajeDisc:e.target.value})} ph="Ej: 35" /></F>
        <F label="Nº Carnet CONADIS"><I v={d.carnetConadis} onChange={e=>s({...d,carnetConadis:e.target.value})} ph="Ej: 171234567" /></F>
      </>}
    </div>
);

const TabMedico = ({ d, s }) => (
    <div className="grid grid-cols-3 gap-x-4 gap-y-3 pb-2">
      <Divider label="Información médica" />
      <F label="Tipo de sangre">
        <Sel v={d.tipoSangre} onChange={e=>s({...d,tipoSangre:e.target.value})}
             opts={["A+","A-","B+","B-","AB+","AB-","O+","O-"]} placeholder="Desconocido" />
      </F>
      <F label="Alergias conocidas" span={2}><I v={d.alergias} onChange={e=>s({...d,alergias:e.target.value})} ph="Ej: Polen, penicilina, mariscos..." /></F>
      <F label="Enfermedades crónicas" span={3}><TA v={d.enfermedadesCronicas} onChange={e=>s({...d,enfermedadesCronicas:e.target.value})} ph="Ej: Asma, diabetes tipo 1, epilepsia..." /></F>
      <F label="Medicamentos habituales" span={3}><TA v={d.medicamentos} onChange={e=>s({...d,medicamentos:e.target.value})} ph="Ej: Salbutamol inhalador, metformina 500mg..." /></F>
      <F label="Observaciones adicionales" span={3}><TA v={d.observacionesMedicas} onChange={e=>s({...d,observacionesMedicas:e.target.value})} ph="Indicaciones especiales para docentes..." rows={3} /></F>

      <Divider label="Contacto de emergencia" />
      <F label="Nombre completo" span={2}><I v={d.contactoEmergenciaNombre} onChange={e=>s({...d,contactoEmergenciaNombre:e.target.value})} ph="Nombre del contacto" /></F>
      <F label="Parentesco">
        <Sel v={d.contactoEmergenciaParentesco} onChange={e=>s({...d,contactoEmergenciaParentesco:e.target.value})}
             opts={["Padre","Madre","Abuelo/a","Tío/a","Hermano/a","Tutor legal"]} />
      </F>
      <F label="Teléfono de emergencia" span={2}><I v={d.contactoEmergenciaTelefono} onChange={e=>s({...d,contactoEmergenciaTelefono:e.target.value})} ph="09XXXXXXXX" /></F>
    </div>
);

const TabRep = ({ d, s }) => (
    <div className="grid grid-cols-3 gap-x-4 gap-y-3 pb-2">
      <div className="col-span-3">
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 text-xs text-blue-700 font-medium">
          Se registrará un nuevo representante legal vinculado a este estudiante.
        </div>
      </div>
      <Divider label="Datos del representante" />
      <F label="Cédula"><I v={d.cedula} onChange={e=>s({...d,cedula:e.target.value})} ph="0000000000" /></F>
      <F label="Nombres *"><I v={d.nombres} onChange={e=>s({...d,nombres:e.target.value})} ph="Nombres" req /></F>
      <F label="Apellidos *"><I v={d.apellidos} onChange={e=>s({...d,apellidos:e.target.value})} ph="Apellidos" req /></F>
      <F label="Parentesco">
        <Sel v={d.parentesco} onChange={e=>s({...d,parentesco:e.target.value})}
             opts={["Padre","Madre","Abuelo/a","Tío/a","Hermano/a","Tutor legal"]} />
      </F>
      <F label="Teléfono principal *"><I v={d.telefonoPrincipal} onChange={e=>s({...d,telefonoPrincipal:e.target.value})} ph="09XXXXXXXX" req /></F>
      <F label="Teléfono alternativo"><I v={d.telefonoAlt} onChange={e=>s({...d,telefonoAlt:e.target.value})} ph="09XXXXXXXX" /></F>
      <F label="Correo electrónico" span={2}><I type="email" v={d.correo} onChange={e=>s({...d,correo:e.target.value})} ph="correo@ejemplo.com" /></F>
      <F label="Dirección" span={3}><I v={d.direccion} onChange={e=>s({...d,direccion:e.target.value})} ph="Dirección del representante" /></F>
    </div>
);

// ── Componente Modal reutilizable ─────────────────────────────
const Modal = ({ title, onClose, onSubmit, tabs, children, saving }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
      <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{ width:"800px", maxHeight:"90vh" }}>
        {/* Header */}
        <div style={{ backgroundColor: PRIMARY }} className="px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
          <h2 className="text-white font-bold text-base">{title}</h2>
          <button type="button" onClick={onClose} className="text-white opacity-70 hover:opacity-100 text-xl leading-none">✕</button>
        </div>
        <form onSubmit={onSubmit} className="flex flex-1 overflow-hidden">
          {/* Sidebar de secciones */}
          <aside className="w-44 flex-shrink-0 border-r border-slate-100 bg-slate-50/60 py-4 px-2 overflow-y-auto">
            <p className="px-3 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">Secciones</p>
            <div className="flex flex-col gap-1">{tabs}</div>
          </aside>
          {/* Contenido */}
          <div className="flex flex-col flex-1 overflow-hidden">
            <div className="px-6 pt-4 pb-2 overflow-y-auto flex-1">{children}</div>
            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0 bg-white rounded-br-2xl">
              <button type="button" onClick={onClose}
                      className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium transition">
                Cancelar
              </button>
              <button type="submit" disabled={saving} style={{ backgroundColor: PRIMARY }}
                      className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 disabled:opacity-60 transition">
                {saving ? "Guardando..." : "Guardar"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
);

const sidebarItems = [
  { id: "lista", label: "Lista de estudiantes", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5zm0 0l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" /></svg> },
  { id: "nuevo", label: "Nuevo estudiante", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg> },
  { id: "importar", label: "Importar CAS", icon: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg> },
];

export default function Estudiantes() {
  const [estudiantes, setEstudiantes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [pagina, setPagina] = useState(1);
  const [tab, setTab] = useState("personal");
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showConfirm, setShowConfirm] = useState(null);
  const [showVer, setShowVer] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState(FORM0);
  const [rep, setRep] = useState(REP0);
  const [med, setMed] = useState(MED0);
  const [edit, setEdit] = useState(null);

  const [grados, setGrados] = useState([]);
  const [filtroGrado, setFiltroGrado] = useState("");
  const [filtroParalelo, setFiltroParalelo] = useState("");
  const [paralelosFiltro, setParalelosFiltro] = useState([]);

  
  

  const cargar = (idGrado, idParalelo) => {
    setLoading(true);
    const gid = idGrado ?? filtroGrado;
    const pid = idParalelo ?? filtroParalelo;
    let url = `${API}/estudiantes`;
    if (gid) {
      const anoLec = anosLectivos.find(a => a.esActual);
      if (anoLec) {
        url = `${API}/estudiantes/por-grado?idGrado=${gid}&idAnoLectivo=${anoLec.idAnoLectivo}`;
        if (pid) url += `&idParalelo=${pid}`;
      }
    }
    axios.get(url)
        .then(r => setEstudiantes(r.data))
        .catch(() => setError("Error al cargar estudiantes"))
        .finally(() => setLoading(false));
  };

  const [anosLectivos, setAnosLectivos] = useState([]);

  useEffect(() => {
    api.get(`/api/grados`).then(r => setGrados(r.data)).catch(() => {});
    api.get(`/api/anos-lectivos`).then(r => {
      setAnosLectivos(r.data);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (anosLectivos.length > 0) cargar();
  }, [anosLectivos]);

  const filtrados = estudiantes
      .filter(e => `${e.nombres} ${e.apellidos} ${e.cedula} ${e.codigoEstudiante}`.toLowerCase().includes(busqueda.toLowerCase()))
      .sort((a, b) => `${a.apellidos} ${a.nombres}`.localeCompare(`${b.apellidos} ${b.nombres}`));

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / PAGE_SIZE));
  const paginaActual = Math.min(pagina, totalPaginas);
  const paginados = filtrados.slice((paginaActual - 1) * PAGE_SIZE, paginaActual * PAGE_SIZE);

  const reset = () => { setForm(FORM0); setRep(REP0); setMed(MED0); setTab("personal"); setError(""); };

  const crear = async (ev) => {
    ev.preventDefault();
    if (!rep.nombres || !rep.apellidos || !rep.telefonoPrincipal) {
      setTab("representante"); setError("Completa los datos del representante."); return;
    }
    setSaving(true); setError("");
    try {
      const r = await api.post(`/api/representantes`, rep);
      await api.post(`/api/estudiantes`, {
        ...form, ...med,
        porcentajeDisc: form.porcentajeDisc ? Number(form.porcentajeDisc) : null,
        idRepresentante: r.data.idRepresentante,
      });
      setSuccess("Estudiante registrado correctamente.");
      setShowModal(false); reset(); cargar();
    } catch (e) { setError(e.response?.data?.message || "Error al registrar"); }
    finally { setSaving(false); }
  };

  const editar = async (ev) => {
    ev.preventDefault();
    setSaving(true); setError("");
    try {
      const payload = {
        cedula: edit.cedula, nombres: edit.nombres, apellidos: edit.apellidos,
        fechaNacimiento: edit.fechaNacimiento || null, genero: edit.genero,
        direccion: edit.direccion, telefono: edit.telefono, correo: edit.correo,
        discapacidad: !!edit.discapacidad, tipoDiscapacidad: edit.tipoDiscapacidad,
        porcentajeDisc: edit.porcentajeDisc ? Number(edit.porcentajeDisc) : null,
        carnetConadis: edit.carnetConadis, nacionalidad: edit.nacionalidad,
        etnia: edit.etnia, lugarNacimiento: edit.lugarNacimiento, viveCon: edit.viveCon,
        numerosHermanos: edit.numerosHermanos ? Number(edit.numerosHermanos) : null,
        beneficioSocial: !!edit.beneficioSocial, idRepresentante: edit.idRepresentante || null,
        tipoSangre: edit.tipoSangre, alergias: edit.alergias,
        enfermedadesCronicas: edit.enfermedadesCronicas, medicamentos: edit.medicamentos,
        contactoEmergenciaNombre: edit.contactoEmergenciaNombre,
        contactoEmergenciaTelefono: edit.contactoEmergenciaTelefono,
        contactoEmergenciaParentesco: edit.contactoEmergenciaParentesco,
        observacionesMedicas: edit.observacionesMedicas,
      };
      await api.put(`/api/estudiantes/${edit.idEstudiante}`, payload);
      setSuccess("Estudiante actualizado."); setShowEditModal(false); cargar();
    } catch (e) { setError(e.response?.data?.message || "Error al actualizar"); }
    finally { setSaving(false); }
  };

  const cambiarEstado = async (id, estado) => {
    try {
      await api.patch(`/api/estudiantes/${id}/estado?estado=${estado}`, {});
      setSuccess(`Estudiante ${estado==="ACTIVO"?"activado":"desactivado"}.`); cargar();
    } catch { setError("Error al cambiar estado"); }
    setShowConfirm(null);
  };

  useEffect(() => {
    if (success) { const t = setTimeout(() => setSuccess(""), 4000); return () => clearTimeout(t); }
  }, [success]);

  const TabBtn = ({ id, label }) => (
      <button type="button" onClick={() => setTab(id)}
              className={`text-left px-3 py-2 text-xs font-semibold rounded-lg transition border-l-2 ${
                  tab===id
                      ? "bg-blue-50 border-l-[#243A76]"
                      : "border-l-transparent text-slate-500 hover:bg-slate-100"
              }`}
              style={tab===id ? { color: PRIMARY } : {}}>
        {label}
      </button>
  );

  const [seccionSidebar, setSeccionSidebar] = useState("lista");
  const [showImportar, setShowImportar] = useState(false);
  const handleSeccionSidebar = (id) => {
    setSeccionSidebar(id);
    if (id === "nuevo") { setShowModal(true); setError(""); }
    if (id === "importar") { setShowImportar(true); setError(""); }
  };

  return (
      <Layout
        breadcrumb={["Inicio","Estudiantes"]}
        sidebarTitle="Estudiantes"
        menuItems={sidebarItems}
        seccion={seccionSidebar}
        onSeccionChange={handleSeccionSidebar}
      >
        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex justify-between"><span className="text-red-600 text-sm">{error}</span><button onClick={()=>setError("")} className="text-red-400 ml-4">✕</button></div>}
        {success && <div className="mb-4 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex justify-between"><span className="text-green-600 text-sm">{success}</span><button onClick={()=>setSuccess("")} className="text-green-400 ml-4">✕</button></div>}

        {/* Encabezado */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-bold text-slate-700">Estudiantes</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input type="text" placeholder="Buscar nombre, cédula, código..."
                     value={busqueda} onChange={e=>{setBusqueda(e.target.value);setPagina(1);}}
                     className="pl-3 pr-8 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-50 w-64 focus:outline-none" />
              <svg className="w-4 h-4 text-slate-400 absolute right-2 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </div>
            <button onClick={()=>{setShowModal(true);reset();}} style={{backgroundColor:PRIMARY}}
                    className="flex items-center gap-2 text-white px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 transition shadow-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/></svg>
              Nuevo estudiante
            </button>
          </div>
        </div>

        {/* Filtros por curso */}
        <div className="flex items-center gap-3 mb-4 bg-white rounded-xl border border-slate-200 px-4 py-3">
          <svg className="w-4 h-4 text-slate-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"/></svg>
          <select value={filtroGrado} onChange={e => {
            const gid = e.target.value;
            setFiltroGrado(gid);
            setFiltroParalelo("");
            setPagina(1);
            const g = grados.find(x => String(x.idGrado) === gid);
            setParalelosFiltro(g?.paralelos?.filter(p => p.activo) || []);
            cargar(gid || "", "");
          }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none min-w-[180px]">
            <option value="">Todos los grados</option>
            {grados.map(g => <option key={g.idGrado} value={g.idGrado}>{g.nombre}</option>)}
          </select>
          <select value={filtroParalelo} onChange={e => {
            const pid = e.target.value;
            setFiltroParalelo(pid);
            setPagina(1);
            cargar(filtroGrado, pid || "");
          }} className="px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none min-w-[120px]"
            disabled={!filtroGrado || paralelosFiltro.length === 0}>
            <option value="">Todos los paralelos</option>
            {paralelosFiltro.map(p => <option key={p.idParalelo} value={p.idParalelo}>{p.letra}</option>)}
          </select>
          {filtroGrado && (
            <button onClick={() => { setFiltroGrado(""); setFiltroParalelo(""); setParalelosFiltro([]); setPagina(1); cargar("",""); }}
              className="text-xs text-slate-400 hover:text-red-500 transition ml-1" title="Limpiar filtros">
              ✕ Limpiar
            </button>
          )}
          <span className="text-xs text-slate-400 ml-auto">{filtrados.length} estudiante{filtrados.length!==1?"s":""}</span>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {loading ? <div className="p-12 text-center text-slate-400 text-sm">Cargando...</div>
              : paginados.length===0 ? <div className="p-12 text-center text-slate-400 text-sm">Sin estudiantes registrados</div>
                  : <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                      <tr style={{backgroundColor:PRIMARY}} className="text-white text-xs">
                        {["#","Código","Estudiante","Cédula","Representante","Disc.","Estado","Acciones"].map(h=>(
                            <th key={h} className={`px-4 py-3 font-semibold ${h==="Acciones"||h==="Disc."?"text-center":"text-left"}`}>{h}</th>
                        ))}
                      </tr>
                      </thead>
                      <tbody>
                      {paginados.map((e,i)=>(
                          <tr key={e.idEstudiante} className={`border-t border-slate-100 hover:bg-slate-50 transition ${i%2===0?"":"bg-slate-50/40"}`}>
                            <td className="px-4 py-3 text-slate-400 text-xs">{(paginaActual-1)*PAGE_SIZE+i+1}</td>
                            <td className="px-4 py-3 text-xs font-mono text-slate-500">{e.codigoEstudiante||"—"}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div style={{backgroundColor:PRIMARY}} className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{e.apellidos?.charAt(0)}</div>
                                <div>
                                  <p className="font-semibold text-slate-700 text-xs">{e.apellidos} {e.nombres}</p>
                                  <p className="text-slate-400 text-xs">{e.genero==="M"?"Masculino":e.genero==="F"?"Femenino":"—"}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-slate-500">{e.cedula||"—"}</td>
                            <td className="px-4 py-3 text-xs text-slate-500">{e.representante||"—"}</td>
                            <td className="px-4 py-3 text-center">{e.discapacidad?<span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Sí</span>:<span className="text-slate-300">—</span>}</td>
                            <td className="px-4 py-3"><span className={`text-xs px-2 py-1 rounded-full font-medium ${estadoBadge(e.estado)}`}>{e.estado}</span></td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-center gap-1">
                                <button onClick={()=>setShowVer(e)} title="Ver" className="p-1.5 rounded-lg text-slate-400 hover:text-[#243A76] hover:bg-blue-50 transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
                                </button>
                                <button onClick={()=>{setEdit({...e});setTab("personal");setShowEditModal(true);setError("");}} title="Editar" className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition">
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                {(e.estado||"").toUpperCase().startsWith("ACTIV")
                                    ?<button onClick={()=>setShowConfirm({tipo:"desactivar",id:e.idEstudiante,nombre:`${e.nombres} ${e.apellidos}`})} title="Desactivar" className="p-1.5 rounded-lg text-slate-400 hover:text-orange-600 hover:bg-orange-50 transition">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/></svg>
                                    </button>
                                    :<button onClick={()=>setShowConfirm({tipo:"activar",id:e.idEstudiante,nombre:`${e.nombres} ${e.apellidos}`})} title="Activar" className="p-1.5 rounded-lg text-slate-400 hover:text-green-600 hover:bg-green-50 transition">
                                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                                    </button>}
                              </div>
                            </td>
                          </tr>
                      ))}
                      </tbody>
                    </table>
                  </div>}
        </div>

        {/* Paginación */}
        {totalPaginas > 1 && (
          <div className="flex items-center justify-between mt-3 px-1">
            <p className="text-xs text-slate-400">
              Mostrando {(paginaActual-1)*PAGE_SIZE+1}–{Math.min(paginaActual*PAGE_SIZE, filtrados.length)} de {filtrados.length}
            </p>
            <div className="flex items-center gap-1">
              <button onClick={()=>setPagina(p=>Math.max(1,p-1))} disabled={paginaActual===1}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                ← Anterior
              </button>
              {Array.from({length: totalPaginas}, (_,i)=>i+1)
                .filter(p => p===1 || p===totalPaginas || Math.abs(p-paginaActual)<=1)
                .reduce((acc, p, idx, arr) => {
                  if (idx > 0 && p - arr[idx-1] > 1) acc.push("...");
                  acc.push(p);
                  return acc;
                }, [])
                .map((p, i) => p === "..." ? (
                  <span key={`dot-${i}`} className="px-1 text-xs text-slate-300">…</span>
                ) : (
                  <button key={p} onClick={()=>setPagina(p)}
                    className={`w-7 h-7 text-xs rounded-lg font-medium transition ${p===paginaActual ? "text-white shadow-sm" : "text-slate-500 hover:bg-slate-100 border border-slate-200"}`}
                    style={p===paginaActual ? {backgroundColor: PRIMARY} : {}}>
                    {p}
                  </button>
                ))}
              <button onClick={()=>setPagina(p=>Math.min(totalPaginas,p+1))} disabled={paginaActual===totalPaginas}
                className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition">
                Siguiente →
              </button>
            </div>
          </div>
        )}

        {/* MODAL CREAR */}
        {showModal && (
            <Modal title="Nuevo Estudiante" onClose={()=>{setShowModal(false);reset();}} onSubmit={crear} saving={saving}
                   tabs={<><TabBtn id="personal" label="Personal"/><TabBtn id="medico" label="Médico"/><TabBtn id="representante" label="Representante"/></>}>
              {tab==="personal" && <TabPersonal d={form} s={setForm}/>}
              {tab==="medico" && <TabMedico d={med} s={setMed}/>}
              {tab==="representante" && <TabRep d={rep} s={setRep}/>}
              {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{error}</div>}
            </Modal>
        )}

        {/* MODAL EDITAR */}
        {showEditModal && edit && (
            <Modal title={`Editar — ${edit.nombres} ${edit.apellidos}`} onClose={()=>setShowEditModal(false)} onSubmit={editar} saving={saving}
                   tabs={<><TabBtn id="personal" label="Personal"/><TabBtn id="medico" label="Médico"/></>}>
              {tab==="personal" && <TabPersonal d={edit} s={setEdit}/>}
              {tab==="medico" && <TabMedico d={edit} s={setEdit}/>}
              {error && <div className="mt-3 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-red-600 text-xs">{error}</div>}
            </Modal>
        )}

        {/* MODAL VER — Ficha completa */}
        {showVer && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
              <div className="bg-white rounded-2xl shadow-2xl flex flex-col" style={{width:"700px",maxHeight:"92vh"}}>
                <div style={{backgroundColor:PRIMARY}} className="px-6 py-4 rounded-t-2xl flex items-center justify-between flex-shrink-0">
                  <h2 className="text-white font-bold">Ficha del Estudiante</h2>
                  <button onClick={()=>setShowVer(null)} className="text-white opacity-70 hover:opacity-100 text-xl">✕</button>
                </div>
                <div className="overflow-y-auto flex-1 p-6 space-y-5">
                  {/* Cabecera con foto */}
                  <div className="flex items-start gap-5">
                    <div className="flex-shrink-0">
                      {showVer.fotoUrl ? (
                        <img src={showVer.fotoUrl} alt="Foto" className="w-24 h-24 rounded-xl object-cover border-2 border-slate-200" />
                      ) : (
                        <div style={{backgroundColor:PRIMARY}} className="w-24 h-24 rounded-xl flex items-center justify-center text-white text-3xl font-bold opacity-90">
                          {showVer.apellidos?.charAt(0)}{showVer.nombres?.charAt(0)}
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-800 text-lg leading-tight">{showVer.apellidos} {showVer.nombres}</p>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">{showVer.codigoEstudiante || "Sin código asignado"}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold ${estadoBadge(showVer.estado)}`}>{showVer.estado}</span>
                        {showVer.origenListado && <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-medium">Origen: {showVer.origenListado}</span>}
                        {showVer.discapacidad && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">Discapacidad</span>}
                      </div>
                      {showVer.cedula && <p className="text-sm text-slate-600 mt-2 font-medium">C.I. {showVer.cedula}</p>}
                    </div>
                  </div>
                  <hr className="border-slate-200"/>

                  {/* Datos personales */}
                  <div>
                    <p className="text-xs font-bold uppercase mb-3 tracking-wider" style={{color:PRIMARY}}>Datos Personales</p>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                      {[
                        ["Fecha de nacimiento", showVer.fechaNacimiento],
                        ["Género", showVer.genero==="M"?"Masculino":showVer.genero==="F"?"Femenino":null],
                        ["Nacionalidad", showVer.nacionalidad],
                        ["Etnia", showVer.etnia],
                        ["Lugar de nacimiento", showVer.lugarNacimiento],
                        ["Vive con", showVer.viveCon],
                      ].map(([k,v]) => (
                        <div key={k}>
                          <p className="text-[11px] text-slate-400 uppercase tracking-wide">{k}</p>
                          <p className="font-medium text-slate-700">{v || "—"}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contacto */}
                  <div>
                    <p className="text-xs font-bold uppercase mb-3 tracking-wider" style={{color:PRIMARY}}>Contacto</p>
                    <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                      <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Teléfono</p><p className="font-medium text-slate-700">{showVer.telefono || "—"}</p></div>
                      <div className="col-span-2"><p className="text-[11px] text-slate-400 uppercase tracking-wide">Correo electrónico</p><p className="font-medium text-slate-700 break-all">{showVer.correo || "—"}</p></div>
                      <div className="col-span-3"><p className="text-[11px] text-slate-400 uppercase tracking-wide">Dirección</p><p className="font-medium text-slate-700">{showVer.direccion || "—"}</p></div>
                    </div>
                  </div>

                  {/* Situación familiar */}
                  {(showVer.numerosHermanos || showVer.beneficioSocial) && (
                    <div>
                      <p className="text-xs font-bold uppercase mb-3 tracking-wider" style={{color:PRIMARY}}>Situación Familiar</p>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                        {showVer.numerosHermanos != null && <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Hermanos en institución</p><p className="font-medium text-slate-700">{showVer.numerosHermanos}</p></div>}
                        <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Beneficio social</p><p className={`font-medium ${showVer.beneficioSocial?"text-green-600":"text-slate-400"}`}>{showVer.beneficioSocial ? "Sí" : "No"}</p></div>
                      </div>
                    </div>
                  )}

                  {/* Discapacidad */}
                  {showVer.discapacidad && (<>
                    <hr className="border-slate-200"/>
                    <div>
                      <p className="text-xs font-bold uppercase mb-3 tracking-wider" style={{color:PRIMARY}}>Discapacidad</p>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                        <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Tipo</p><p className="font-medium text-slate-700">{showVer.tipoDiscapacidad||"—"}</p></div>
                        <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Porcentaje</p><p className="font-medium text-slate-700">{showVer.porcentajeDisc?`${showVer.porcentajeDisc}%`:"—"}</p></div>
                        <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Carnet CONADIS</p><p className="font-medium text-slate-700">{showVer.carnetConadis||"—"}</p></div>
                      </div>
                    </div>
                  </>)}

                  {/* Ficha médica */}
                  {(showVer.tipoSangre || showVer.alergias || showVer.enfermedadesCronicas || showVer.medicamentos) && (<>
                    <hr className="border-slate-200"/>
                    <div>
                      <p className="text-xs font-bold uppercase mb-3 tracking-wider" style={{color:PRIMARY}}>Información Médica</p>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                        <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Tipo de sangre</p><p className="font-medium text-slate-700">{showVer.tipoSangre||"—"}</p></div>
                        <div className="col-span-2"><p className="text-[11px] text-slate-400 uppercase tracking-wide">Alergias</p><p className="font-medium text-slate-700">{showVer.alergias||"Ninguna"}</p></div>
                        {showVer.enfermedadesCronicas && <div className="col-span-3"><p className="text-[11px] text-slate-400 uppercase tracking-wide">Enfermedades crónicas</p><p className="font-medium text-slate-700">{showVer.enfermedadesCronicas}</p></div>}
                        {showVer.medicamentos && <div className="col-span-3"><p className="text-[11px] text-slate-400 uppercase tracking-wide">Medicamentos</p><p className="font-medium text-slate-700">{showVer.medicamentos}</p></div>}
                        {showVer.observacionesMedicas && <div className="col-span-3"><p className="text-[11px] text-slate-400 uppercase tracking-wide">Observaciones</p><p className="font-medium text-slate-700">{showVer.observacionesMedicas}</p></div>}
                      </div>
                    </div>
                  </>)}

                  {/* Contacto de emergencia */}
                  {(showVer.contactoEmergenciaNombre || showVer.contactoEmergenciaTelefono) && (<>
                    <hr className="border-slate-200"/>
                    <div>
                      <p className="text-xs font-bold uppercase mb-3 tracking-wider" style={{color:PRIMARY}}>Contacto de Emergencia</p>
                      <div className="grid grid-cols-3 gap-x-4 gap-y-2.5 text-sm">
                        <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Nombre</p><p className="font-medium text-slate-700">{showVer.contactoEmergenciaNombre||"—"}</p></div>
                        <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Teléfono</p><p className="font-medium text-slate-700">{showVer.contactoEmergenciaTelefono||"—"}</p></div>
                        <div><p className="text-[11px] text-slate-400 uppercase tracking-wide">Parentesco</p><p className="font-medium text-slate-700">{showVer.contactoEmergenciaParentesco||"—"}</p></div>
                      </div>
                    </div>
                  </>)}

                  {/* Representante */}
                  {showVer.representante && (<>
                    <hr className="border-slate-200"/>
                    <div>
                      <p className="text-xs font-bold uppercase mb-3 tracking-wider" style={{color:PRIMARY}}>Representante Legal</p>
                      <p className="text-sm font-medium text-slate-700">{showVer.representante}</p>
                    </div>
                  </>)}
                </div>

                {/* Footer con botones */}
                <div className="px-6 py-4 border-t border-slate-100 flex gap-3 flex-shrink-0">
                  <button onClick={()=>{setEdit({...showVer});setTab("personal");setShowEditModal(true);setShowVer(null);setError("");}}
                    className="flex-1 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 font-medium hover:bg-slate-50 transition flex items-center justify-center gap-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                    Editar
                  </button>
                  <button onClick={()=>setShowVer(null)} style={{backgroundColor:PRIMARY}}
                    className="flex-1 py-2.5 text-white rounded-xl text-sm font-semibold hover:opacity-90 transition">
                    Cerrar
                  </button>
                </div>
              </div>
            </div>
        )}

        {/* CONFIRMACIÓN */}
        {showConfirm&&(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={modalBg}>
              <div className="bg-white rounded-2xl shadow-2xl w-80 overflow-hidden">
                <div className={`px-6 py-4 ${showConfirm.tipo==="desactivar"?"bg-orange-500":"bg-green-500"}`}>
                  <h2 className="text-white font-bold">{showConfirm.tipo==="desactivar"?"Desactivar estudiante":"Activar estudiante"}</h2>
                </div>
                <div className="p-6">
                  <p className="text-slate-600 text-sm">¿{showConfirm.tipo==="desactivar"?"Desactivar":"Activar"} a <strong>{showConfirm.nombre}</strong>?</p>
                  <div className="flex gap-3 mt-5">
                    <button onClick={()=>setShowConfirm(null)} className="flex-1 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">Cancelar</button>
                    <button onClick={()=>cambiarEstado(showConfirm.id,showConfirm.tipo==="desactivar"?"INACTIVO":"ACTIVO")}
                            className={`flex-1 py-2 text-white rounded-lg text-sm font-medium transition ${showConfirm.tipo==="desactivar"?"bg-orange-500 hover:bg-orange-600":"bg-green-500 hover:bg-green-600"}`}>
                      Confirmar
                    </button>
                  </div>
                </div>
              </div>
            </div>
        )}

        {/* MODAL IMPORTAR CAS */}
        {showImportar && (
          <ImportarCasModal
            onClose={() => { setShowImportar(false); setSeccionSidebar("lista"); }}
            onSuccess={(msg) => { setShowImportar(false); setSeccionSidebar("lista"); setSuccess(msg); cargar(); }}
            onError={setError}
            headers={H}
          />
        )}
      </Layout>
  );
}

/* ══════════════════════════════════════════════════════════════
   MODAL DE IMPORTACIÓN CAS — sube PDF, muestra tabla editable
   ══════════════════════════════════════════════════════════════ */
function ImportarCasModal({ onClose, onSuccess, onError, headers }) {
  const [paso, setPaso] = useState(1); // 1=subir, 2=revisar, 3=guardando
  const [archivo, setArchivo] = useState(null);
  const [parsing, setParsing] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [estudiantes, setEstudiantes] = useState([]);
  const [grados, setGrados] = useState([]);
  const [anosLectivos, setAnosLectivos] = useState([]);
  const [idGrado, setIdGrado] = useState("");
  const [idParalelo, setIdParalelo] = useState("");
  const [paralelos, setParalelos] = useState([]);
  const [idAnoLectivo, setIdAnoLectivo] = useState("");
  const [saving, setSaving] = useState(false);
  const [resumen, setResumen] = useState(null);

  useEffect(() => {
    api.get(`/api/grados`, { headers }).then(r => setGrados(r.data)).catch(() => {});
    api.get(`/api/anos-lectivos`, { headers }).then(r => {
      setAnosLectivos(r.data);
      const actual = r.data.find(a => a.esActual);
      if (actual) setIdAnoLectivo(String(actual.idAnoLectivo));
    }).catch(() => {});
  }, []);

  const handleSubir = async () => {
    if (!archivo) return;
    setParsing(true);
    onError("");
    const formData = new FormData();
    formData.append("archivo", archivo);
    try {
      const r = await api.post(`/api/importacion-cas/parsear`, formData, {
        headers: { ...headers, "Content-Type": "multipart/form-data" },
      });
      setResultado(r.data);
      setEstudiantes(r.data.estudiantes);
      // Intentar seleccionar el grado automáticamente por nombre
      const anoEscolar = r.data.anoEscolar?.toUpperCase() || "";
      const match = grados.find(g => anoEscolar.includes(g.nombre.toUpperCase()) || g.nombre.toUpperCase().includes(anoEscolar));
      if (match) {
        setIdGrado(String(match.idGrado));
        const pars = match.paralelos?.filter(p => p.activo) || [];
        setParalelos(pars);
        const parLetra = r.data.paralelo?.trim().toUpperCase();
        if (parLetra) {
          const pm = pars.find(p => p.letra.toUpperCase() === parLetra);
          if (pm) setIdParalelo(String(pm.idParalelo));
        }
      }
      setPaso(2);
    } catch (e) {
      onError(e.response?.data?.message || "Error al parsear el PDF");
    } finally { setParsing(false); }
  };

  const handleCampo = (index, campo, valor) => {
    setEstudiantes(prev => {
      const copia = [...prev];
      copia[index] = { ...copia[index], [campo]: valor };
      return copia;
    });
  };

  const handleEliminarFila = (index) => {
    setEstudiantes(prev => prev.filter((_, i) => i !== index));
  };

  const handleGuardar = async () => {
    if (!idGrado) { onError("Selecciona un grado"); return; }
    if (!idParalelo) { onError("Selecciona un paralelo"); return; }
    if (!idAnoLectivo) { onError("Selecciona un año lectivo"); return; }
    if (estudiantes.length === 0) { onError("No hay estudiantes para importar"); return; }
    setSaving(true);
    setPaso(3);
    onError("");
    try {
      const r = await api.post(`/api/importacion-cas/confirmar`, {
        idGrado: Number(idGrado),
        idParalelo: Number(idParalelo),
        idAnoLectivo: Number(idAnoLectivo),
        estudiantes,
      }, { headers });
      setResumen(r.data);
    } catch (e) {
      onError(e.response?.data?.message || "Error al guardar");
      setPaso(2);
    } finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={modalBg}>
      <div className="bg-white rounded-2xl shadow-2xl w-full overflow-hidden flex flex-col"
        style={{ maxWidth: paso === 1 ? "480px" : "900px", maxHeight: "90vh" }}>

        {/* Header */}
        <div style={{ backgroundColor: PRIMARY }} className="px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <svg className="w-5 h-5 text-white opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
            <h2 className="text-white font-bold text-base">
              {paso === 1 && "Importar Listado CAS"}
              {paso === 2 && "Revisar datos del PDF"}
              {paso === 3 && (resumen ? "Importación completada" : "Guardando...")}
            </h2>
          </div>
          <button onClick={onClose} className="text-white text-opacity-70 hover:text-opacity-100 text-lg">✕</button>
        </div>

        {/* ── PASO 1: Subir archivo ── */}
        {paso === 1 && (
          <div className="p-6">
            <p className="text-sm text-slate-500 mb-4">
              Sube el PDF del <strong>listado CAS</strong> que genera el Ministerio de Educación.
              El sistema extraerá automáticamente la cédula, nombres y correo de cada estudiante.
            </p>

            <label className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl py-10 px-6 cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition group">
              <svg className="w-12 h-12 text-slate-300 group-hover:text-blue-400 transition mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              {archivo ? (
                <span className="text-sm font-medium text-slate-700">{archivo.name}</span>
              ) : (
                <span className="text-sm text-slate-400">Haz clic para seleccionar el PDF</span>
              )}
              <input type="file" accept=".pdf" className="hidden" onChange={e => setArchivo(e.target.files[0])} />
            </label>

            <div className="flex gap-3 mt-5">
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                Cancelar
              </button>
              <button
                onClick={handleSubir}
                disabled={!archivo || parsing}
                style={{ backgroundColor: PRIMARY }}
                className="flex-1 py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50"
              >
                {parsing ? "Leyendo PDF..." : "Subir y analizar"}
              </button>
            </div>
          </div>
        )}

        {/* ── PASO 2: Tabla editable ── */}
        {paso === 2 && (
          <div className="flex flex-col overflow-hidden flex-1">
            {/* Info del PDF */}
            <div className="px-6 pt-4 pb-3 border-b border-slate-100 flex-shrink-0">
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
                <span><strong>Año escolar:</strong> {resultado?.anoEscolar}</span>
                <span><strong>Paralelo:</strong> {resultado?.paralelo}</span>
                <span><strong>Año lectivo:</strong> {resultado?.anoLectivo}</span>
                <span><strong>Régimen:</strong> {resultado?.regimen}</span>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3">
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Asignar a grado</p>
                  <select value={idGrado} onChange={e => {
                    const gid = e.target.value;
                    setIdGrado(gid);
                    setIdParalelo("");
                    const g = grados.find(x => String(x.idGrado) === gid);
                    setParalelos(g?.paralelos?.filter(p => p.activo) || []);
                  }}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
                    <option value="">Seleccionar grado</option>
                    {grados.map(g => <option key={g.idGrado} value={g.idGrado}>{g.nombre}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Paralelo</p>
                  <select value={idParalelo} onChange={e => setIdParalelo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none"
                    disabled={!idGrado || paralelos.length === 0}>
                    <option value="">Seleccionar paralelo</option>
                    {paralelos.map(p => <option key={p.idParalelo} value={p.idParalelo}>{p.letra}</option>)}
                  </select>
                </div>
                <div>
                  <p className="text-[10px] font-semibold text-slate-400 uppercase mb-1">Año lectivo</p>
                  <select value={idAnoLectivo} onChange={e => setIdAnoLectivo(e.target.value)}
                    className="w-full px-3 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none">
                    <option value="">Seleccionar</option>
                    {anosLectivos.map(a => <option key={a.idAnoLectivo} value={a.idAnoLectivo}>{a.nombre}{a.esActual ? " (Actual)" : ""}</option>)}
                  </select>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                {estudiantes.length} estudiantes encontrados — Revisa y corrige los datos antes de guardar
              </p>
            </div>

            {/* Tabla */}
            <div className="flex-1 overflow-auto px-6 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="text-left py-2 pr-2 w-8">#</th>
                    <th className="text-left py-2 pr-2">Cédula</th>
                    <th className="text-left py-2 pr-2">Apellidos</th>
                    <th className="text-left py-2 pr-2">Nombres</th>
                    <th className="text-left py-2 pr-2">Email</th>
                    <th className="text-center py-2 w-12">Estado</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {estudiantes.map((est, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="py-1.5 pr-2 text-slate-400 text-xs">{est.fila}</td>
                      <td className="py-1.5 pr-2">
                        <input value={est.cedula} onChange={e => handleCampo(i, "cedula", e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400"
                          style={{ minWidth: "100px" }} />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input value={est.apellidos} onChange={e => handleCampo(i, "apellidos", e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input value={est.nombres} onChange={e => handleCampo(i, "nombres", e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400" />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input value={est.email} onChange={e => handleCampo(i, "email", e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-200 rounded bg-white focus:outline-none focus:border-blue-400"
                          style={{ minWidth: "180px" }} />
                      </td>
                      <td className="py-1.5 text-center">
                        {est.yaExiste ? (
                          <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded font-medium">Existe</span>
                        ) : (
                          <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">Nuevo</span>
                        )}
                      </td>
                      <td className="py-1.5 text-center">
                        <button onClick={() => handleEliminarFila(i)} className="text-red-300 hover:text-red-500 transition" title="Quitar">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Botones */}
            <div className="px-6 py-3 border-t border-slate-100 flex items-center justify-between flex-shrink-0">
              <button onClick={() => setPaso(1)} className="text-sm text-slate-500 hover:text-slate-700 flex items-center gap-1 transition">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                Volver
              </button>
              <div className="flex gap-3">
                <button onClick={onClose} className="px-4 py-2 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50 transition">
                  Cancelar
                </button>
                <button
                  onClick={handleGuardar}
                  disabled={saving || !idGrado || !idParalelo || !idAnoLectivo}
                  style={{ backgroundColor: PRIMARY }}
                  className="px-6 py-2 text-white rounded-lg text-sm font-medium hover:opacity-90 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  Guardar {estudiantes.length} estudiantes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── PASO 3: Resultado ── */}
        {paso === 3 && (
          <div className="p-6">
            {!resumen ? (
              <div className="text-center py-8">
                <div className="animate-spin w-8 h-8 border-3 border-slate-200 border-t-blue-600 rounded-full mx-auto mb-3"></div>
                <p className="text-sm text-slate-500">Guardando estudiantes y matrículas...</p>
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-700">Importación exitosa</h3>
                    <p className="text-xs text-slate-400">Se procesaron {resumen.total} registros del listado CAS</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-5">
                  <div className="bg-green-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-green-700">{resumen.creados}</p>
                    <p className="text-[10px] text-green-600 font-semibold uppercase mt-1">Nuevos creados</p>
                  </div>
                  <div className="bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-amber-700">{resumen.existentes}</p>
                    <p className="text-[10px] text-amber-600 font-semibold uppercase mt-1">Ya existían</p>
                  </div>
                  <div className="bg-blue-50 rounded-xl p-4 text-center">
                    <p className="text-2xl font-bold text-blue-700">{resumen.matriculados}</p>
                    <p className="text-[10px] text-blue-600 font-semibold uppercase mt-1">Matriculados</p>
                  </div>
                </div>

                <button
                  onClick={() => onSuccess(`Importación completada: ${resumen.creados} nuevos, ${resumen.matriculados} matriculados`)}
                  style={{ backgroundColor: PRIMARY }}
                  className="w-full py-2.5 text-white rounded-lg text-sm font-medium hover:opacity-90 transition"
                >
                  Cerrar
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
