export interface Skill {
    name: string;
    category: string | null;
    proficiency: string | null;
}

export interface Education {
    institution: string;
    degree: string | null;
    field: string | null;
    startDate: string | null;
    endDate: string | null;
}

export interface Experience {
    company: string;
    role: string;
    startDate: string | null;
    endDate: string | null;
    description: string[];
    technologies: string[];
}

export interface Project {
    name: string;
    description: string;
    technologies: string[];
    responsibilities: string[];
}

export interface ResumeClaim {
    claim: string;
    category: string;
    evidence: string;
}

export interface CandidateProfile {
    summary: string | null;
    skills: Skill[];
    education: Education[];
    experience: Experience[];
    projects: Project[];
    certifications: string[];
    achievements: string[];
    languages: string[];
    resumeClaims: ResumeClaim[];
}