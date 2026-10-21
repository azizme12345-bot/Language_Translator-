/**
 * Text-to-Speech (TTS) Module
 * Provides reliable audio playback across all browsers and devices.
 * Uses Web Speech API (speechSynthesis) with seamless fallback to Google TTS audio
 * to ensure Urdu, Punjabi, Hindi, Arabic, English, French, and Spanish speak reliably.
 */

export interface TTSOptions {
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

let activeAudio: HTMLAudioElement | null = null;
let activeUtterance: SpeechSynthesisUtterance | null = null;

export function stopSpeaking(): void {
  try {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
  } catch (e) {}

  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      activeUtterance = null;
    } catch (e) {}
  }
}

export function isSpeaking(): boolean {
  if (activeAudio && !activeAudio.paused && !activeAudio.ended) {
    return true;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    return window.speechSynthesis.speaking;
  }
  return false;
}

export function speakText(text: string, language: string, options: TTSOptions = {}): void {
  stopSpeaking();

  const cleanText = text.trim();
  if (!cleanText) {
    options.onError?.('بولنے کے لیے کوئی متن موجود نہیں ہے۔');
    return;
  }

  const langCodeMap: Record<string, string> = {
    'Urdu': 'ur',
    'Punjabi': 'pa',
    'Hindi': 'hi',
    'Arabic': 'ar',
    'French': 'fr',
    'Spanish': 'es',
    'English': 'en',
  };

  const bcp47Map: Record<string, string> = {
    'Urdu': 'ur-PK',
    'Punjabi': 'pa-PK',
    'Hindi': 'hi-IN',
    'Arabic': 'ar-SA',
    'French': 'fr-FR',
    'Spanish': 'es-ES',
    'English': 'en-US',
  };

  const shortCode = langCodeMap[language] || 'en';
  const bcp47 = bcp47Map[language] || 'en-US';

  // Fallback to high-quality online TTS audio
  const playViaAudioFallback = () => {
    try {
      const truncated = cleanText.length > 250 ? cleanText.slice(0, 250) : cleanText;
      const audioUrl = `https://translate.google.com/translate_tts?ie=UTF-8&tl=${shortCode}&client=tw-ob&q=${encodeURIComponent(truncated)}`;
      const audio = new Audio(audioUrl);
      activeAudio = audio;

      if (options.rate && options.rate >= 0.5 && options.rate <= 2.0) {
        audio.playbackRate = options.rate;
      }

      audio.onplay = () => {
        options.onStart?.();
      };

      audio.onended = () => {
        activeAudio = null;
        options.onEnd?.();
      };

      audio.onerror = () => {
        activeAudio = null;
        options.onError?.('آواز چلانے میں مسئلہ پیش آیا۔ انٹرنیٹ کنکشن چیک کریں۔');
      };

      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch((err) => {
          activeAudio = null;
          options.onError?.(`آواز شروع نہیں ہو سکی: ${err?.message || 'Playback blocked'}`);
        });
      }
    } catch (err: any) {
      options.onError?.(`آواز کی خرابی: ${err?.message || 'Error'}`);
    }
  };

  // For Urdu and Punjabi, browser Web Speech engines rarely include native voices on Android/Windows/macOS.
  // Using Google TTS audio ensures flawless, natural-sounding Urdu and Punjabi pronunciation.
  if (language === 'Urdu' || language === 'Punjabi') {
    playViaAudioFallback();
    return;
  }

  // For other languages, attempt browser Web Speech API first
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();

      const utterance = new SpeechSynthesisUtterance(cleanText);
      activeUtterance = utterance;
      utterance.lang = bcp47;
      if (options.rate) utterance.rate = options.rate;
      if (options.pitch) utterance.pitch = options.pitch;

      const voices = window.speechSynthesis.getVoices();
      const matchingVoice = voices.find(
        (v) => v.lang === bcp47 || v.lang.startsWith(shortCode)
      );
      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      let hasStarted = false;

      utterance.onstart = () => {
        hasStarted = true;
        options.onStart?.();
      };

      utterance.onend = () => {
        activeUtterance = null;
        options.onEnd?.();
      };

      utterance.onerror = () => {
        activeUtterance = null;
        if (!hasStarted) {
          playViaAudioFallback();
        } else {
          options.onError?.('آواز کے دوران خرابی پیش آئی۔');
        }
      };

      // Slight timeout to circumvent Chromium's asynchronous cancel() flush bug
      setTimeout(() => {
        try {
          window.speechSynthesis.resume();
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          playViaAudioFallback();
        }
      }, 60);

      return;
    } catch (e) {
      playViaAudioFallback();
      return;
    }
  }

  playViaAudioFallback();
}
