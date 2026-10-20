/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';

// Central Model IDs constant
export const GEMINI_MODELS = {
  PRIMARY: 'gemini-1.5-flash',
  FALLBACK: 'gemini-2.0-flash',
} as const;

function formatGeminiError(status: number, data: any): string {
  if (status === 404) {
    return 'ماڈل ID درست نہیں ہے یا یہ ماڈل اس API ورژن میں دستیاب نہیں ہے۔ (Model Not Found - 404)';
  }
  const msg = (data?.error?.message || '').toLowerCase();
  if (
    status === 400 ||
    status === 401 ||
    msg.includes('api_key_invalid') ||
    msg.includes('api key not valid') ||
    msg.includes('invalid api key')
  ) {
    return 'Gemini API Key درست نہیں ہے۔ براہِ کرم Settings میں صحیح Key درج کریں۔ (Invalid API Key)';
  }
  if (status === 403 || msg.includes('permission') || msg.includes('access denied')) {
    return 'اس API Key کے پاس اجازت نہیں ہے یا رسائی بند ہے۔ (Permission Denied)';
  }
  if (
    status === 429 ||
    msg.includes('resource_exhausted') ||
    msg.includes('quota') ||
    msg.includes('rate limit')
  ) {
    return 'Gemini API کا کوٹہ (Quota) ختم ہو چکا ہے یا ریٹ لمیٹ آ گئی ہے۔ (Quota Exceeded - 429)';
  }
  return `Gemini API خرابی (${status || 'ایرر'}): ${data?.error?.message || 'ترجمہ ناکام ہو گیا'}`;
}

export default function App() {
  const [darkMode, setDarkMode] = useState(() => {
    try {
      const saved = localStorage.getItem('theme');
      if (saved) return saved === 'dark';
      return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {
      return false;
    }
  });

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sourceLang, setSourceLang] = useState('English');
  const [targetLang, setTargetLang] = useState('Urdu');
  const [sourceText, setSourceText] = useState('');
  const [resultText, setResultText] = useState('Translation will appear here…');
  const [statusMessage, setStatusMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appLanguage, setAppLanguage] = useState('English');

  // Load and persist Gemini API Key in localStorage
  const [apiKey, setApiKey] = useState(() => {
    try {
      return localStorage.getItem('gemini_api_key') || '';
    } catch (e) {
      return '';
    }
  });

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    try {
      localStorage.setItem('gemini_api_key', value);
    } catch (e) {
      // Ignore in restricted environments
    }
  };

  const imageFileRef = useRef<HTMLInputElement>(null);
  const anyFileRef = useRef<HTMLInputElement>(null);

  // Toggle dark mode class on body and remember preference in localStorage
  useEffect(() => {
    try {
      if (darkMode) {
        document.body.classList.add('dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.body.classList.remove('dark');
        localStorage.setItem('theme', 'light');
      }
    } catch (e) {
      // Ignore in restricted environments
    }
  }, [darkMode]);

  const handleSwap = () => {
    const temp = sourceLang;
    setSourceLang(targetLang);
    setTargetLang(temp);
    setSourceText(resultText !== 'Translation will appear here…' ? resultText : '');
    setResultText('Translation will appear here…');
    setStatusMessage('');
  };

  const handleClear = () => {
    setSourceText('');
    setResultText('Translation will appear here…');
    setStatusMessage('');
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setSourceText(text);
      setStatusMessage('Pasted from clipboard.');
    } catch (e) {
      setStatusMessage('Long-press the text box and choose Paste.');
    }
  };

  // Helper to send generateContent requests with a specific model
  const sendGeminiRequest = async (model: string, bodyContent: any) => {
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey.trim()}`;
    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyContent),
      });
      const data = await res.json().catch(() => null);
      return { ok: res.ok, status: res.status, data };
    } catch (netErr: any) {
      return { ok: false, status: 0, data: null, netErr };
    }
  };

  const handleTranslate = async () => {
    if (!sourceText.trim()) {
      setStatusMessage('Please enter text to translate.');
      return;
    }

    if (!apiKey.trim()) {
      setStatusMessage('پہلے Settings میں Gemini API Key لکھیں۔');
      return;
    }

    setIsLoading(true);
    setStatusMessage('Translating with Gemini 1.5 Flash...');
    setResultText('Translating...');

    const prompt = `You are an expert professional translator. Translate the following text accurately from "${sourceLang || 'Auto-detect'}" to "${targetLang}".
