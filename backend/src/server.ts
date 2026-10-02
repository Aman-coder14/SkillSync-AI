import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import pool from "./config/database";
import authRoutes from "./routes/auth.routes";
import resumeRoutes from "./routes/resume.routes";

dotenv.config();

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173"
}));

app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/resumes", resumeRoutes);

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "SkillSync AI backend is running"
    });
});

app.get("/api/db-test", async (req, res) => {
    if (!process.env.DATABASE_URL) {
        return res.status(500).json({
            status: "error",
            message: "Database connection is not configured"
        });
    }

    try {
        const result = await pool.query("SELECT NOW()");
        return res.json({
            status: "ok",
            message: "Database connection successful",
            time: result.rows[0].now
        });
    } catch {
        return res.status(500).json({
            status: "error",
            message: "Database connection failed"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Backend running on http://localhost:${PORT}`);
});