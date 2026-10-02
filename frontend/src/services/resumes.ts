import api from "./api";

export interface UploadedResume {
    id: string;
    fileName: string;
    extractedTextStatus: string;
    createdAt: string;
}

export interface CandidateProfile {
    summary: string | null;
    skills: { name: string; category: string | null; proficiency: string | null }[];
    education: { institution: string; degree: string | null; field: string | null; startDate: string | null; endDate: string | null }[];
    experience: { company: string; role: string; startDate: string | null; endDate: string | null; description: string[]; technologies: string[] }[];
    projects: { name: string; description: string; technologies: string[]; responsibilities: string[] }[];
    certifications: string[];
    achievements: string[];
    languages: string[];
    resumeClaims: { claim: string; category: string; evidence: string }[];
}

export interface ParsedResume {
    id: string;
    file_name: string;
    parsed_data: CandidateProfile;
    updated_at: string;
}

export async function uploadResume(
    file: File,
    onProgress: (progress: number | null) => void
): Promise<UploadedResume> {
    const formData = new FormData();
    formData.append("resume", file);

    const response = await api.post<UploadedResume>("/resumes/upload", formData, {
        onUploadProgress: (event) => {
            onProgress(event.total ? Math.round((event.loaded / event.total) * 100) : null);
        }
    });
    return response.data;
}

export async function parseUploadedResume(id: string): Promise<ParsedResume> {
    const response = await api.post<{ resume: ParsedResume }>(`/resumes/${encodeURIComponent(id)}/parse`);
    return response.data.resume;
}