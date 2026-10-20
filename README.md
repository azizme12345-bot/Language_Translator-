# Language Translator Pro — Cloudflare Workers Deployment Guide

A multi-language translation web application powered by **Gemini AI** (`gemini-3.8-flash`), featuring voice input (Web Speech API), image OCR translation, text-to-speech, clipboard tools, light/dark mode memory, and a Cloudflare Workers backend.

Live URL: `https://language-translator.azizme12345.workers.dev`

---

## 1. Cloudflare Workers Architecture

- **Worker Entry File:** `src/worker.ts`
- **Static Assets Directory:** `./dist` (built via `npm run build`)
- **Worker Name:** `language-translator`
- **Secret Name:** `GEMINI_API_KEY` (configured in Cloudflare Workers Settings -> Variables and Secrets)
- **API Endpoints:**
  - `POST /api/translate`: Translates text between languages preserving formatting and structure.
  - `POST /api/analyze-image`: Extracts text or analyzes images and translates into target language.

---

## 2. Cloudflare Dashboard Settings

1. Log in to [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** -> select `language-translator`.
3. Go to **Settings** -> **Variables and Secrets**.
4. Click **Add Variable / Secret**:
   - **Type:** Secret (encrypted)
   - **Variable name:** `GEMINI_API_KEY`
   - **Value:** Your Google Gemini API Key
5. Save and deploy.

---

## 3. Local Development

Run the Vite development server:
```bash
npm run dev
```
In local dev, Vite handles the `/api/translate` and `/api/analyze-image` routes using `GEMINI_API_KEY` from your `.env` file, without needing Express.

---

## 4. Build & Production

```bash
npm run build
```
This generates static assets in `dist/` and copies `public/_worker.js` to `dist/_worker.js`.
