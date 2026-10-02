import type { ReactNode } from "react";
import { Link } from "react-router-dom";

interface AuthShellProps {
    eyebrow: string;
    title: string;
    children: ReactNode;
}

export function AuthShell({ eyebrow, title, children }: AuthShellProps) {
    return (
        <main className="auth-page">
            <header className="auth-header">
                <Link className="brand" to="/">SkillSync AI</Link>
                <span className="auth-header__note">Personal workspace</span>
            </header>
            <section className="auth-main">
                <p className="eyebrow">{eyebrow}</p>
                <h1>{title}</h1>
                {children}
            </section>
        </main>
    );
}