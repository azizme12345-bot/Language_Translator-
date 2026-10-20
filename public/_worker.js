/**
 * Cloudflare Worker & Pages Advanced Mode Router
 * Handles /api/translate and /api/analyze-image securely with GEMINI_API_KEY
 * Serves all static assets via env.ASSETS.fetch(request)
 */

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // CORS preflight headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. Endpoint: /api/translate
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { text, sourceLang, targetLang, model = 'gemini-3.8-flash' } = body;

        if (!text || !targetLang) {
          return new Response(
            JSON.stringify({ error: 'Missing text or targetLang' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const apiKey = env.GEMINI_API_KEY || '';
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: 'GEMINI_API_KEY is not configured in Cloudflare environment variables or secrets.'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
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
          throw new Error(data.error?.message || `Gemini API error (Status ${response.status})`);
        }

        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return new Response(
          JSON.stringify({ translatedText }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message || 'Translation failed' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // 2. Endpoint: /api/analyze-image
    if (url.pathname === '/api/analyze-image' && request.method === 'POST') {
      try {
        const body = await request.json();
        const { image, mimeType, targetLang = 'English', model = 'gemini-3.8-flash' } = body;

        if (!image) {
          return new Response(
            JSON.stringify({ error: 'Missing image data' }),
            { status: 400, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
        }

        const apiKey = env.GEMINI_API_KEY || '';
        if (!apiKey) {
          return new Response(
            JSON.stringify({
              error: 'GEMINI_API_KEY is not configured in Cloudflare environment variables or secrets.'
            }),
            { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
          );
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
          throw new Error(data.error?.message || `Gemini API image analysis error (Status ${response.status})`);
        }

        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return new Response(
          JSON.stringify({ translatedText }),
          { status: 200, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      } catch (err) {
        return new Response(
          JSON.stringify({ error: err.message || 'Image analysis failed' }),
          { status: 500, headers: { 'Content-Type': 'application/json', ...corsHeaders } }
        );
      }
    }

    // 3. Serve static assets
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Asset not found', { status: 404 });
  }
};
