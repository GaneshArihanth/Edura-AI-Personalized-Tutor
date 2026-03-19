import { useState, useEffect } from 'react';
import { useTranslatedText } from '@/hooks/useTranslation';
import { useThemeStore } from '@/store/themeStore';
import { AlertCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface TranslatedTextProps {
  text: string;
  showError?: boolean;
  className?: string;
}

/**
 * Enhanced TranslatedText component that shows errors for untranslated text
 */
export function TranslatedText({ text, className }: TranslatedTextProps) {
  const translated = useTranslatedText(text);
  return <span className={className}>{translated}</span>;
}


