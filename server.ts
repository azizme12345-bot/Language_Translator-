import express from 'express';
import dotenv from 'dotenv';
import { createServer as createViteServer } from 'vite';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // API Endpoint: Translate Text
  app.post('/api/translate', async (req, res) => {
    try {
      const { text, sourceLang, targetLang, model = 'gemini-3.8-flash' } = req.body;

      if (!text || !targetLang) {
        return res.status(400).json({ error: 'Missing text or targetLang' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server. Please set it in your .env file or AI Studio secrets.' });
      }

      const prompt = `You are an expert professional translator. Translate the following text accurately from "${sourceLang || 'Auto-detect'}" to "${targetLang}". 
Preserve paragraph breaks, punctuation, formatting, and original meaning. Do not add introductory conversational filler or notes, output ONLY the direct translation.

Text to translate:
${text}`;

      const modelName = model.includes('pro') ? 'gemini-1.5-pro' : 'gemini-3.8-flash';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { temperature: 0.3 }
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `Gemini API error status ${response.status}`);
      }

      const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.json({ translatedText });
    } catch (err: any) {
      console.error('Translation error:', err);
      return res.status(500).json({ error: err.message || 'Translation failed' });
    }
  });

  // API Endpoint: Analyze Image / OCR & Translate
  app.post('/api/analyze-image', async (req, res) => {
    try {
      const { image, mimeType, targetLang = 'English', model = 'gemini-3.8-flash' } = req.body;

      if (!image) {
        return res.status(400).json({ error: 'Missing image data' });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY is not configured on the server.' });
      }

      const prompt = `Analyze this image, extract any readable text present in it, and translate that extracted text into "${targetLang}". If there is no text, provide a concise description of the image content translated into "${targetLang}". Output ONLY the translation or description without conversational commentary.`;

      const modelName = model.includes('pro') ? 'gemini-1.5-pro' : 'gemini-3.8-flash';
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: mimeType || 'image/jpeg',
                    data: image
                  }
                }
              ]
            }
          ],
          generationConfig: { temperature: 0.3 }
        })
      });

      const data = await response.json();
      if (!response.ok || data.error) {
        throw new Error(data.error?.message || `Gemini API image analysis error status ${response.status}`);
      }

      const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      return res.json({ translatedText });
    } catch (err: any) {
      console.error('Image analysis error:', err);
      return res.status(500).json({ error: err.message || 'Image analysis failed' });
    }
  });

  // Create Vite server in middleware mode
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'spa',
  });

  app.use(vite.middlewares);

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
