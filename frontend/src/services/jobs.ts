import api from "./api";

export interface JobSkill {
    name: string;
    category: string | null;
    importance: "required" | "preferred";
}

export interface JobProfile {
    title: string;
    company: string | null;
    summary: string | null;
    requiredSkills: JobSkill[];
    preferredSkills: JobSkill[];
    responsibilities: string[];
    qualifications: string[];
    experienceRequirements: string[];
    educationRequirements: string[];
    technologies: string[];
}

export interface SkillMatch {
    candidateSkill: string;
    jobSkill: string;
    matchType: "exact" | "related";
    source: "skill" | "experience" | "project";
}

export interface JobMatch {
    overallScore: number;
    matchedSkills: SkillMatch[];
    missingRequiredSkills: string[];
    missingPreferredSkills: string[];
    relevantProjects: string[];
    relevantExperience: string[];
    strengths: string[];
    gaps: string[];
}

export interface SavedJob {
    id: string;
    title: string;
    company: string | null;
    description: string;
    parsed_data: JobProfile;
    match_data: JobMatch | null;
    match_resume_id: string | null;
    created_at: string;
}

export async function analyzeJob(input: { title: string; company: string; description: string }): Promise<{ job: SavedJob; jobProfile: JobProfile }> {
    const response = await api.post<{ job: SavedJob; jobProfile: JobProfile }>("/jobs/analyze", input);
    return response.data;
}

export async function listJobs(): Promise<SavedJob[]> {
    const response = await api.get<{ jobs: SavedJob[] }>("/jobs");
    return response.data.jobs;
}

export async function matchJob(jobId: string, resumeId: string): Promise<JobMatch> {
    const response = await api.post<{ jobMatch: JobMatch }>(`/jobs/${encodeURIComponent(jobId)}/match/${encodeURIComponent(resumeId)}`);
    return response.data.jobMatch;
}