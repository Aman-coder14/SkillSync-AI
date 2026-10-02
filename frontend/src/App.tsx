import type { ReactNode } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useAuth } from "./context/AuthContext";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";

function SessionCheck() {
    return (
        <main className="session-check" aria-live="polite">
            <span className="session-check__mark" aria-hidden="true" />
            <p>Checking your session...</p>
        </main>
    );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
    const { status } = useAuth();

    if (status === "loading") {
        return <SessionCheck />;
    }
    if (status !== "authenticated") {
        return <Navigate to="/login" replace />;
    }
    return children;
}

function GuestRoute({ children }: { children: ReactNode }) {
    const { status } = useAuth();

    if (status === "loading") {
        return <SessionCheck />;
    }
    if (status === "authenticated") {
        return <Navigate to="/dashboard" replace />;
    }
    return children;
}

function HomeRedirect() {
    const { status } = useAuth();
    if (status === "loading") {
        return <SessionCheck />;
    }
    return <Navigate to={status === "authenticated" ? "/dashboard" : "/login"} replace />;
}

function App() {
    return (
        <Routes>
            <Route path="/" element={<HomeRedirect />} />
            <Route path="/login" element={<GuestRoute><LoginPage /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />
            <Route path="/dashboard" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
            <Route path="*" element={<HomeRedirect />} />
        </Routes>
    );
}

export default App;
