import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage } from "../services/auth";

interface LocationState {
    notice?: string;
}

export function LoginPage() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const notice = (location.state as LocationState | null)?.notice;
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            await login(email.trim(), password);
            setPassword("");
            navigate("/dashboard", { replace: true });
        } catch (requestError) {
            setError(getAuthErrorMessage(requestError, "Unable to sign in. Please try again."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell eyebrow="Welcome back" title="Sign in">
            {notice ? <p className="form-message form-message--success" role="status">{notice}</p> : null}
            {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-field">
                    <label htmlFor="login-email">Email</label>
                    <input
                        autoComplete="email"
                        id="login-email"
                        maxLength={254}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        type="email"
                        value={email}
                    />
                </div>
                <div className="form-field">
                    <label htmlFor="login-password">Password</label>
                    <input
                        autoComplete="current-password"
                        id="login-password"
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        type="password"
                        value={password}
                    />
                </div>
                <button className="auth-submit" disabled={submitting} type="submit">
                    {submitting ? "Signing in..." : "Sign in"}
                </button>
            </form>
            <p className="auth-switch">
                New to SkillSync AI? <Link to="/register">Create an account</Link>
            </p>
        </AuthShell>
    );
}