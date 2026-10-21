/**
 * Speech-to-Text Module for Mobile Chrome and Desktop Browsers
 * Uses browser's Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 */

export function isSpeechSupported() {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function startSpeechRecognition(language, callbacks = {}) {
  if (typeof window === 'undefined') return null;

  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRec) {
    callbacks.onError?.(
      'آپ کے براؤزر میں مائیکروفون (Speech Recognition) کی سہولت موجود نہیں ہے۔ برائے کرم Android یا PC پر Google Chrome استعمال کریں۔'
    );
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
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    let hasReceivedResult = false;
    let isStoppedManually = false;

    recognition.onstart = () => {
      callbacks.onStart?.();
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = 0; i < event.results.length; ++i) {
        const item = event.results[i];
        if (item.isFinal) {
          finalTranscript += item[0].transcript;
        } else {
          interimTranscript += item[0].transcript;
        }
      }

      const combined = (finalTranscript + (interimTranscript ? (finalTranscript ? ' ' : '') + interimTranscript : '')).trim();

      if (combined) {
        hasReceivedResult = true;
        callbacks.onResult?.(combined, Boolean(finalTranscript));
      }
    };

    recognition.onerror = (event) => {
      const err = event.error;
      if (err === 'not-allowed' || err === 'permission-denied') {
        callbacks.onError?.('مائیکروفون کی اجازت مسترد ہوئی۔ براہِ کرم براؤزر کی سیٹنگز میں مائیک کی اجازت (Allow) دیں۔');
      } else if (err === 'no-speech') {
        if (!hasReceivedResult && !isStoppedManually) {
          callbacks.onError?.('کوئی آواز نہیں سنی گئی۔ براہِ کرم مائیک کا بٹن دبا کر واضح آواز میں بولیں۔');
        }
      } else if (err === 'network') {
        callbacks.onError?.('اسپیچ سروس کے لیے انٹرنیٹ درکار ہے۔ انٹرنیٹ کنکشن چیک کریں۔');
      } else if (err === 'audio-capture') {
        callbacks.onError?.('مائیکروفون دستیاب نہیں ہے یا کسی اور ایپلیکیشن میں استعمال ہو رہا ہے۔');
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
        isStoppedManually = true;
        try {
          recognition.stop();
        } catch (e) {
          try {
            recognition.abort();
          } catch (e2) {}
        }
      },
    };
  } catch (err) {
    callbacks.onError?.(`مائیکروفون شروع نہیں ہو سکا: ${err?.message || 'Error'}`);
    return null;
  }
}
