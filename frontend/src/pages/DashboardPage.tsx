import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage } from "../services/auth";
import { analyzeJob, listJobs, matchJob, type JobMatch, type SavedJob } from "../services/jobs";
import { listResumes, parseUploadedResume, uploadResume, type CandidateProfile, type ResumeOption, type UploadedResume } from "../services/resumes";

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function DashboardPage() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const fileInput = useRef<HTMLInputElement>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState<number | null>(null);
    const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
    const [uploadedResume, setUploadedResume] = useState<UploadedResume | null>(null);
    const [parsedProfile, setParsedProfile] = useState<CandidateProfile | null>(null);
    const [isParsing, setIsParsing] = useState(false);
    const [resumes, setResumes] = useState<ResumeOption[]>([]);
    const [jobs, setJobs] = useState<SavedJob[]>([]);
    const [activeJob, setActiveJob] = useState<SavedJob | null>(null);
    const [jobTitle, setJobTitle] = useState("");
    const [company, setCompany] = useState("");
    const [jobDescription, setJobDescription] = useState("");
    const [selectedResumeId, setSelectedResumeId] = useState("");
    const [isAnalyzingJob, setIsAnalyzingJob] = useState(false);
    const [isMatching, setIsMatching] = useState(false);
    const [jobNotice, setJobNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

    useEffect(() => {
        let isMounted = true;
        Promise.all([listResumes(), listJobs()]).then(([resumeItems, jobItems]) => {
            if (!isMounted) return;
            setResumes(resumeItems);
            setSelectedResumeId(resumeItems.find((resume) => resume.is_parsed)?.id ?? "");
            setJobs(jobItems);
            if (jobItems[0]) {
                setActiveJob(jobItems[0]);
                setJobTitle(jobItems[0].title);
                setCompany(jobItems[0].company ?? "");
                setJobDescription(jobItems[0].description);
            }
        }).catch((error: unknown) => {
            if (isMounted) setJobNotice({ type: "error", text: getAuthErrorMessage(error, "Saved jobs and resumes could not be loaded.") });
        });
        return () => { isMounted = false; };
    }, []);

    function handleLogout() {
        logout();
        navigate("/login", { replace: true });
    }

    async function handleUpload(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!selectedFile) {
            setMessage({ type: "error", text: "Choose a PDF or DOCX file to upload." });
            return;
        }
        if (selectedFile.size > MAX_FILE_SIZE) {
            setMessage({ type: "error", text: "File must be 10 MB or smaller." });
            return;
        }

        setIsUploading(true);
        setUploadProgress(0);
        setMessage(null);
        try {
            const resume = await uploadResume(selectedFile, setUploadProgress);
            setUploadedResume(resume);
            setParsedProfile(null);
            setResumes((current) => [{ id: resume.id, file_name: resume.fileName, created_at: resume.createdAt, is_parsed: false }, ...current]);
            setMessage({ type: "success", text: "Resume uploaded and text extracted." });
            setSelectedFile(null);
            if (fileInput.current) fileInput.current.value = "";
        } catch (error) {
            setMessage({ type: "error", text: getAuthErrorMessage(error, "Resume upload failed. Please try again.") });
        } finally {
            setIsUploading(false);
            setUploadProgress(null);
        }
    }

    async function handleParseResume() {
        if (!uploadedResume) return;
        setIsParsing(true);
        setMessage(null);
        try {
            const resume = await parseUploadedResume(uploadedResume.id);
            setParsedProfile(resume.parsed_data);
            setResumes((current) => current.map((item) => item.id === resume.id ? { ...item, is_parsed: true } : item));
            setSelectedResumeId(resume.id);
            setMessage({ type: "success", text: "Resume parsed successfully." });
        } catch (error) {
            setMessage({ type: "error", text: getAuthErrorMessage(error, "Resume parsing failed. Please try again.") });
        } finally {
            setIsParsing(false);
        }
    }

    async function handleAnalyzeJob(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (!jobTitle.trim() || !jobDescription.trim()) {
            setJobNotice({ type: "error", text: "Job title and job description are required." });
            return;
        }
        setIsAnalyzingJob(true);
        setActiveJob(null);
        setJobNotice(null);
        try {
            const result = await analyzeJob({ title: jobTitle.trim(), company: company.trim(), description: jobDescription.trim() });
            setActiveJob(result.job);
            setJobs((current) => [result.job, ...current.filter((job) => job.id !== result.job.id)]);
            setJobNotice({ type: "success", text: "Job analyzed and saved." });
        } catch (error) {
            setJobNotice({ type: "error", text: getAuthErrorMessage(error, "Job analysis failed. Please try again.") });
        } finally {
            setIsAnalyzingJob(false);
        }
    }

    async function handleMatchResume() {
        if (!activeJob || !selectedResumeId) return;
        setIsMatching(true);
        setJobNotice(null);
        try {
            const result: JobMatch = await matchJob(activeJob.id, selectedResumeId);
            const updatedJob = { ...activeJob, match_data: result, match_resume_id: selectedResumeId };
            setActiveJob(updatedJob);
            setJobs((current) => current.map((job) => job.id === updatedJob.id ? updatedJob : job));
            setJobNotice({ type: "success", text: "Compatibility analysis complete." });
        } catch (error) {
            setJobNotice({ type: "error", text: getAuthErrorMessage(error, "Resume matching failed. Please try again.") });
        } finally {
            setIsMatching(false);
        }
    }

    function handleSelectJob(jobId: string) {
        const selectedJob = jobs.find((job) => job.id === jobId);
        if (!selectedJob) return;
        setActiveJob(selectedJob);
        setJobTitle(selectedJob.title);
        setCompany(selectedJob.company ?? "");
        setJobDescription(selectedJob.description);
        if (selectedJob.match_resume_id && resumes.some((resume) => resume.id === selectedJob.match_resume_id && resume.is_parsed)) {
            setSelectedResumeId(selectedJob.match_resume_id);
        }
        setJobNotice(null);
    }

    return (
        <main className="dashboard-page">
            <header className="dashboard-header">
                <Link className="brand" to="/dashboard">SkillSync AI</Link>
                <button className="sign-out" onClick={handleLogout} type="button">
                    Sign out
                </button>
            </header>
            <section className="dashboard-content">
                <p className="eyebrow">Dashboard</p>
                <h1>Welcome, {user?.name}</h1>
                <p className="dashboard-email">Signed in as {user?.email}</p>
                <section className="resume-section" aria-labelledby="resume-heading">
                    <div className="resume-section__heading">
                        <div>
                            <p className="eyebrow">Your documents</p>
                            <h2 id="resume-heading">Resume</h2>
                        </div>
                        <p>PDF or DOCX · up to 10 MB</p>
                    </div>
                    <form className="resume-upload" onSubmit={handleUpload}>
                        <label className="resume-upload__label" htmlFor="resume-file">Choose a resume</label>
                        <input
                            ref={fileInput}
                            id="resume-file"
                            name="resume"
                            type="file"
                            accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                            disabled={isUploading || isParsing}
                            onChange={(event) => {
                                setSelectedFile(event.target.files?.[0] ?? null);
                                setMessage(null);
                            }}
                        />
                        {selectedFile && <p className="resume-upload__filename">Selected: {selectedFile.name}</p>}
                        <button className="auth-submit resume-upload__button" type="submit" disabled={isUploading || isParsing || !selectedFile}>
                            {isUploading ? "Uploading…" : "Upload resume"}
                        </button>
                        {isUploading && (
                            <div className="resume-upload__progress" role="status" aria-live="polite">
                                <progress value={uploadProgress ?? undefined} max="100" />
                                <span>{uploadProgress === null ? "Uploading…" : `${uploadProgress}%`}</span>
                            </div>
                        )}
                    </form>
                    {message && (
                        <p className={`form-message form-message--${message.type}`} role="status">
                            {message.text}
                        </p>
                    )}
                    {uploadedResume && (
                        <>
                            <dl className="resume-details">
                                <div><dt>File</dt><dd>{uploadedResume.fileName}</dd></div>
                                <div><dt>Text extraction</dt><dd>{uploadedResume.extractedTextStatus}</dd></div>
                                <div><dt>Uploaded</dt><dd>{new Date(uploadedResume.createdAt).toLocaleString()}</dd></div>
                                <div><dt>Resume ID</dt><dd>{uploadedResume.id}</dd></div>
                            </dl>
                            <button className="auth-submit resume-parse__button" type="button" onClick={handleParseResume} disabled={isParsing || isUploading}>
                                {isParsing ? "Parsing resume…" : "Parse Resume with AI"}
                            </button>
                        </>
                    )}
                    {isParsing && <p className="resume-parse__status" role="status">Extracting structured profile…</p>}
                    {parsedProfile && (
                        <section className="resume-profile" aria-labelledby="parsed-profile-heading">
                            <h3 id="parsed-profile-heading">Parsed profile</h3>
                            {parsedProfile.summary && <p className="resume-profile__summary">{parsedProfile.summary}</p>}
                            <div className="resume-profile__grid">
                                <section className="resume-profile__section">
                                    <h4>Skills</h4>
                                    {parsedProfile.skills.length ? <ul>{parsedProfile.skills.map((skill, index) => <li key={`${skill.name}-${index}`}>{skill.name}{skill.category ? ` · ${skill.category}` : ""}{skill.proficiency ? ` · ${skill.proficiency}` : ""}</li>)}</ul> : <p>None listed</p>}
                                </section>
                                <section className="resume-profile__section">
                                    <h4>Education</h4>
                                    {parsedProfile.education.length ? <ul>{parsedProfile.education.map((item, index) => <li key={`${item.institution}-${index}`}><strong>{item.institution}</strong>{[item.degree, item.field, [item.startDate, item.endDate].filter(Boolean).join(" – ")].filter(Boolean).length > 0 && <span>{[item.degree, item.field, [item.startDate, item.endDate].filter(Boolean).join(" – ")].filter(Boolean).join(" · ")}</span>}</li>)}</ul> : <p>None listed</p>}
                                </section>
                                <section className="resume-profile__section">
                                    <h4>Experience</h4>
                                    {parsedProfile.experience.length ? <ul>{parsedProfile.experience.map((item, index) => <li key={`${item.company}-${item.role}-${index}`}><strong>{item.role} · {item.company}</strong>{[item.startDate, item.endDate].filter(Boolean).length > 0 && <span>{[item.startDate, item.endDate].filter(Boolean).join(" – ")}</span>}{item.description.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}{item.technologies.length > 0 && <span>Technologies: {item.technologies.join(", ")}</span>}</li>)}</ul> : <p>None listed</p>}
                                </section>
                                <section className="resume-profile__section">
                                    <h4>Projects</h4>
                                    {parsedProfile.projects.length ? <ul>{parsedProfile.projects.map((item, index) => <li key={`${item.name}-${index}`}><strong>{item.name}</strong><span>{item.description}</span>{item.technologies.length > 0 && <span>Technologies: {item.technologies.join(", ")}</span>}{item.responsibilities.map((line, lineIndex) => <span key={lineIndex}>{line}</span>)}</li>)}</ul> : <p>None listed</p>}
                                </section>
                                <section className="resume-profile__section">
                                    <h4>Certifications</h4>
                                    {parsedProfile.certifications.length ? <ul>{parsedProfile.certifications.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None listed</p>}
                                </section>
                                <section className="resume-profile__section">
                                    <h4>Achievements</h4>
                                    {parsedProfile.achievements.length ? <ul>{parsedProfile.achievements.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None listed</p>}
                                </section>
                            </div>
                        </section>
                    )}
                </section>
                <section className="job-section" aria-labelledby="job-heading">
                    <div className="resume-section__heading">
                        <div>
                            <p className="eyebrow">Candidate fit</p>
                            <h2 id="job-heading">Job Description</h2>
                        </div>
                    </div>
                    {jobs.length > 0 && (
                        <div className="job-history">
                            <label htmlFor="saved-job">Saved jobs</label>
                            <select id="saved-job" value={activeJob?.id ?? ""} onChange={(event) => handleSelectJob(event.target.value)}>
                                <option value="">New job description</option>
                                {jobs.map((job) => <option key={job.id} value={job.id}>{job.title}{job.company ? ` · ${job.company}` : ""}</option>)}
                            </select>
                        </div>
                    )}
                    <form className="job-form" onSubmit={handleAnalyzeJob}>
                        <div className="form-field">
                            <label htmlFor="job-title">Job Title</label>
                            <input id="job-title" value={jobTitle} onChange={(event) => setJobTitle(event.target.value)} maxLength={200} required disabled={isAnalyzingJob} />
                        </div>
                        <div className="form-field">
                            <label htmlFor="job-company">Company <span>(optional)</span></label>
                            <input id="job-company" value={company} onChange={(event) => setCompany(event.target.value)} maxLength={200} disabled={isAnalyzingJob} />
                        </div>
                        <div className="form-field job-form__description">
                            <label htmlFor="job-description">Full Job Description</label>
                            <textarea id="job-description" value={jobDescription} onChange={(event) => setJobDescription(event.target.value)} maxLength={20_000} rows={9} required disabled={isAnalyzingJob} />
                            <span className="field-hint">{jobDescription.length.toLocaleString()} / 20,000 characters</span>
                        </div>
                        <button className="auth-submit job-form__button" type="submit" disabled={isAnalyzingJob || !jobTitle.trim() || !jobDescription.trim()}>
                            {isAnalyzingJob ? "Analyzing job…" : "Analyze Job"}
                        </button>
                    </form>
                    {jobNotice && <p className={`form-message form-message--${jobNotice.type}`} role="status">{jobNotice.text}</p>}
                    {activeJob && (
                        <section className="job-analysis" aria-labelledby="job-analysis-heading">
                            <div className="job-analysis__title">
                                <div>
                                    <p className="eyebrow">Structured job profile</p>
                                    <h3 id="job-analysis-heading">{activeJob.parsed_data.title}</h3>
                                </div>
                                {activeJob.parsed_data.company && <p>{activeJob.parsed_data.company}</p>}
                            </div>
                            {activeJob.parsed_data.summary && <p className="job-analysis__summary">{activeJob.parsed_data.summary}</p>}
                            <div className="job-analysis__grid">
                                <section className="resume-profile__section">
                                    <h4>Required skills</h4>
                                    {activeJob.parsed_data.requiredSkills.length ? <ul>{activeJob.parsed_data.requiredSkills.map((skill, index) => <li key={`${skill.name}-${index}`}>{skill.name}{skill.category ? ` · ${skill.category}` : ""}</li>)}</ul> : <p>None listed</p>}
                                </section>
                                <section className="resume-profile__section">
                                    <h4>Preferred skills</h4>
                                    {activeJob.parsed_data.preferredSkills.length ? <ul>{activeJob.parsed_data.preferredSkills.map((skill, index) => <li key={`${skill.name}-${index}`}>{skill.name}{skill.category ? ` · ${skill.category}` : ""}</li>)}</ul> : <p>None listed</p>}
                                </section>
                                <section className="resume-profile__section">
                                    <h4>Responsibilities</h4>
                                    {activeJob.parsed_data.responsibilities.length ? <ul>{activeJob.parsed_data.responsibilities.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None listed</p>}
                                </section>
                                <section className="resume-profile__section">
                                    <h4>Technologies</h4>
                                    {activeJob.parsed_data.technologies.length ? <ul>{activeJob.parsed_data.technologies.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None listed</p>}
                                </section>
                            </div>
                            <div className="job-match-controls">
                                <div className="form-field">
                                    <label htmlFor="match-resume">Parsed resume</label>
                                    <select id="match-resume" value={selectedResumeId} onChange={(event) => setSelectedResumeId(event.target.value)} disabled={!resumes.some((resume) => resume.is_parsed) || isMatching}>
                                        <option value="">Choose a parsed resume</option>
                                        {resumes.filter((resume) => resume.is_parsed).map((resume) => <option key={resume.id} value={resume.id}>{resume.file_name}</option>)}
                                    </select>
                                </div>
                                <button className="auth-submit" type="button" onClick={handleMatchResume} disabled={!selectedResumeId || isMatching}>
                                    {isMatching ? "Matching resume…" : "Match Resume"}
                                </button>
                            </div>
                            {!resumes.some((resume) => resume.is_parsed) && <p className="field-hint">Upload and parse a resume before matching.</p>}
                            {activeJob.match_data && activeJob.match_resume_id === selectedResumeId && (
                                <section className="job-match" aria-labelledby="match-result-heading">
                                    <div className="job-match__score">
                                        <h4 id="match-result-heading">Compatibility analysis</h4>
                                        <strong>{activeJob.match_data.overallScore}%</strong>
                                    </div>
                                    <div className="job-analysis__grid">
                                        <section className="resume-profile__section">
                                            <h4>Matched skills</h4>
                                            {activeJob.match_data.matchedSkills.length ? <ul>{activeJob.match_data.matchedSkills.map((item, index) => <li key={`${item.jobSkill}-${index}`}>{item.candidateSkill} → {item.jobSkill}<span>{item.matchType} match · {item.source}</span></li>)}</ul> : <p>None found</p>}
                                        </section>
                                        <section className="resume-profile__section">
                                            <h4>Missing required skills</h4>
                                            {activeJob.match_data.missingRequiredSkills.length ? <ul>{activeJob.match_data.missingRequiredSkills.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None</p>}
                                        </section>
                                        <section className="resume-profile__section">
                                            <h4>Missing preferred skills</h4>
                                            {activeJob.match_data.missingPreferredSkills.length ? <ul>{activeJob.match_data.missingPreferredSkills.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None</p>}
                                        </section>
                                        <section className="resume-profile__section">
                                            <h4>Relevant projects</h4>
                                            {activeJob.match_data.relevantProjects.length ? <ul>{activeJob.match_data.relevantProjects.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None found</p>}
                                        </section>
                                        <section className="resume-profile__section">
                                            <h4>Relevant experience</h4>
                                            {activeJob.match_data.relevantExperience.length ? <ul>{activeJob.match_data.relevantExperience.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None found</p>}
                                        </section>
                                        <section className="resume-profile__section">
                                            <h4>Strengths</h4>
                                            {activeJob.match_data.strengths.length ? <ul>{activeJob.match_data.strengths.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None found</p>}
                                        </section>
                                        <section className="resume-profile__section">
                                            <h4>Gaps</h4>
                                            {activeJob.match_data.gaps.length ? <ul>{activeJob.match_data.gaps.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}</ul> : <p>None found</p>}
                                        </section>
                                    </div>
                                </section>
                            )}
                        </section>
                    )}
                </section>
            </section>
        </main>
    );
}