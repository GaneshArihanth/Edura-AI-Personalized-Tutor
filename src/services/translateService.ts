/**
 * Google Translate Widget Sync Service
 * Replaces old RapidAPI implementation
 */

/**
 * Sync the application's language state with the Google Translate Widget
 */
export function syncGoogleTranslate(langCode: string) {
  if (langCode === 'en') {
    try {
      const select = document.querySelector('select.goog-te-combo') as HTMLSelectElement;
      if (select) {
        // Try clearing value first (Standard Google Translate "Original")
        select.value = '';
        select.dispatchEvent(new Event('change'));

        // Secondary attempt: Explicitly select 'en' if it exists in the list
        setTimeout(() => {
          if (select.value !== '' && select.value !== 'en') {
            const hasEn = Array.from(select.options).some(opt => opt.value === 'en');
            if (hasEn) {
              select.value = 'en';
              select.dispatchEvent(new Event('change'));
            }
          }
        }, 100);

        console.log('Translation Service: Reset to Original (English)');
      }
    } catch { /* ignore */ }
    return;
  }

  // Map our internal codes to Google Translate codes if necessary
  const langMap: Record<string, string> = {
    'zh-Hans': 'zh-CN',
    'zh-Hant': 'zh-TW',
  };

  const targetCode = langMap[langCode] || langCode;

  try {
    const select = document.querySelector('select.goog-te-combo') as HTMLSelectElement;
    if (select) {
      if (select.value !== targetCode) {
        select.value = targetCode;
        select.dispatchEvent(new Event('change'));
        console.log(`Translation Service: Synced to ${targetCode}`);
      }
    } else {
      // Check if the script container even exists
      const container = document.getElementById('google_translate_element');
      if (!container) {
        console.error('Translation Service: #google_translate_element missing from body!');
        return;
      }

      // Still waiting for Google script to populate the container
      if (Math.random() < 0.1) { // Log less frequently to avoid flooding
        console.warn('Translation Service: Waiting for widget initialization...');
      }
      setTimeout(() => syncGoogleTranslate(langCode), 2000);
    }
  } catch (error) {
    console.error('Translation Service: Error syncing:', error);
  }
}

// Dummy functions to maintain compatibility with existing components
export async function translateText(text: string, _lang: string): Promise<string> {
  return text; // Google Translate handles DOM automatically
}

export async function translateBatch(texts: string[], _lang: string): Promise<string[]> {
  return texts;
}

export async function detectLanguage(_text: string): Promise<string> {
  return 'en';
}

export async function getSupportedLanguages() {
  return SUPPORTED_LANGUAGES;
}

export function clearTranslationCache() { }
export function getCacheStats() { return { size: 0, keys: [] }; }

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'ta', name: 'Tamil (தமிழ்)' },
  { code: 'te', name: 'Telugu (తెలుగు)' },
  { code: 'hi', name: 'Hindi (हिन्दी)' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'zh-Hans', name: 'Chinese (Simplified)' },
  { code: 'zh-Hant', name: 'Chinese (Traditional)' },
  { code: 'ar', name: 'Arabic' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'tr', name: 'Turkish' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
  { code: 'cs', name: 'Czech' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'no', name: 'Norwegian' },
  { code: 'he', name: 'Hebrew' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'bg', name: 'Bulgarian' },
  { code: 'hr', name: 'Croatian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovenian' },
  { code: 'el', name: 'Greek' },
  { code: 'hu', name: 'Hungarian' },
];
