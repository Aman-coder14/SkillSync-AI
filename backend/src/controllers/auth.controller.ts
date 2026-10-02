import type { Request, Response } from "express";
import {
    AuthServiceError,
    findPublicUserById,
    loginUser,
    registerUser
} from "../services/auth.service";

interface AuthRequestBody {
    name?: unknown;
    email?: unknown;
    password?: unknown;
}

function sendError(res: Response, error: unknown) {
    if (error instanceof AuthServiceError) {
        return res.status(error.statusCode).json({ error: error.message });
    }
    return res.status(500).json({ error: "Internal server error" });
}

function isValidEmail(email: string): boolean {
    return (
        Buffer.byteLength(email, "utf8") <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    );
}

export async function register(req: Request, res: Response) {
    const body = (req.body ?? {}) as AuthRequestBody;
    const { name, email, password } = body;

    if (
        typeof name !== "string" ||
        typeof email !== "string" ||
        typeof password !== "string"
    ) {
        return res.status(400).json({ error: "Name, email, and password are required" });
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    if (
        !normalizedName ||
        normalizedName.length > 120 ||
        !isValidEmail(normalizedEmail) ||
        Buffer.byteLength(password, "utf8") < 8 ||
        Buffer.byteLength(password, "utf8") > 72
    ) {
        return res.status(400).json({ error: "Invalid registration details" });
    }

    try {
        const user = await registerUser(normalizedName, normalizedEmail, password);
        return res.status(201).json({ user });
    } catch (error) {
        return sendError(res, error);
    }
}

export async function login(req: Request, res: Response) {
    const body = (req.body ?? {}) as AuthRequestBody;
    const { email, password } = body;

    if (
        typeof email !== "string" ||
        typeof password !== "string" ||
        !isValidEmail(email.trim()) ||
        !password ||
        Buffer.byteLength(password, "utf8") > 72
    ) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    try {
        const result = await loginUser(email.trim().toLowerCase(), password);
        return res.json(result);
    } catch (error) {
        return sendError(res, error);
    }
}

export async function me(req: Request, res: Response) {
    if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    try {
        const user = await findPublicUserById(req.userId);
        if (!user) {
            return res.status(401).json({ error: "Authentication required" });
        }
        return res.json({ user });
    } catch (error) {
        return sendError(res, error);
    }
}