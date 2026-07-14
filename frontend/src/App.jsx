import { useState } from 'react';
import './App.css';

function App() {
  const [resume, setResume] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
    <div style={{ maxWidth: '700px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>AI Resume / JD Matcher</h1>

      <div style={{ marginBottom: '16px' }}>
        <label><strong>Your Resume</strong></label>
        <textarea
          value={resume}
          onChange={(e) => setResume(e.target.value)}
          rows={8}
          style={{ width: '100%', marginTop: '8px', padding: '10px' }}
          placeholder="Paste your resume text here..."
        />
      </div>

      <div style={{ marginBottom: '16px' }}>
        <label><strong>Job Description</strong></label>
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          rows={8}
          style={{ width: '100%', marginTop: '8px', padding: '10px' }}
          placeholder="Paste the job description here..."
        />
      </div>

      <button onClick={handleSubmit} disabled={loading} style={{ padding: '10px 20px', cursor: 'pointer' }}>
        {loading ? 'Analyzing...' : 'Check Match'}
      </button>

      {error && <p style={{ color: 'red', marginTop: '16px' }}>{error}</p>}

      {result && (
        <div style={{ marginTop: '24px', padding: '16px', border: '1px solid #ccc', borderRadius: '8px' }}>
          <h2>Match Score: {result.matchScore}%</h2>

          <h3>Missing Keywords</h3>
          <ul>
            {result.missingKeywords.map((kw, i) => <li key={i}>{kw}</li>)}
          </ul>

          <h3>Suggestions</h3>
          <ul>
            {result.suggestions.map((s, i) => <li key={i}>{s}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;