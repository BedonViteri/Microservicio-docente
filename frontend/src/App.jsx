import { useEffect, useState } from "react";
import DocentePanel from "./pages/docente/DocentePanel";

function App() {
    const [authenticated, setAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        const token = query.get("token");
        const username = query.get("username");
        const roles = query.get("roles");

        if (token) {
            localStorage.setItem("token", token);
            if (username) localStorage.setItem("username", username);
            if (roles) localStorage.setItem("roles", roles);
            
            // Clean query parameters from URL
            window.history.replaceState({}, document.title, window.location.pathname);
            setAuthenticated(true);
            setLoading(false);
        } else {
            const savedToken = localStorage.getItem("token");
            if (savedToken) {
                setAuthenticated(true);
                setLoading(false);
            } else {
                // Redirect to main login portal
                window.location.href = "http://localhost:5173/login";
            }
        }
    }, []);

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="text-slate-500 font-medium animate-pulse">Cargando Portal Docente...</div>
            </div>
        );
    }

    if (authenticated) {
        return <DocentePanel />;
    }

    return null;
}

export default App;