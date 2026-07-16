import { useState } from 'react';
import './App.css';

function App() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const formData = new FormData();
  formData.append('resume', file);

  try {
    const response = await fetch('http://localhost:5000/extract-text', {
      method: 'POST',
      body: formData,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Failed to extract text');
    }

    setResume(data.text);
  } catch (err) {
    setError(err.message);
  }
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
      const response = await fetch('http://localhost:5000/match', {
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

  return (
    <div className="app-container">
      <div className="header">
        <h1>AI Resume Matcher</h1>
        <p>Paste your resume and a job description to see how well they align</p>
      </div>

      <div className="card">
        <div className="field">
          <label>Your Resume</label>
          <textarea
            value={resume}
            onChange={(e) => setResume(e.target.value)}
            rows={8}
            placeholder="Paste your resume text here..."
          />
        </div>

        <div className="field">
          <label>Your Resume</label>
          <input
            type="file"
            accept=".pdf"
            onChange={handleFileUpload}
            className="file-input"
          />
          <p className="upload-hint">Upload a PDF, or paste text below</p>
          <textarea
            value={jobDescription}
            onChange={(e) => setJobDescription(e.target.value)}
            rows={8}
            placeholder="Paste the job description here..."
          />
        </div>

        <button onClick={handleSubmit} disabled={loading}>
          {loading ? 'Analyzing...' : 'Check Match'}
        </button>

        {error && <p className="error-text">{error}</p>}
      </div>

      {result && (
        <div className="card result-card">
          <div className="score-badge">
            <span className="score-number">{result.matchScore}%</span>
            <span className="score-label">Match Score</span>
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
    </div>
  );
}

export default App;