Preserve paragraph breaks, punctuation, formatting, and original meaning. Do not add introductory conversational filler, pleasantries, or explanations. Output ONLY the direct translated text.

Text to translate:
${sourceText}`;

    const requestBody = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    };

    try {
      // 1. First attempt with Gemini 1.5 Flash
      let res = await sendGeminiRequest(GEMINI_MODELS.PRIMARY, requestBody);

      if (res.netErr) {
        setStatusMessage('انٹرنیٹ کنکشن کا مسئلہ ہے یا نیٹ ورک ایرر ہے۔ براہِ کرم اپنا کنکشن چیک کریں۔ (Network error)');
        setResultText('Translation failed.');
        setIsLoading(false);
        return;
      }

      // 2. Check if 1.5 quota is exhausted (HTTP 429 or quota error)
      const isQuota =
        res.status === 429 ||
        (res.data?.error?.message || '').toLowerCase().includes('quota') ||
        (res.data?.error?.message || '').toLowerCase().includes('resource_exhausted');

      if (isQuota) {
        setStatusMessage('1.5 کا کوٹا ختم، 2.0 سے ترجمہ ہو رہا ہے...');
        // Retry with Gemini 2.0 Flash
        res = await sendGeminiRequest(GEMINI_MODELS.FALLBACK, requestBody);

        if (res.netErr) {
          setStatusMessage('انٹرنیٹ کنکشن کا مسئلہ ہے۔ براہِ کرم اپنا کنکشن چیک کریں۔ (Network error)');
          setResultText('Translation failed.');
          setIsLoading(false);
          return;
        }

        if (res.ok && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          setResultText(res.data.candidates[0].content.parts[0].text);
          setStatusMessage('ترجمہ مکمل ہو گیا (Gemini 2.0 Flash سے)۔');
          setIsLoading(false);
          return;
        }
      }

      // Check if success
      if (res.ok && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
        setResultText(res.data.candidates[0].content.parts[0].text);
        setStatusMessage('Translation completed successfully.');
      } else {
        const errorMsg = formatGeminiError(res.status, res.data);
        setStatusMessage(errorMsg);
        setResultText('Translation failed.');
      }
    } catch (err: any) {
      console.error(err);
      setStatusMessage(`Error: ${err.message || 'Translation failed.'}`);
      setResultText('Translation failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMic = () => {
    const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRec) {
      setStatusMessage('آپ کے براؤزر میں مائیکروفون (Speech Recognition) کی سہولت موجود نہیں ہے۔ براہِ کرم Google Chrome استعمال کریں۔');
      return;
    }

    try {
      const recognition = new SpeechRec();
      const langMap: Record<string, string> = {
        'Urdu': 'ur-PK',
        'English': 'en-US',
        'Punjabi': 'pa-PK',
        'Hindi': 'hi-IN',
        'Arabic': 'ar-SA',
        'French': 'fr-FR',
        'Spanish': 'es-ES',
      };

      recognition.lang = langMap[sourceLang] || 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setStatusMessage('سن رہا ہے… مائیکروفون میں بولیے۔');
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results?.[0]?.[0]?.transcript;
        if (transcript) {
          setSourceText(transcript);
          setStatusMessage('آواز کامیابی سے ٹیکسٹ میں تبدیل ہو گئی۔');
        } else {
          setStatusMessage('کوئی آواز نہیں سنی گئی۔ دوبارہ کوشش کریں۔');
        }
      };

      recognition.onerror = (event: any) => {
        if (event.error === 'not-allowed' || event.error === 'permission-denied') {
          setStatusMessage('مائیکروفون کی اجازت نہیں ملی۔ براہِ کرم براؤزر میں مائیک کی اجازت (Allow) دیں۔');
        } else if (event.error === 'no-speech') {
          setStatusMessage('کوئی آواز نہیں سنی گئی۔ دوبارہ بولنے کی کوشش کریں۔');
        } else if (event.error === 'network') {
          setStatusMessage('نیٹ ورک کا مسئلہ ہے جس کی وجہ سے آواز کی شناخت نہیں ہو سکی۔');
        } else {
          setStatusMessage(`مائیکروفون خرابی (${event.error || 'unknown'})۔`);
        }
      };

      // Request mic permission by starting recognition
      recognition.start();
    } catch (e: any) {
      setStatusMessage(`مائیکروفون شروع نہیں ہو سکا: ${e.message || 'Error'}`);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!apiKey.trim()) {
      setStatusMessage('پہلے Settings میں Gemini API Key لکھیں۔');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setStatusMessage('Image size exceeds 10MB limit.');
      return;
    }

    setIsLoading(true);
    setStatusMessage(`Analyzing image: ${file.name}...`);

    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const base64String = (reader.result as string).split(',')[1];
        const prompt = `Analyze this image, extract any readable text present in it, and translate that extracted text into "${targetLang}". If there is no text in the image, provide a concise description of the image content translated into "${targetLang}". Output ONLY the translation or description without conversational commentary.`;

        const requestBody = {
          contents: [
            {
              parts: [
                { text: prompt },
                {
                  inline_data: {
                    mime_type: file.type || 'image/jpeg',
                    data: base64String,
                  },
                },
              ],
            },
          ],
          generationConfig: { temperature: 0.3 },
        };

        // 1. First attempt with Gemini 1.5 Flash
        let res = await sendGeminiRequest(GEMINI_MODELS.PRIMARY, requestBody);

        if (res.netErr) {
          setStatusMessage('انٹرنیٹ کنکشن کا مسئلہ ہے یا نیٹ ورک ایرر ہے۔ براہِ کرم اپنا کنکشن چیک کریں۔ (Network error)');
          setResultText('Image analysis failed.');
          setIsLoading(false);
          return;
        }

        // 2. Check if 1.5 quota is exhausted
        const isQuota =
          res.status === 429 ||
          (res.data?.error?.message || '').toLowerCase().includes('quota') ||
          (res.data?.error?.message || '').toLowerCase().includes('resource_exhausted');

        if (isQuota) {
          setStatusMessage('1.5 کا کوٹا ختم، 2.0 سے تجزیہ ہو رہا ہے...');
          res = await sendGeminiRequest(GEMINI_MODELS.FALLBACK, requestBody);

          if (res.netErr) {
            setStatusMessage('انٹرنیٹ کنکشن کا مسئلہ ہے۔ (Network error)');
            setResultText('Image analysis failed.');
            setIsLoading(false);
            return;
          }

          if (res.ok && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
            setResultText(res.data.candidates[0].content.parts[0].text);
            setStatusMessage(`تصویر کا تجزیہ اور ترجمہ مکمل ہو گیا (Gemini 2.0 Flash سے)۔`);
            setIsLoading(false);
            return;
          }
        }

        // Check if success
        if (res.ok && res.data?.candidates?.[0]?.content?.parts?.[0]?.text) {
          setResultText(res.data.candidates[0].content.parts[0].text);
          setStatusMessage(`Image analyzed and translated to ${targetLang}.`);
        } else {
          const errorMsg = formatGeminiError(res.status, res.data);
          setStatusMessage(errorMsg);
          setResultText('Image analysis failed.');
        }
      } catch (err: any) {
        console.error(err);
        setStatusMessage(`Image analysis error: ${err.message}`);
        setResultText('Image analysis failed.');
      } finally {
        setIsLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAnyFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('text/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setSourceText(reader.result as string);
        setStatusMessage(`Loaded text file: ${file.name}`);
      };
      reader.readAsText(file);
    } else {
      handleImageUpload(e);
    }
  };

  const handleCopy = async () => {
    if (!resultText || resultText === 'Translation will appear here…') return;
    try {
      await navigator.clipboard.writeText(resultText);
      setStatusMessage('Copied result to clipboard.');
    } catch (e) {
      setStatusMessage('Select and copy the result manually.');
    }
  };

  const handleListen = () => {
    if (!('speechSynthesis' in window)) {
      setStatusMessage('Text-to-speech is not supported in this browser.');
      return;
    }
    if (!resultText || resultText === 'Translation will appear here…') return;

    const utterance = new SpeechSynthesisUtterance(resultText);
    const langMap: Record<string, string> = {
      'Urdu': 'ur-PK',
      'Punjabi': 'pa-PK',
      'Hindi': 'hi-IN',
      'Arabic': 'ar-SA',
      'French': 'fr-FR',
      'Spanish': 'es-ES',
      'English': 'en-US',
    };
    utterance.lang = langMap[targetLang] || 'en-US';
    window.speechSynthesis.speak(utterance);
    setStatusMessage('Playing speech playback...');
  };

  const handleShare = async () => {
    if (!resultText || resultText === 'Translation will appear here…') return;
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Language Translator Pro',
          text: resultText,
        });
        setStatusMessage('Shared successfully.');
      } catch (e) {
        // User cancelled share
      }
    } else {
      setStatusMessage('Sharing is not supported in this browser.');
    }
  };

  const languages = ['English', 'Urdu', 'Hindi', 'Punjabi', 'Arabic', 'French', 'Spanish'];

  return (
    <>
      <style>{`
        :root{color-scheme:light;--page:#e4f4f0;--card:#f4fbf8;--header:#c6e5d9;--green:#168f70;--green2:#08765a;--ink:#18231f;--muted:#5c6d66;--edge:#b9d0c8;--shadow:0 5px 18px #203e3316}
        *{box-sizing:border-box}body{margin:0;background:var(--page);color:var(--ink);font:15px/1.45 system-ui,-apple-system,"Segoe UI",Arial,sans-serif;padding:0;min-height:100vh}
        body.dark{color-scheme:dark;--page:#14231c;--card:#1c3027;--header:#244c3a;--green:#159875;--green2:#0b765b;--ink:#eef8f2;--muted:#b6c9bf;--edge:#456354;--shadow:0 5px 18px #0003}
        .app{width:100%;margin:0;border:0;border-radius:0;background:var(--card);box-shadow:none;overflow:visible;min-height:100vh}
        body.dark .app{border:0}
        header{min-height:78px;background:var(--header);display:flex;align-items:center;gap:11px;padding:12px 14px}
        .logo{width:48px;height:48px;flex:0 0 48px;border-radius:14px;background:linear-gradient(145deg,#a4e2b7,#16845d);display:grid;place-items:center;color:white;font-weight:800;font-size:20px;box-shadow:inset 0 0 0 2px #ffffff65}
        .brand{min-width:0;flex:1}.brand strong{display:block;font-size:17px;line-height:1.2}.brand small{display:block;font-size:11px;color:var(--muted);margin-top:3px}
        .iconbtn{border:1px solid var(--edge);background:var(--card);color:var(--ink);border-radius:12px;min-width:42px;min-height:42px;display:inline-flex;align-items:center;justify-content:center;cursor:pointer;padding:8px;box-shadow:var(--shadow)}
        .iconbtn svg{width:21px;height:21px;stroke:currentColor;fill:none;stroke-width:1.9;stroke-linecap:round;stroke-linejoin:round}
        header .iconbtn{border:0;background:transparent;box-shadow:none}
        main{padding:15px}
        .languages{display:grid;grid-template-columns:minmax(0,1fr) 44px minmax(0,1fr);gap:8px;align-items:center;margin-bottom:14px}
        .languages select{width:100%;min-width:0;border:1px solid var(--edge);background:var(--card);color:var(--ink);border-radius:13px;padding:12px 9px;font-size:14px;box-shadow:var(--shadow)}
        .swap{height:42px;border:1px solid var(--edge);border-radius:13px;background:var(--card);color:var(--green);font-size:23px;cursor:pointer}
        .panel{background:var(--card);border:1px solid var(--edge);border-radius:19px;box-shadow:var(--shadow);padding:13px}
        textarea{width:100%;height:150px;resize:vertical;display:block;border:0;outline:0;background:transparent;color:var(--ink);font:15px/1.55 inherit;padding:2px}
        textarea::placeholder{color:var(--muted);opacity:1}
        .toolrow{display:flex;gap:9px;align-items:center;flex-wrap:wrap;border-top:1px solid var(--edge);padding-top:11px;margin-top:8px}
        .tool{display:flex;align-items:center;justify-content:center;gap:7px;min-height:42px;padding:8px 10px;border:1px solid var(--edge);border-radius:12px;background:var(--card);color:var(--ink);font-size:12px;font-weight:650;cursor:pointer}
        .tool svg{width:20px;height:20px;stroke:var(--green2);fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
        .tool.clear{margin-left:auto;color:var(--muted)}
        .primary{width:100%;min-height:48px;margin:14px 0;border:0;border-radius:12px;background:linear-gradient(135deg,var(--green),var(--green2));color:#fff;font-weight:750;font-size:15px;box-shadow:0 4px 10px #08765a25;cursor:pointer}
        .resulthead{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px}
        .resulthead strong{font-size:14px}.resulttools{display:flex;gap:7px}.resulttext{min-height:105px;white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.65;color:var(--ink)}
        .status{font-size:12px;color:var(--muted);min-height:18px;margin-top:8px}
        .footer{text-align:center;color:var(--muted);font-size:11px;padding:0 14px 14px}
        .shade{display:none;position:fixed;inset:0;background:#07150f80;z-index:5;padding:12px;justify-content:flex-end}.shade.show{display:flex}
        .drawer{width:min(350px,100%);height:100%;overflow:auto;background:var(--card);border:1px solid var(--edge);border-radius:20px;padding:17px;box-shadow:0 15px 40px #0003}
        .drawerhead{display:flex;align-items:center;justify-content:space-between;margin-bottom:18px;font-size:18px;font-weight:750}
        .label{display:block;font-size:13px;font-weight:650;margin:16px 0 7px}
        .drawer select,.drawer input{width:100%;padding:11px;border:1px solid var(--edge);border-radius:11px;background:var(--card);color:var(--ink)}
        .install{width:100%;padding:12px;border:0;border-radius:11px;background:var(--green);color:#fff;font-weight:700;cursor:pointer}
        .model-list{display:grid;gap:7px}.model-list button{text-align:left;padding:11px;border:1px solid var(--edge);border-radius:10px;background:transparent;color:var(--ink);cursor:pointer}.model-list button.active{border-color:var(--green);background:#168f7018}
        .note{font-size:12px;color:var(--muted);line-height:1.5}
        input[type=file]{display:none}
        @media(min-width:720px){body{padding:0}.app{width:100%}}
        @media(max-width:360px){body{padding:0}.app{border-width:0;border-radius:0}main{padding:10px}.tool{flex:1;padding:8px 5px}.tool span{font-size:11px}.languages select{font-size:12px;padding:11px 5px}.brand strong{font-size:15px}}
      `}</style>

      <div className="app">
        <header>
          <div className="logo" aria-hidden="true">A文</div>
          <div className="brand">
            <strong>Language Translator</strong>
            <small>Translation workspace</small>
          </div>
          <button 
            className="iconbtn" 
            id="theme" 
            onClick={() => setDarkMode(!darkMode)}
            aria-label="Toggle light and dark mode" 
            title="Toggle theme"
          >
            <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>
          </button>
          <button 
            className="iconbtn" 
            id="menu" 
            onClick={() => setSettingsOpen(true)}
            aria-label="Open settings" 
            title="Settings"
          >
            <svg viewBox="0 0 24 24"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </header>

        <main>
          <div className="languages">
            <select 
              id="from" 
              value={sourceLang} 
              onChange={(e) => setSourceLang(e.target.value)}
              aria-label="Source language"
            >
              {languages.map((l) => (
                <option key={`from-${l}`} value={l}>{l}</option>
              ))}
            </select>
            <button 
              className="swap" 
              id="swap" 
              onClick={handleSwap}
              aria-label="Swap languages" 
              title="Swap languages"
            >
              ⇄
            </button>
            <select 
              id="to" 
              value={targetLang} 
              onChange={(e) => setTargetLang(e.target.value)}
              aria-label="Target language"
            >
              {languages.map((l) => (
                <option key={`to-${l}`} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <section className="panel">
            <textarea 
              id="source" 
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Type or paste text here…" 
              aria-label="Text to translate"
            />
            <div className="toolrow">
              <button className="tool" id="mic" onClick={handleMic} title="Speech input">
                <svg viewBox="0 0 24 24"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10v2a7 7 0 0 0 14 0v-2M12 19v3m-4 0h8"/></svg>
                <span>Mic</span>
              </button>
              <button className="tool" id="camera" onClick={() => imageFileRef.current?.click()} title="Choose image">
                <svg viewBox="0 0 24 24"><path d="M4 7h3l2-3h6l2 3h3a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/></svg>
                <span>Camera / Image</span>
              </button>
              <button className="tool" id="file" onClick={() => anyFileRef.current?.click()} title="Upload file">
                <svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8"/></svg>
                <span>File</span>
              </button>
              <button className="tool" id="paste" onClick={handlePaste} title="Paste from clipboard">
                <svg viewBox="0 0 24 24"><rect x="8" y="3" width="12" height="17" rx="2"/><path d="M16 3V2H6a2 2 0 0 0-2 2v14h4M11 8h6M11 12h6M11 16h4"/></svg>
                <span>Paste</span>
              </button>
              <button className="tool clear" id="clear" onClick={handleClear}>Clear</button>
              <input 
                type="file" 
                ref={imageFileRef}
                id="imageFile" 
                accept="image/*" 
                capture="environment"
                onChange={handleImageUpload}
              />
              <input 
                type="file" 
                ref={anyFileRef}
                id="anyFile" 
                accept="image/*,.txt"
                onChange={handleAnyFile}
              />
            </div>
          </section>

          <button 
            className="primary" 
            id="translate" 
            onClick={handleTranslate}
            disabled={isLoading}
          >
            {isLoading ? 'Processing...' : 'Translate / Analyze'}
          </button>

          <section className="panel">
            <div className="resulthead">
              <strong>Translation result</strong>
              <div className="resulttools">
                <button className="iconbtn" id="listen" onClick={handleListen} title="Listen to result" aria-label="Listen">
                  <svg viewBox="0 0 24 24"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/><path d="M17 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/></svg>
                </button>
                <button className="iconbtn" id="copy" onClick={handleCopy} title="Copy result" aria-label="Copy">
                  <svg viewBox="0 0 24 24"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>
                </button>
                <button className="iconbtn" id="share" onClick={handleShare} title="Share result" aria-label="Share">
                  <svg viewBox="0 0 24 24"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.7 10.7 6.6-4.4m-6.6 9 6.6 2.9"/></svg>
                </button>
              </div>
            </div>
            <div className="resulttext" id="result">{resultText}</div>
          </section>

          <div className="status" id="status" role="status">{statusMessage}</div>
        </main>

        <div className="footer">Powered by Gemini AI · Translation Workspace</div>
      </div>

      <div className={`shade ${settingsOpen ? 'show' : ''}`} id="shade" onClick={(e) => { if (e.target === e.currentTarget) setSettingsOpen(false); }}>
        <aside className="drawer">
          <div className="drawerhead">
            <span>⚙ Settings</span>
            <button className="iconbtn" id="close" onClick={() => setSettingsOpen(false)} aria-label="Close settings">×</button>
          </div>
          
          <label className="label" htmlFor="appLanguage">App language</label>
          <select id="appLanguage" value={appLanguage} onChange={(e) => setAppLanguage(e.target.value)}>
            <option>English</option>
            <option>Urdu</option>
            <option>Hindi</option>
          </select>

          <label className="label">Install App (PWA)</label>
          <button className="install" id="install" onClick={() => setStatusMessage('To install, use "Add to Home screen" in your browser menu.')}>Install App</button>

          <label className="label" htmlFor="api">Gemini API Key</label>
          <input 
            id="api" 
            type="password" 
            value={apiKey}
            onChange={(e) => handleApiKeyChange(e.target.value)}
            placeholder="Enter your Gemini API key" 
            autoComplete="off" 
          />
          <p className="note">آپ کی API Key محفوظ رہے گی اور صرف آپ کے براؤزر کی میموری (localStorage) میں سیو ہوگی۔</p>

          <label className="label">Gemini AI Model</label>
          <div className="model-list" id="models">
            <button 
              className="active"
            >
              Gemini 1.5 Flash (خودکار فال بیک: 2.0 Flash)
            </button>
          </div>

          <label className="label">App Info</label>
          <div className="note">Language Translator Pro · Cloudflare Workers</div>
        </aside>
      </div>
    </>
  );
}
