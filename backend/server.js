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
        resume.slice(0, 200),
        jobDescription.slice(0, 200),
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

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});