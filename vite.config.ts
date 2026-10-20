import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import dotenv from 'dotenv';
import { defineConfig, type Plugin } from 'vite';

dotenv.config();

export const GEMINI_MODELS = {
  PRIMARY: 'gemini-1.5-flash',
  FALLBACK: 'gemini-2.0-flash',
} as const;

function devApiPlugin(): Plugin {
  return {
    name: 'dev-api-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url?.startsWith('/api/')) return next();

        const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
        if (req.method === 'POST' && (url.pathname === '/api/translate' || url.pathname === '/api/analyze-image')) {
          let bodyStr = '';
          req.on('data', chunk => { bodyStr += chunk; });
          req.on('end', async () => {
            try {
              const body = JSON.parse(bodyStr || '{}');
              const apiKey = body.apiKey || process.env.GEMINI_API_KEY;

              if (!apiKey) {
                res.statusCode = 500;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ error: 'GEMINI_API_KEY is not configured in environment or request.' }));
              }

              if (url.pathname === '/api/translate') {
                const { text, sourceLang, targetLang, model = GEMINI_MODELS.PRIMARY } = body;
                if (!text || !targetLang) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Text and targetLang are required.' }));
                }

                const prompt = `You are an expert professional translator. Translate the following text accurately from "${sourceLang || 'Auto-detect'}" to "${targetLang}".
Preserve paragraph breaks, punctuation, formatting, and original meaning. Do not add introductory conversational filler, pleasantries, or explanations. Output ONLY the direct translated text.

Text to translate:
${text}`;

                const allowedModels = [GEMINI_MODELS.PRIMARY, GEMINI_MODELS.FALLBACK, 'gemini-3.8-flash'];
                const modelName = allowedModels.includes(model) ? model : GEMINI_MODELS.PRIMARY;
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const geminiRes = await fetch(apiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.3 },
                  }),
                });

                const data: any = await geminiRes.json().catch(() => null);
                if (!geminiRes.ok || !data || data.error) {
                  res.statusCode = geminiRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  const errorMsg = geminiRes.status === 404
                    ? 'ماڈل ID درست نہیں ہے یا یہ ماڈل دستیاب نہیں ہے۔ (Model Not Found - 404)'
                    : data?.error?.message || 'Translation failed';
                  return res.end(JSON.stringify({ error: errorMsg }));
                }

                const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ translatedText }));
              }

              if (url.pathname === '/api/analyze-image') {
                const { image, mimeType, targetLang = 'English', model = GEMINI_MODELS.PRIMARY } = body;
                if (!image) {
                  res.statusCode = 400;
                  res.setHeader('Content-Type', 'application/json');
                  return res.end(JSON.stringify({ error: 'Missing image data.' }));
                }

                const prompt = `Analyze this image, extract any readable text present in it, and translate that extracted text into "${targetLang}". If there is no text in the image, provide a concise description of the image content translated into "${targetLang}". Output ONLY the translation or description without conversational commentary.`;

                const allowedModels = [GEMINI_MODELS.PRIMARY, GEMINI_MODELS.FALLBACK, 'gemini-3.8-flash'];
                const modelName = allowedModels.includes(model) ? model : GEMINI_MODELS.PRIMARY;
                const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

                const geminiRes = await fetch(apiUrl, {
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
                              data: image,
                            },
                          },
                        ],
                      },
                    ],
                    generationConfig: { temperature: 0.3 },
                  }),
                });

                const data: any = await geminiRes.json().catch(() => null);
                if (!geminiRes.ok || !data || data.error) {
                  res.statusCode = geminiRes.status;
                  res.setHeader('Content-Type', 'application/json');
                  const errorMsg = geminiRes.status === 404
                    ? 'ماڈل ID درست نہیں ہے یا یہ ماڈل دستیاب نہیں ہے۔ (Model Not Found - 404)'
                    : data?.error?.message || 'Image analysis failed';
                  return res.end(JSON.stringify({ error: errorMsg }));
                }

                const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
                res.statusCode = 200;
                res.setHeader('Content-Type', 'application/json');
                return res.end(JSON.stringify({ translatedText }));
              }
            } catch (err: any) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              return res.end(JSON.stringify({ error: err.message || 'Internal dev server error' }));
            }
          });
          return;
        }
        next();
      });
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), devApiPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
