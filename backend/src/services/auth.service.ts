import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import pool from "../config/database";

export interface PublicUser {
    id: string;
    name: string;
    email: string;
}

interface StoredUser extends PublicUser {
    password_hash: string;
}

export class AuthServiceError extends Error {
    constructor(
        public readonly statusCode: number,
        message: string
    ) {
        super(message);
        this.name = "AuthServiceError";
    }
}

function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new AuthServiceError(500, "Authentication is not configured");
    }
    return secret;
}

export async function registerUser(
    name: string,
    email: string,
    password: string
): Promise<PublicUser> {
    const existingUser = await pool.query<{ id: string }>(
        "SELECT id FROM users WHERE email = $1",
        [email]
    );

    if (existingUser.rowCount) {
        throw new AuthServiceError(409, "Email is already registered");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    try {
        const result = await pool.query<PublicUser>(
            `INSERT INTO users (name, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, name, email`,
            [name, email, passwordHash]
        );
        return result.rows[0];
    } catch (error) {
        if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "23505"
        ) {
            throw new AuthServiceError(409, "Email is already registered");
        }
        throw error;
    }
}

export async function loginUser(
    email: string,
    password: string
): Promise<{ token: string; user: PublicUser }> {
    const result = await pool.query<StoredUser>(
        "SELECT id, name, email, password_hash FROM users WHERE email = $1",
        [email]
    );
    const storedUser = result.rows[0];

    if (!storedUser || !(await bcrypt.compare(password, storedUser.password_hash))) {
        throw new AuthServiceError(401, "Invalid email or password");
    }

    const user: PublicUser = {
        id: storedUser.id,
        name: storedUser.name,
        email: storedUser.email
    };
    const token = jwt.sign({ sub: user.id }, getJwtSecret(), { expiresIn: "1h" });

    return { token, user };
}

export async function findPublicUserById(userId: string): Promise<PublicUser | null> {
    const result = await pool.query<PublicUser>(
        "SELECT id, name, email FROM users WHERE id = $1",
        [userId]
    );
    return result.rows[0] ?? null;
}