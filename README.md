# Language Translator Pro — Cloudflare Pages & GitHub Deployment

A professional multi-language translation workspace powered by **Gemini AI**, featuring real-time translation across multiple languages (Urdu, English, Punjabi, Arabic, Hindi, French, Spanish), voice speech-to-text input, image OCR/analysis translation, text-to-speech, clipboard tools, dark mode, and a polished responsive UI.

---

## Features

1. **Gemini AI Translation API**: Secure server-side translation endpoints (`/api/translate` and `/api/analyze-image`) using `GEMINI_API_KEY`.
2. **Speech Recognition**: Voice input supporting Urdu (`ur-PK`), English (`en-US`), Punjabi (`pa-PK`), Arabic (`ar-SA`), Hindi (`hi-IN`), French (`fr-FR`), and Spanish (`es-ES`).
3. **Image OCR & Analysis**: Upload or capture images to extract text and translate them instantly.
4. **Cloudflare Pages Functions**: Serverless functions (`functions/api/translate.js` and `functions/api/analyze-image.js`) for serverless backend execution on Cloudflare Pages.
5. **SEO & Indexing**: Optimized meta tags, OpenGraph cards, `robots.txt`, and `sitemap.xml`.

---

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```
2. Configure environment variables in `.env`:
   ```env
   GEMINI_API_KEY="your_gemini_api_key_here"
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

---

## Cloudflare Pages Deployment & GitHub Integration

### 1. Repository Setup
Push this repository to your GitHub account.

### 2. Connect to Cloudflare Pages
1. Log in to the [Cloudflare Dashboard](https://dash.cloudflare.com/).
2. Navigate to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
3. Select your GitHub repository.

### 3. Build Configuration
Configure the build settings in Cloudflare Pages:
- **Framework preset**: Vite
- **Build command**: `npm run build`
- **Build output directory**: `dist`

### 4. Environment Variables
In your Cloudflare Pages project settings, go to **Settings** -> **Environment Variables** (for production and preview environments) and add:
- **Variable Name**: `GEMINI_API_KEY`
- **Value**: Your valid Google Gemini API Key

### 5. Automatic Deployments
Every push to your main branch will automatically trigger a new build and deployment on Cloudflare Pages.
