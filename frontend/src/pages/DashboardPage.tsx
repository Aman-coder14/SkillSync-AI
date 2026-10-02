import { useRef, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getAuthErrorMessage } from "../services/auth";
import { parseUploadedResume, uploadResume, type CandidateProfile, type UploadedResume } from "../services/resumes";

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
            setMessage({ type: "success", text: "Resume parsed successfully." });
        } catch (error) {
            setMessage({ type: "error", text: getAuthErrorMessage(error, "Resume parsing failed. Please try again.") });
        } finally {
            setIsParsing(false);
        }
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
            </section>
        </main>
    );
}