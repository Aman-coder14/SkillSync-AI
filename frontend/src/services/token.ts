const AUTH_TOKEN_KEY = "skillsync.authToken";

export function getStoredToken(): string | null {
    return window.sessionStorage.getItem(AUTH_TOKEN_KEY);
}

export function storeToken(token: string): void {
    window.sessionStorage.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken(): void {
    window.sessionStorage.removeItem(AUTH_TOKEN_KEY);
}