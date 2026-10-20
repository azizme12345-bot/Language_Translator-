/**
 * Speech-to-Text Module for Mobile Chrome and Desktop Browsers
 * Uses browser's Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 */

export function isSpeechSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startSpeechRecognition(language, callbacks = {}) {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRec) {
    callbacks.onError?.('آپ کے براؤزر میں مائیکروفون (Speech Recognition) کی سہولت موجود نہیں ہے۔ برائے کرم Android پر Google Chrome استعمال کریں۔');
    return null;
  }

  const langMap = {
    'Urdu': 'ur-PK',
    'English': 'en-US',
    'Punjabi': 'pa-PK',
    'Hindi': 'hi-IN',
    'Arabic': 'ar-SA',
    'French': 'fr-FR',
    'Spanish': 'es-ES',
  };

  try {
    const recognition = new SpeechRec();
    recognition.lang = langMap[language] || 'en-US';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    let hasReceivedResult = false;

    recognition.onstart = () => {
      callbacks.onStart?.();
    };

    recognition.onresult = (event) => {
      hasReceivedResult = true;
      const transcript = event.results?.[0]?.[0]?.transcript;
      if (transcript && transcript.trim()) {
        callbacks.onResult?.(transcript.trim());
      } else {
        callbacks.onError?.('کوئی واضح آواز نہیں پکڑی گئی۔ براہِ کرم دوبارہ بولیے۔');
      }
    };

    recognition.onerror = (event) => {
      const err = event.error;
      if (err === 'not-allowed' || err === 'permission-denied') {
        callbacks.onError?.('مائیکروفون کی اجازت مسترد ہوئی۔ براہِ کرم براؤزر کی سیٹنگز میں مائیک کی اجازت (Allow) دیں۔');
      } else if (err === 'no-speech') {
        if (!hasReceivedResult) {
          callbacks.onError?.('کوئی آواز نہیں سنی گئی۔ براہِ کرم مائیک کا بٹن دبا کر واضح آواز میں بولیں۔');
        }
      } else if (err === 'network') {
        callbacks.onError?.('انٹرنیٹ یا اسپیچ سروس کا کنکشن مسئلہ ہے۔ انٹرنیٹ چیک کریں۔');
      } else if (err === 'audio-capture') {
        callbacks.onError?.('مائیکروفون دستیاب نہیں ہے یا استعمال میں ہے۔');
      } else if (err === 'aborted') {
        // Recognition aborted
      } else {
        callbacks.onError?.(`مائیکروفون خرابی (${err || 'unknown'})۔`);
      }
    };

    recognition.onend = () => {
      callbacks.onEnd?.();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch (e) {}
      },
    };
  } catch (err) {
    callbacks.onError?.(`مائیکروفون شروع نہیں ہو سکا: ${err?.message || 'Error'}`);
    return null;
  }
}
