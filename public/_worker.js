/**
 * Cloudflare Worker / Pages Advanced Mode Entry Point
 * Bundled with dist/ during build to handle /api/* and serve static assets
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
    },
  });
}

function parseGeminiError(status, data) {
  const errMessage = data?.error?.message || 'Unexpected Gemini API response.';
  if (status === 400) {
    if (errMessage.includes('API_KEY_INVALID') || errMessage.includes('API key not valid')) {
      return { statusCode: 401, message: 'Invalid Gemini API key. Please verify your GEMINI_API_KEY secret.' };
    }
    return { statusCode: 400, message: `Bad Request: ${errMessage}` };
  }
  if (status === 403) {
    return { statusCode: 403, message: 'Permission denied: Gemini API key lacks required permissions.' };
  }
  if (status === 429 || errMessage.includes('RESOURCE_EXHAUSTED') || errMessage.includes('quota')) {
    return { statusCode: 429, message: 'Gemini API quota exceeded or rate limited. Please try again shortly.' };
  }
  return { statusCode: 502, message: `Gemini API service error (${status}): ${errMessage}` };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // 1. POST /api/translate
    if (url.pathname === '/api/translate' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => null);
        if (!body) {
          return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
        }

        const { text, sourceLang, targetLang, model = 'gemini-3.8-flash' } = body;

        if (!text || typeof text !== 'string' || !text.trim()) {
          return jsonResponse({ error: 'Text to translate is required and cannot be empty.' }, 400);
        }

        if (!targetLang || typeof targetLang !== 'string') {
          return jsonResponse({ error: 'Target language is required.' }, 400);
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return jsonResponse({ error: 'GEMINI_API_KEY is not configured in Cloudflare environment secrets.' }, 500);
        }

        const prompt = `You are an expert professional translator. Translate the following text accurately from "${sourceLang || 'Auto-detect'}" to "${targetLang}".
Preserve paragraph breaks, punctuation, formatting, and original meaning. Do not add introductory conversational filler, pleasantries, or explanations. Output ONLY the direct translated text.

Text to translate:
${text}`;

        const modelName = model?.includes('pro') ? 'gemini-1.5-pro' : 'gemini-3.8-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        let response;
        try {
          response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3 },
            }),
          });
        } catch (netErr) {
          return jsonResponse({ error: `Network error connecting to Gemini API: ${netErr.message}` }, 503);
        }

        const data = await response.json().catch(() => null);

        if (!response.ok || !data || data.error) {
          const parsed = parseGeminiError(response.status, data);
          return jsonResponse({ error: parsed.message }, parsed.statusCode);
        }

        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!translatedText || typeof translatedText !== 'string') {
          return jsonResponse({ error: 'Gemini API returned an empty or unrecognized translation response.' }, 502);
        }

        return jsonResponse({ translatedText });
      } catch (err) {
        return jsonResponse({ error: err.message || 'Internal translation error.' }, 500);
      }
    }

    // 2. POST /api/analyze-image
    if (url.pathname === '/api/analyze-image' && request.method === 'POST') {
      try {
        const body = await request.json().catch(() => null);
        if (!body) {
          return jsonResponse({ error: 'Invalid JSON request body.' }, 400);
        }

        const { image, mimeType, targetLang = 'English', model = 'gemini-3.8-flash' } = body;

        if (!image || typeof image !== 'string') {
          return jsonResponse({ error: 'Missing or invalid base64 image data.' }, 400);
        }

        const apiKey = env.GEMINI_API_KEY;
        if (!apiKey) {
          return jsonResponse({ error: 'GEMINI_API_KEY is not configured in Cloudflare environment secrets.' }, 500);
        }

        const prompt = `Analyze this image, extract any readable text present in it, and translate that extracted text into "${targetLang}". If there is no text in the image, provide a concise description of the image content translated into "${targetLang}". Output ONLY the translation or description without conversational commentary.`;

        const modelName = model?.includes('pro') ? 'gemini-1.5-pro' : 'gemini-3.8-flash';
        const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;

        let response;
        try {
          response = await fetch(apiUrl, {
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
        } catch (netErr) {
          return jsonResponse({ error: `Network error connecting to Gemini API: ${netErr.message}` }, 503);
        }

        const data = await response.json().catch(() => null);

        if (!response.ok || !data || data.error) {
          const parsed = parseGeminiError(response.status, data);
          return jsonResponse({ error: parsed.message }, parsed.statusCode);
        }

        const translatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!translatedText || typeof translatedText !== 'string') {
          return jsonResponse({ error: 'Gemini API returned an empty or unrecognized image analysis response.' }, 502);
        }

        return jsonResponse({ translatedText });
      } catch (err) {
        return jsonResponse({ error: err.message || 'Internal image analysis error.' }, 500);
      }
    }

    // 3. Serve static assets via Cloudflare Worker ASSETS binding
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Not found', { status: 404 });
  },
};
