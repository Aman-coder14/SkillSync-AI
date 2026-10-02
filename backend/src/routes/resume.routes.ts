import { Router } from "express";
import multer from "multer";
import { parseUploadedResume, uploadResume } from "../controllers/resume.controller";
import authenticate from "../middleware/auth.middleware";

const router = Router();
const allowedMimeTypes = new Set([
    "application/pdf",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
    "application/octet-stream"
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024, files: 1 },
    fileFilter: (_req, file, callback) => {
        const extension = file.originalname.split(".").pop()?.toLowerCase();
        if (!["pdf", "docx"].includes(extension ?? "") || !allowedMimeTypes.has(file.mimetype)) {
            callback(new Error("Only PDF and DOCX files are supported"));
            return;
        }
        callback(null, true);
    }
});

router.post("/:id/parse", authenticate, parseUploadedResume);

router.post("/upload", authenticate, (req, res, next) => {
    upload.single("resume")(req, res, (error: unknown) => {
        if (error instanceof multer.MulterError) {
            const status = error.code === "LIMIT_FILE_SIZE" ? 413 : 400;
            res.status(status).json({ error: status === 413 ? "File must be 10 MB or smaller" : "Upload one file at a time" });
            return;
        }
        if (error) {
            res.status(400).json({ error: "Only PDF and DOCX files are supported" });
            return;
        }
        next();
    });
}, uploadResume);

export default router;