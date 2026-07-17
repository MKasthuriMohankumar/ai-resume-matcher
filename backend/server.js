const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');
const { PDFParse } = require('pdf-parse');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 5000;

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const upload = multer({ storage: multer.memoryStorage() });

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'Backend is running!' });
});

app.post('/extract-text', upload.single('resume'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const parser = new PDFParse({ data: req.file.buffer });
    const result = await parser.getText();
    await parser.destroy();

    res.json({ text: result.text });
  } catch (error) {
    console.error('PDF extraction error:', error);
    res.status(500).json({ error: 'Failed to extract text from PDF' });
  }
});

app.post('/match', async (req, res) => {
  try {
    const { resume, jobDescription } = req.body;

    if (!resume || !jobDescription) {
      return res.status(400).json({ error: 'Resume and job description are both required' });
    }

    const prompt = `You are a resume-matching assistant. Compare this resume to this job description.

Resume:
${resume}

Job Description:
${jobDescription}

Respond ONLY in this exact JSON format, nothing else, no markdown code fences:
{
  "matchScore": <number 0-100>,
  "missingKeywords": [<3-5 important keywords from the JD missing in the resume>],
  "suggestions": [<3 tailored bullet point suggestions to improve the match>]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    const responseText = response.text;
    const cleaned = responseText.replace(/```json|```/g, '').trim();
    const result = JSON.parse(cleaned);
    const insertResult = await pool.query(
      `INSERT INTO matches (resume_snippet, jd_snippet, match_score, missing_keywords, suggestions)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        resume,
        jobDescription,
        result.matchScore,
        result.missingKeywords,
        result.suggestions,
      ]
    );
    console.log('Saved to database, rows affected:', insertResult.rowCount);
    res.json(result);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Something went wrong processing your request' });
  }
});

app.get('/history', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM matches ORDER BY created_at DESC LIMIT 10`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('History fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch match history' });
  }
});

app.post('/save-resume', async (req, res) => {
  try {
    const { resumeText } = req.body;

    if (!resumeText || !resumeText.trim()) {
      return res.status(400).json({ error: 'Resume text is required' });
    }

    await pool.query(`DELETE FROM saved_resume`);

    await pool.query(
      `INSERT INTO saved_resume (resume_text) VALUES ($1)`,
      [resumeText]
    );

    res.json({ message: 'Resume saved successfully' });
  } catch (error) {
    console.error('Save resume error:', error);
    res.status(500).json({ error: 'Failed to save resume' });
  }
});

app.get('/saved-resume', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT resume_text FROM saved_resume ORDER BY updated_at DESC LIMIT 1`
    );

    if (result.rows.length === 0) {
      return res.json({ resumeText: null });
    }

    res.json({ resumeText: result.rows[0].resume_text });
  } catch (error) {
    console.error('Fetch saved resume error:', error);
    res.status(500).json({ error: 'Failed to fetch saved resume' });
  }
});

app.delete('/history/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `DELETE FROM matches WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Match not found' });
    }

    res.json({ message: 'Deleted successfully', id: result.rows[0].id });
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete match' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});