/**
 * Camera, Image and File Picker Module for Mobile and Desktop
 * Enables taking a photo with camera or picking photos/files from phone storage
 */

export interface FilePickerCallbacks {
  onSelected: (file: File) => void;
  onError?: (errorMessage: string) => void;
}

/**
 * Open camera or image picker.
 * On mobile devices (Android/iOS), accept="image/*" without capture allows the user
 * to choose either taking a photo directly with the Camera OR selecting an existing picture from Gallery/Files.
 */
export function openImagePicker(callbacks: FilePickerCallbacks): void {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        callbacks.onError?.('براہِ کرم صرف تصویر (Image) کا انتخاب کریں۔');
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        callbacks.onError?.('تصویر کا سائز 10MB سے زیادہ ہے۔ براہِ کرم چھوٹی تصویر منتخب کریں۔');
        return;
      }

      callbacks.onSelected(file);
      input.remove();
    };

    input.onerror = () => {
      callbacks.onError?.('تصویر منتخب کرنے میں خرابی پیش آگئی۔');
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  } catch (err: any) {
    callbacks.onError?.(`کیمرہ یا فائل کھولنے میں خرابی: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Open generic file picker for documents, text files, or images.
 */
export function openDocumentOrFilePicker(callbacks: FilePickerCallbacks): void {
  try {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*,text/*,.txt,.json,.csv,.doc,.docx,.pdf';
    input.style.display = 'none';

    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement;
      const file = target.files?.[0];
      if (!file) return;

      if (file.size > 15 * 1024 * 1024) {
        callbacks.onError?.('فائل کا سائز 15MB سے زیادہ ہے۔');
        return;
      }

      callbacks.onSelected(file);
      input.remove();
    };

    input.onerror = () => {
      callbacks.onError?.('فائل منتخب کرنے میں خرابی پیش آگئی۔');
      input.remove();
    };

    document.body.appendChild(input);
    input.click();
  } catch (err: any) {
    callbacks.onError?.(`فائل کھولنے میں خرابی: ${err?.message || 'Unknown error'}`);
  }
}

/**
 * Helper to convert an image file to Base64 string for Gemini API
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      } else {
        reject(new Error('Failed to read file as base64 string'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

/**
 * Helper to read text from a text/code file
 */
export function fileToText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as text'));
      }
    };
    reader.onerror = () => reject(reader.error || new Error('FileReader error'));
    reader.readAsText(file);
  });
}
