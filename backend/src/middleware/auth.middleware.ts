import type { RequestHandler } from "express";
import jwt from "jsonwebtoken";

const authenticate: RequestHandler = (req, res, next) => {
    const authorization = req.header("authorization");
    const match = authorization?.match(/^Bearer\s+(\S+)$/i);
    if (!match) {
        return res.status(401).json({ error: "Authentication required" });
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
        return res.status(500).json({ error: "Authentication is not configured" });
    }

    try {
        const payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
        if (typeof payload === "string" || typeof payload.sub !== "string") {
            return res.status(401).json({ error: "Invalid or expired token" });
        }
        req.userId = payload.sub;
        return next();
    } catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
};

export default authenticate;