import { useEffect } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { translateText } from '@/services/translateService';

/**
 * Translation Provider Component
 * Automatically translates page content when language changes
 */
export function TranslationProvider({ children }: { children: React.ReactNode }) {
  const { language } = useThemeStore();

  useEffect(() => {
    // Sync with Google Translate widget
    import('@/services/translateService').then(m => m.syncGoogleTranslate(language));
  }, [language]);

  return <>{children}</>;
}

/**
 * Helper function to translate text in components
 */
export async function translateContent(text: string, targetLang: string): Promise<string> {
  if (!text || targetLang === 'en') return text;
  return await translateText(text, targetLang);
}

