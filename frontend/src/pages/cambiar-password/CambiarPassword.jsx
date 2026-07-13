import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/axios";
import logo from "../../assets/logo.png";
const PRIMARY = "#243A76";

export default function CambiarPassword() {
  const [form, setForm] = useState({
    passwordActual: "",
    passwordNuevo: "",
    passwordConfirmar: "",
  });
  const [show, setShow] = useState({
    actual: false, nuevo: false, confirmar: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const navigate = useNavigate();


  const username = localStorage.getItem("username") || "Usuario";
  const primerIngreso = localStorage.getItem("primerIngreso") === "true";

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const validar = () => {
    if (form.passwordNuevo.length < 6)
      return "La nueva contraseña debe tener al menos 6 caracteres.";
    if (form.passwordNuevo === form.passwordActual)
      return "La nueva contraseña no puede ser igual a la actual.";
    if (form.passwordNuevo !== form.passwordConfirmar)
      return "Las contraseñas nuevas no coinciden.";
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validar();
    if (err) { setError(err); return; }

    setLoading(true); setError("");
    try {
      await api.patch(
        `/api/auth/cambiar-password`,
        {
          passwordActual: form.passwordActual,
          passwordNuevo: form.passwordNuevo,
        }
      );
      setSuccess("¡Contraseña actualizada correctamente!");
      localStorage.setItem("primerIngreso", "false");
      setTimeout(() => navigate("/dashboard"), 1500);
    } catch (e) {
      setError(e.response?.data?.message || "Error al cambiar la contraseña.");
    } finally {
      setLoading(false);
    }
  };

  const EyeIcon = ({ visible }) => visible ? (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
    </svg>
  ) : (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
      {/* Fondo decorativo */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: PRIMARY }} />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: PRIMARY }} />
      </div>

      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10">
        {/* Header */}
        <div style={{ backgroundColor: PRIMARY }} className="px-8 pt-7 pb-6 flex flex-col items-center">
          <div className="w-16 h-16 rounded-full overflow-hidden border-4 border-white shadow-lg mb-3">
            <img src={logo} alt="Logo" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-white text-base font-bold tracking-wide text-center">
            {primerIngreso ? "Bienvenido al sistema" : "Cambiar contraseña"}
          </h1>
          <p className="text-white text-opacity-70 text-xs mt-1 text-center capitalize">{username}</p>
        </div>

        {/* Aviso primer ingreso */}
        {primerIngreso && (
          <div className="mx-6 mt-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 flex items-start gap-2">
            <svg className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-amber-700 text-xs">
              Por seguridad, debes cambiar tu contraseña temporal antes de continuar.
            </p>
          </div>
        )}

        {/* Formulario */}
        <div className="px-8 py-6">
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Contraseña actual */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Contraseña actual
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type={show.actual ? "text" : "password"}
                  name="passwordActual"
                  value={form.passwordActual}
                  onChange={handleChange}
                  placeholder="Tu contraseña actual"
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 bg-slate-50 transition"
                />
                <button type="button" onClick={() => setShow({ ...show, actual: !show.actual })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  <EyeIcon visible={show.actual} />
                </button>
              </div>
            </div>

            {/* Nueva contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Nueva contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                </span>
                <input
                  type={show.nuevo ? "text" : "password"}
                  name="passwordNuevo"
                  value={form.passwordNuevo}
                  onChange={handleChange}
                  placeholder="Mínimo 6 caracteres"
                  required
                  className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 bg-slate-50 transition"
                />
                <button type="button" onClick={() => setShow({ ...show, nuevo: !show.nuevo })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  <EyeIcon visible={show.nuevo} />
                </button>
              </div>
              {/* Indicador de fortaleza */}
              {form.passwordNuevo && (
                <div className="mt-1.5 flex gap-1">
                  {[1,2,3,4].map(n => (
                    <div key={n} className={`h-1 flex-1 rounded-full transition-all ${
                      form.passwordNuevo.length >= n * 3
                        ? n <= 1 ? "bg-red-400" : n <= 2 ? "bg-amber-400" : n <= 3 ? "bg-blue-400" : "bg-green-500"
                        : "bg-slate-200"
                    }`} />
                  ))}
                </div>
              )}
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </span>
                <input
                  type={show.confirmar ? "text" : "password"}
                  name="passwordConfirmar"
                  value={form.passwordConfirmar}
                  onChange={handleChange}
                  placeholder="Repite la nueva contraseña"
                  required
                  className={`w-full pl-9 pr-10 py-2.5 border rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 bg-slate-50 transition ${
                    form.passwordConfirmar && form.passwordNuevo !== form.passwordConfirmar
                      ? "border-red-300 focus:ring-red-200"
                      : form.passwordConfirmar && form.passwordNuevo === form.passwordConfirmar
                      ? "border-green-300 focus:ring-green-200"
                      : "border-slate-200"
                  }`}
                />
                <button type="button" onClick={() => setShow({ ...show, confirmar: !show.confirmar })}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition">
                  <EyeIcon visible={show.confirmar} />
                </button>
                {form.passwordConfirmar && form.passwordNuevo === form.passwordConfirmar && (
                  <span className="absolute right-9 top-1/2 -translate-y-1/2 text-green-500">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
              </div>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-600 text-xs">{error}</p>
              </div>
            )}

            {/* Éxito */}
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-green-600 text-xs">{success}</p>
              </div>
            )}

            {/* Botón */}
            <button
              type="submit"
              disabled={loading}
              style={{ backgroundColor: PRIMARY }}
              className="w-full text-white font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 shadow-md hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Actualizando...
                </span>
              ) : "Actualizar contraseña"}
            </button>

            {/* Cancelar — solo si NO es primer ingreso */}
            {!primerIngreso && (
              <button
                type="button"
                onClick={() => navigate("/dashboard")}
                className="w-full py-2 border border-slate-200 rounded-lg text-sm text-slate-500 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
            )}
          </form>
        </div>

        <div className="px-8 pb-5 text-center">
          <p className="text-xs text-slate-400">Sistema de Gestión Académica © 2026</p>
        </div>
      </div>
    </div>
  );
}
