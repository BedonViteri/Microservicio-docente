import { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../../config/axios";
import logo from "../../assets/logo.png";

export default function Login() {
    const [form, setForm] = useState({ username: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/api/auth/login", form);
            localStorage.setItem("token", res.data.token);
            localStorage.setItem("username", res.data.username);
            localStorage.setItem("roles", JSON.stringify(res.data.roles));
            localStorage.setItem("primerIngreso", res.data.primerIngreso);

            if (res.data.primerIngreso) {
                navigate("/cambiar-password");
            } else {
                if (res.data.roles && res.data.roles.includes("ROLE_DOCENTE")) {
                    navigate("/docente");
                } else {
                    navigate("/dashboard");
                }
            }
        } catch (err) {
            setError("Usuario o contraseña incorrectos");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4">
            {/* Fondo decorativo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-blue-900 opacity-10" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-blue-700 opacity-10" />
            </div>

            <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden relative z-10">
                {/* Header azul */}
                <div className="bg-blue-900 px-8 pt-8 pb-6 flex flex-col items-center">
                    {/* Logo circular con colores reales */}
                    <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white shadow-lg mb-3">
                        <img
                            src={logo}
                            alt="Logo Provincias Unidas"
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <h1 className="text-white text-lg font-bold tracking-wide text-center leading-tight">
                        Escuela de Educación Básica
                    </h1>
                    <p className="text-blue-200 text-sm font-semibold tracking-widest uppercase mt-1">
                        Provincias Unidas
                    </p>
                    <p className="text-blue-300 text-xs mt-1">Rcto. San Basilio</p>
                </div>

                {/* Formulario */}
                <div className="px-8 py-6">
                    <h2 className="text-slate-700 text-base font-semibold mb-5 text-center">
                        Inicia sesión en el sistema
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        {/* Usuario */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                                Usuario
                            </label>
                            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </span>
                                <input
                                    type="text"
                                    name="username"
                                    value={form.username}
                                    onChange={handleChange}
                                    placeholder="Ingresa tu usuario"
                                    required
                                    className="w-full pl-9 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50"
                                />
                            </div>
                        </div>

                        {/* Contraseña */}
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 mb-1 uppercase tracking-wide">
                                Contraseña
                            </label>
                            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                          d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                                <input
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    value={form.password}
                                    onChange={handleChange}
                                    placeholder="Ingresa tu contraseña"
                                    required
                                    className="w-full pl-9 pr-10 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition bg-slate-50"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition"
                                >
                                    {showPassword ? (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 4.411m0 0L21 21" />
                                        </svg>
                                    ) : (
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 flex items-center gap-2">
                                <svg className="w-4 h-4 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                                          d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                <p className="text-red-600 text-xs">{error}</p>
                            </div>
                        )}

                        {/* Botón */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-blue-900 hover:bg-blue-800 text-white font-semibold py-2.5 rounded-lg text-sm transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                  </svg>
                  Ingresando...
                </span>
                            ) : "Ingresar"}
                        </button>

                        {/* Cambiar contraseña */}
                        <div className="text-center pt-1">
                            <button
                                type="button"
                                onClick={() => navigate("/cambiar-password")}
                                className="text-xs text-blue-600 hover:text-blue-800 hover:underline transition"
                            >
                                ¿Necesitas cambiar tu contraseña?
                            </button>
                        </div>
                    </form>
                </div>

                {/* Footer */}
                <div className="px-8 pb-5 text-center">
                    <p className="text-xs text-slate-400">
                        Sistema de Gestión Académica © 2026
                    </p>
                </div>
            </div>
        </div>
    );
}