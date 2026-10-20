# Language Translator Pro — Cloudflare Pages & GitHub Deployment Guide

Language Translator application built with **Google AI Studio**, powered by **Gemini 3.8 Flash**, and ready for **Cloudflare Pages / Workers**.

---

## 1. Cloudflare "Static-Only Worker" Problem Explained & Fixed

### Why did you see this error?
> *"Variables cannot be added to a Worker that only has static assets."*

When you deploy a Vite build directly to Cloudflare Workers without a backend script, Cloudflare flags it as an **"Asset-only Worker"**. In an asset-only Worker, Cloudflare hides/disables the Variables & Secrets panel because it assumes there is no backend JavaScript code to read the variables.

### How it is fixed:
1. **Added `public/_worker.js`**: When you run `npm run build`, Vite places `_worker.js` directly into `dist/`. Cloudflare detects this active Worker script and turns the project into a full-featured Worker/Pages application with dynamic backend execution. The Variables & Secrets tab becomes immediately active!
2. **Dual-Architecture Support**: We provide both `public/_worker.js` (for Pages Advanced Mode & Workers with static assets) AND `functions/api/` (for standard Cloudflare Pages Functions).
3. **`wrangler.toml`**: Configured to link `./dist` assets and bind the worker execution.

---

## 2. GitHub & Cloudflare Deployment Steps (Mobile / Desktop)

### Option A: Cloudflare Pages (Recommended for Beginners)
1. In Cloudflare Dashboard, go to **Workers & Pages** -> **Create application** -> **Pages** -> **Connect to Git**.
2. Select your GitHub repository.
3. Build Settings:
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Build Output Directory**: `dist`
4. Go to **Settings** -> **Variables and Secrets** -> Click **Add** under Environment Variables:
   - Variable name: `GEMINI_API_KEY`
   - Value: *(Your Gemini API key)*
   - Type: **Secret (Encrypted)**
5. Click **Save and Deploy**.

### Option B: Cloudflare Workers with Static Assets
1. Push the code to GitHub.
2. In your Cloudflare Worker project settings -> **Settings** -> **Variables and Secrets**.
3. Now that `dist/_worker.js` exists, click **Add Variable / Secret**:
   - Name: `GEMINI_API_KEY`
   - Value: *(Your Gemini API key)*
4. Save and redeploy.

---

## 3. اردو میں آسان ہدایات (Urdu Instructions for Android Mobile)

### ۱. کون سی فائلیں تبدیل / شامل کی گئیں؟ (Changed Files)
- `public/_worker.js`: کلاؤڈ فلیئر کے لیے بیک اینڈ ورکر اسکرپٹ (اس سے "Static-only" کا مسئلہ مکمل ختم ہو جاتا ہے)۔
- `wrangler.toml`: کلاؤڈ فلیئر کی سیٹنگز فائل۔
- `server.ts`: لوکل ڈیولپمنٹ کے لیے سرور بیک اینڈ۔
- `functions/api/translate.js` اور `functions/api/analyze-image.js`: کلاؤڈ فلیئر فنکشنز (`gemini-3.8-flash` ماڈل کے ساتھ)۔
- `src/App.tsx`: فرنٹ اینڈ انٹرفیس جس میں ترجمہ، مائیکروفون، تصویر، کاپی، شیئر سب کچھ شامل ہے۔
- `public/robots.txt` اور `public/sitemap.xml`: گوگل سرچ اور SEO فائلز۔

---

### ۲. موبائل فون سے GitHub کو کیسے اپ ڈیٹ کریں؟ (Update GitHub from Phone)
1. اپنے موبائل براؤزر (جیسے Google Chrome) میں [github.com](https://github.com) کھولیں اور لاگ ان کریں۔
2. اپنے Language Translator والے Repository میں جائیں۔
3. **طریقہ ۱ (آسان ترین):** اگر آپ نے کمپیوٹر پر گٹ استعمال نہیں کیا تو آپ گٹ ہب میں جا کر اوپر **Add file** -> **Upload files** دبا کر تبدیل شدہ فائلیں اپلوڈ کر سکتے ہیں۔
4. **طریقہ ۲ (فائل ایڈیٹ):** جس فائل کو بدلنا ہو اس پر کلک کریں، پنسل کے نشان (Edit) کو دبائیں، نیا کوڈ پیسٹ کریں اور نیچے **Commit changes** پر کلک کریں۔

---

### ۳. خفیہ Gemini API Key کہاں درج کرنی ہے؟ (Where to Add Secret Key)
1. اپنے موبائل پر [dash.cloudflare.com](https://dash.cloudflare.com) کھولیں۔
2. اپنے پروجیکٹ پر کلک کریں۔
3. اوپر دیے گئے مینو سے **Settings** منتخب کریں۔
4. بائیں جانب **Variables and Secrets** (یا Environment Variables) پر کلک کریں۔
5. **Add** کا بٹن دبائیں:
   - Variable name: `GEMINI_API_KEY`
   - Value: اپنی جیمنی API کی (Gemini API Key) درج کریں۔
   - **Encrypt** پر نشان لگائیں تاکہ یہ محفوظ رہے۔
6. **Save** کا بٹن دبا دیں۔

---

### ۴. نئی ڈپلائمنٹ کیسے شروع کریں؟ (Trigger New Deployment)
- جیسے ہی آپ GitHub پر فائلیں اپلوڈ یا commit کریں گے، Cloudflare خودکار طریقے سے نیا ورژن بلڈ اور ڈپلائے کر دے گا۔
- آپ Cloudflare ڈیش بورڈ میں **Deployments** ٹیب میں جا کر لائیو بلڈ اسٹیٹس دیکھ سکتے ہیں۔

---

### ۵. ویب سائٹ اور SEO ٹیسٹ کیسے کریں؟ (Testing Website & SEO)
1. **ترجمہ ٹیسٹ کریں:** ویب سائٹ کھولیں، ٹیکسٹ باکس میں اردو یا انگریزی لکھیں اور **Translate / Analyze** بٹن دبائیں۔
2. **مائیکروفون ٹیسٹ کریں:** مائیک بٹن دبائیں، براؤزر میں Allow پر کلک کریں اور بولیں۔ آواز ٹیکسٹ میں تبدیل ہو جائے گی۔
3. **تصویر ٹیسٹ کریں:** Camera / Image بٹن دبائیں اور تصویر منتخب کریں، جیمنی اس کا ترجمہ نکال دے گا۔
4. **SEO فائلز ٹیسٹ کریں:**
   - اپنے ڈومین کے آخر میں `/robots.txt` لکھ کر کھولیں (مثلاً: `https://your-app.pages.dev/robots.txt`)۔
   - اپنے ڈومین کے آخر میں `/sitemap.xml` لکھ کر کھولیں (مثلاً: `https://your-app.pages.dev/sitemap.xml`)۔
   دونوں فائلیں صحیح نظر آئیں گی۔
