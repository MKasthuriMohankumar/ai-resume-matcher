import { useState, useRef, useEffect } from 'react';
import './App.css';

function App() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const fileInputRef = useRef(null);

  const processFile = async (file) => {
    if (!file || file.type !== 'application/pdf') {
      setError('Please upload a PDF file');
      return;
    }

    const formData = new FormData();
    formData.append('resume', file);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/extract-text`, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to extract text');
      }

      setResume(data.text);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileUpload = (e) => {
    processFile(e.target.files[0]);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    processFile(e.dataTransfer.files[0]);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleSubmit = async () => {
    setError('');
    setResult(null);

    if (!resume.trim() || !jobDescription.trim()) {
      setError('Please fill in both fields');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resume, jobDescription }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Something went wrong');
      }

      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/history`);
      const data = await response.json();
      setHistory(data);
      setShowHistory(true);
    } catch (err) {
      setError('Failed to load history');
    }
  };

  const deleteMatch = async (id, e) => {
    e.stopPropagation();

    const confirmed = window.confirm('Delete this match from your history?');
    if (!confirmed) return;

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/history/${id}`, {
        method: 'DELETE',
      });
      setHistory(history.filter((item) => item.id !== id));
    } catch (err) {
      setError('Failed to delete match');
    }
  };

  const saveResume = async () => {
    if (!resume.trim()) {
      setError('Nothing to save — paste or upload a resume first');
      return;
    }

    try {
      await fetch(`${import.meta.env.VITE_API_URL}/save-resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resumeText: resume }),
      });
      setError('');
      alert('Resume saved! It will load automatically next time.');
    } catch (err) {
      setError('Failed to save resume');
    }
  };

  const loadSavedResume = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/saved-resume`);
      const data = await response.json();

      if (data.resumeText) {
        setResume(data.resumeText);
      } else {
        setError('No saved resume found');
      }
    } catch (err) {
      setError('Failed to load saved resume');
    }
  };

  useEffect(() => {
    loadSavedResume();
  }, []);

  const getScoreColor = (score) => {
    if (score >= 75) return '#4ade80';
    if (score >= 50) return '#fbbf24';
    return '#f87171';
  };

  const ScoreRing = ({ score }) => {
    const radius = 54;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (score / 100) * circumference;
    const color = getScoreColor(score);

    return (
      <div className="score-ring-wrapper">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} className="ring-bg" />
          <circle
            cx="70"
            cy="70"
            r={radius}
            stroke={color}
            strokeWidth="10"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform="rotate(-90 70 70)"
            className="ring-progress"
          />
        </svg>
        <div className="ring-text">
          <span className="ring-number" style={{ color }}>{score}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="app-container">
      <nav className="navbar">
        <div className="brand">
          <div className="brand-icon">AI</div>
          <span>Resume Matcher</span>
        </div>
        <a href="https://github.com/MKasthuriMohankumar/ai-resume-matcher" target="_blank" rel="noreferrer" className="github-link">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>
      </nav>

      <div className="header">
        <h1>Know your match before you apply</h1>
        <p>Paste your resume and a job description to see how well they align</p>
      </div>

      <div className="card">
        <div className="two-column">
          <div className="field">
            <label>
              <span className="step-badge">1</span>
              Your Resume
            </label>
            <div
              className={`dropzone ${isDragging ? 'dragging' : ''}`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => fileInputRef.current.click()}
            >
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="hidden-input"
              />
              <svg className="upload-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M12 16V4M12 4L7 9M12 4l5 5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Drag & drop a PDF, or click to browse</span>
            </div>
            <textarea
              value={resume}
              onChange={(e) => setResume(e.target.value)}
              rows={8}
              placeholder="...or paste your resume text here"
            />
            <div className="resume-actions">
              <button type="button" className="text-btn" onClick={saveResume}>
                💾 Save this resume
              </button>
              <button type="button" className="text-btn" onClick={loadSavedResume}>
                📂 Load saved resume
              </button>
            </div>
          </div>

          <div className="field">
            <label>
              <span className="step-badge">2</span>
              Job Description
            </label>
            <div className="dropzone-spacer">
              <svg className="spacer-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M9 12h6M9 16h6M9 8h6M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              <span>Paste the full JD text below</span>
            </div>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              rows={8}
              placeholder="Paste the job description here..."
            />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? <span className="spinner"></span> : 'Check Match'}
        </button>

        {error && <p className="error-text">{error}</p>}
      </div>

      <button className="history-toggle" onClick={showHistory ? () => setShowHistory(false) : fetchHistory}>
        {showHistory ? 'Hide Recent Matches' : 'View Recent Matches'}
      </button>

      {showHistory && (
        <div className="card history-card">
          <h3>Recent Matches</h3>
          {history.length === 0 ? (
            <p className="empty-history">No matches yet — run your first one above!</p>
          ) : (
            <div className="history-list">
              {history.map((item) => (
                <div key={item.id} className="history-item-wrapper">
                  <div
                    className="history-item"
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  >
                    <div className="history-score" style={{ color: getScoreColor(item.match_score) }}>
                      {item.match_score}%
                    </div>
                    <div className="history-details">
                      <p className="history-jd">{item.jd_snippet.slice(0, 80)}...</p>
                      <p className="history-date">
                        {new Date(item.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <svg
                      className={`chevron ${expandedId === item.id ? 'expanded' : ''}`}
                      width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    >
                      <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <button className="delete-btn" onClick={(e) => deleteMatch(item.id, e)}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                        <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </button>
                  </div>

                  {expandedId === item.id && (
                    <div className="history-expanded">
                      <div className="expanded-section">
                        <h4>Resume</h4>
                        <p className="expanded-text">{item.resume_snippet}</p>
                      </div>
                      <div className="expanded-section">
                        <h4>Job Description</h4>
                        <p className="expanded-text">{item.jd_snippet}</p>
                      </div>
                      <div className="expanded-section">
                        <h4>Missing Keywords</h4>
                        <div className="keyword-pills">
                          {item.missing_keywords.map((kw, i) => (
                            <span key={i} className="pill">{kw}</span>
                          ))}
                        </div>
                      </div>
                      <div className="expanded-section">
                        <h4>Suggestions</h4>
                        <ul className="suggestion-list">
                          {item.suggestions.map((s, i) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {loading && (
        <div className="card result-card">
          <div className="skeleton skeleton-ring"></div>
          <div className="skeleton skeleton-line" style={{ width: '40%' }}></div>
          <div className="skeleton skeleton-pill"></div>
          <div className="skeleton skeleton-line" style={{ width: '90%' }}></div>
          <div className="skeleton skeleton-line" style={{ width: '75%' }}></div>
        </div>
      )}

      {!result && !loading && (
        <div className="card empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4">
            <circle cx="11" cy="11" r="7" strokeLinecap="round"/>
            <path d="M21 21l-4.3-4.3" strokeLinecap="round"/>
          </svg>
          <p>Your match results will appear here</p>
        </div>
      )}

      {result && !loading && (
        <div className="card result-card">
          <div className="score-badge">
            <ScoreRing score={result.matchScore} />
          </div>

          <div className="result-section">
            <h3>Missing Keywords</h3>
            <div className="keyword-pills">
              {result.missingKeywords.map((kw, i) => (
                <span key={i} className="pill">{kw}</span>
              ))}
            </div>
          </div>

          <div className="result-section">
            <h3>Suggestions</h3>
            <ul className="suggestion-list">
              {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}

      <footer className="footer">
        <span>Built with</span>
        <div className="tech-pills">
          <span className="tech-pill">React</span>
          <span className="tech-pill">Node.js</span>
          <span className="tech-pill">Gemini API</span>
        </div>
        <p className="license-line">
          © 2026 Kasthuri M · MIT Licensed ·{' '}
          <a href="https://github.com/MKasthuriMohankumar/ai-resume-matcher" target="_blank" rel="noreferrer">
            View source
          </a>
        </p>
      </footer>
    </div>
  );
}

export default App;