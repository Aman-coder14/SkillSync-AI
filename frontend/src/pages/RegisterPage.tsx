import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthShell } from "../components/AuthShell";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage } from "../services/auth";

export function RegisterPage() {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [submitting, setSubmitting] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setError("");
        if (new TextEncoder().encode(password).length > 72) {
            setError("Password must be 72 bytes or fewer.");
            return;
        }

        setSubmitting(true);
        try {
            await register(name.trim(), email.trim(), password);
            setPassword("");
            navigate("/login", {
                replace: true,
                state: { notice: "Account created. Sign in to continue." }
            });
        } catch (requestError) {
            setError(getAuthErrorMessage(requestError, "Unable to create your account. Please try again."));
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <AuthShell eyebrow="Get started" title="Create account">
            {error ? <p className="form-message form-message--error" role="alert">{error}</p> : null}
            <form className="auth-form" onSubmit={handleSubmit}>
                <div className="form-field">
                    <label htmlFor="register-name">Name</label>
                    <input
                        autoComplete="name"
                        id="register-name"
                        maxLength={120}
                        onChange={(event) => setName(event.target.value)}
                        required
                        value={name}
                    />
                </div>
                <div className="form-field">
                    <label htmlFor="register-email">Email</label>
                    <input
                        autoComplete="email"
                        id="register-email"
                        maxLength={254}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                        type="email"
                        value={email}
                    />
                </div>
                <div className="form-field">
                    <label htmlFor="register-password">Password</label>
                    <input
                        autoComplete="new-password"
                        id="register-password"
                        minLength={8}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                        type="password"
                        value={password}
                    />
                    <span className="field-hint">Use at least 8 characters.</span>
                </div>
                <button className="auth-submit" disabled={submitting} type="submit">
                    {submitting ? "Creating account..." : "Create account"}
                </button>
            </form>
            <p className="auth-switch">
                Already registered? <Link to="/login">Sign in</Link>
            </p>
        </AuthShell>
    );
}