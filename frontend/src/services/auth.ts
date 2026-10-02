import axios from "axios";
import api from "./api";

export interface AuthUser {
    id: string;
    name: string;
    email: string;
}

export interface AuthSession {
    token: string;
    user: AuthUser;
}

export async function registerUser(
    name: string,
    email: string,
    password: string
): Promise<AuthUser> {
    const response = await api.post<{ user: AuthUser }>("/auth/register", {
        name,
        email,
        password
    });
    return response.data.user;
}

export async function loginUser(email: string, password: string): Promise<AuthSession> {
    const response = await api.post<AuthSession>("/auth/login", { email, password });
    return response.data;
}

export async function getCurrentUser(): Promise<AuthUser> {
    const response = await api.get<{ user: AuthUser }>("/auth/me");
    return response.data.user;
}

export function getAuthErrorMessage(error: unknown, fallback: string): string {
    if (axios.isAxiosError<{ error?: string }>(error)) {
        return error.response?.data?.error ?? fallback;
    }
    return fallback;
}