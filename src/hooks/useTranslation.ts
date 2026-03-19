import { useState, useEffect, useCallback } from 'react';
import { useThemeStore } from '@/store/themeStore';
import { translateText, translateBatch } from '@/services/translateService';

/**
 * Hook for translating text based on current language setting
 */
export function useTranslation() {
  const { language } = useThemeStore();
  const t = useCallback(async (text: string) => text, []);
  const translateMultiple = useCallback(async (texts: string[]) => texts, []);
  return { t, translateMultiple, isTranslating: false, currentLanguage: language };
}

export function useTranslatedText(originalText: string): string {
  return originalText;
}


