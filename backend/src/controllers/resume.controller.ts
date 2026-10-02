import type { RequestHandler } from "express";
import mammoth from "mammoth";
import pdfParse from "pdf-parse";
import pool from "../config/database";
import { AIConfigurationError, AIProviderError, AIResponseError, parseResume } from "../services/ai.service";

const PDF_SIGNATURE = Buffer.from("%PDF-");
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

export const uploadResume: RequestHandler = async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    const file = req.file;
    if (!file || file.size === 0) {
        return res.status(400).json({ error: "Choose a non-empty PDF or DOCX file" });
    }

    const extension = file.originalname.split(".").pop()?.toLowerCase();
    let rawText: string;

    try {
        if (extension === "pdf" && file.buffer.subarray(0, PDF_SIGNATURE.length).equals(PDF_SIGNATURE)) {
            rawText = (await pdfParse(file.buffer)).text;
        } else if (extension === "docx" && file.buffer.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE)) {
            rawText = (await mammoth.extractRawText({ buffer: file.buffer })).value;
        } else {
            return res.status(400).json({ error: "The uploaded file is not a valid PDF or DOCX" });
        }
    } catch {
        return res.status(400).json({ error: "The uploaded file could not be read" });
    }

    rawText = rawText.trim();
    if (!rawText) {
        return res.status(400).json({ error: "No text could be extracted from this file" });
    }

    try {
        const result = await pool.query(
            `INSERT INTO resumes (user_id, file_name, file_path, raw_text, parsed_data)
             VALUES ($1, $2, NULL, $3, NULL)
             RETURNING id, file_name, created_at`,
            [req.userId, file.originalname, rawText]
        );
        const resume = result.rows[0];

        return res.status(201).json({
            id: resume.id,
            fileName: resume.file_name,
            extractedTextStatus: "extracted",
            createdAt: resume.created_at
        });
    } catch {
        return res.status(500).json({ error: "Resume could not be saved" });
    }
};

export const parseUploadedResume: RequestHandler = async (req, res) => {
    if (!req.userId) {
        return res.status(401).json({ error: "Authentication required" });
    }

    let resume;
    try {
        const result = await pool.query(
            "SELECT id, file_name, raw_text FROM resumes WHERE id = $1 AND user_id = $2",
            [req.params.id, req.userId]
        );
        resume = result.rows[0];
    } catch {
        return res.status(500).json({ error: "Resume could not be loaded" });
    }

    if (!resume) {
        return res.status(404).json({ error: "Resume not found" });
    }
    if (typeof resume.raw_text !== "string" || !resume.raw_text.trim()) {
        return res.status(400).json({ error: "This resume has no extracted text to parse" });
    }

    let parsedData;
    try {
        parsedData = await parseResume(resume.raw_text);
    } catch (error) {
        if (error instanceof AIConfigurationError) {
            return res.status(500).json({ error: "AI resume parsing is not configured" });
        }
        if (error instanceof AIResponseError) {
            return res.status(502).json({ error: "AI returned an invalid resume profile. Please try again." });
        }
        if (error instanceof AIProviderError) {
            return res.status(502).json({ error: "AI resume parsing is unavailable. Please try again later." });
        }
        return res.status(502).json({ error: "AI resume parsing failed. Please try again later." });
    }

    try {
        const result = await pool.query(
            `UPDATE resumes
             SET parsed_data = $1::JSONB, updated_at = NOW()
             WHERE id = $2 AND user_id = $3
             RETURNING id, file_name, parsed_data, updated_at`,
            [JSON.stringify(parsedData), req.params.id, req.userId]
        );
        const updatedResume = result.rows[0];
        if (!updatedResume) {
            return res.status(404).json({ error: "Resume not found" });
        }
        return res.json({
            resume: {
                id: updatedResume.id,
                file_name: updatedResume.file_name,
                parsed_data: updatedResume.parsed_data,
                updated_at: updatedResume.updated_at
            }
        });
    } catch {
        return res.status(500).json({ error: "Parsed resume could not be saved" });
    }
};