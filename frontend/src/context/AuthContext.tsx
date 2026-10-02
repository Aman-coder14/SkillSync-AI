import { createContext, useContext, useEffect, useState } from "react";
import {
    getCurrentUser,
    loginUser as requestLogin,
    registerUser as requestRegister,
    type AuthUser
} from "../services/auth";
import { clearStoredToken, getStoredToken, storeToken } from "../services/token";

type AuthStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
    user: AuthUser | null;
    status: AuthStatus;
    login: (email: string, password: string) => Promise<void>;
    register: (name: string, email: string, password: string) => Promise<void>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [status, setStatus] = useState<AuthStatus>("loading");

    useEffect(() => {
        let active = true;
        if (!getStoredToken()) {
            setStatus("unauthenticated");
            return () => {
                active = false;
            };
        }

        getCurrentUser()
            .then((currentUser) => {
                if (active) {
                    setUser(currentUser);
                    setStatus("authenticated");
                }
            })
            .catch(() => {
                clearStoredToken();
                if (active) {
                    setUser(null);
                    setStatus("unauthenticated");
                }
            });

        return () => {
            active = false;
        };
    }, []);

    async function login(email: string, password: string): Promise<void> {
        const session = await requestLogin(email, password);
        storeToken(session.token);
        setUser(session.user);
        setStatus("authenticated");
    }

    async function register(name: string, email: string, password: string): Promise<void> {
        await requestRegister(name, email, password);
    }

    function logout(): void {
        clearStoredToken();
        setUser(null);
        setStatus("unauthenticated");
    }

    return (
        <AuthContext.Provider value={{ user, status, login, register, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth(): AuthContextValue {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}