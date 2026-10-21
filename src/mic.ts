/**
 * Speech-to-Text Module for Mobile Chrome, Android, and Desktop Browsers
 * Uses browser's Web Speech API (SpeechRecognition / webkitSpeechRecognition)
 */

export interface SpeechCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
}

export interface SpeechRecognitionController {
  stop: () => void;
}

export function isSpeechSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

export function startSpeechRecognition(
  language: string,
  callbacks: SpeechCallbacks = {}
): SpeechRecognitionController | null {
  if (typeof window === 'undefined') return null;

  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRec) {
    callbacks.onError?.(
      'آپ کے براؤزر میں مائیکروفون (Speech Recognition) کی سہولت موجود نہیں ہے۔ برائے کرم Android یا PC پر Google Chrome استعمال کریں۔'
    );
    return null;
  }

  const langMap: Record<string, string> = {
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
    // Enable interim results so mobile Chrome updates in real time as user speaks
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = true;

    let hasReceivedResult = false;
    let isStoppedManually = false;

    recognition.onstart = () => {
      callbacks.onStart?.();
    };

    recognition.onresult = (event: any) => {
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

    recognition.onerror = (event: any) => {
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
        // Recognition aborted by user stop
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
  } catch (err: any) {
    callbacks.onError?.(`مائیکروفون شروع نہیں ہو سکا: ${err?.message || 'Error'}`);
    return null;
  }
}
