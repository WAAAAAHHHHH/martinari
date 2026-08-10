import { createContext, useContext, useState, useCallback, useEffect, ReactNode, createElement } from 'react';
import { translations, type Locale, type TranslationKey } from './translations.js';

// ─── Locale detection ─────────────────────────────────────────────────────────

function detectLocale(): Locale {
  // 1. Check localStorage for user preference
  const saved = localStorage.getItem('martinari_locale');
  if (saved === 'en' || saved === 'tr') return saved;

  // 2. Detect from browser language
  const lang = navigator.language || '';
  if (lang.toLowerCase().startsWith('tr')) return 'tr';

  return 'en';
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface LocaleContextValue {
  locale: Locale;
  t: (key: TranslationKey) => string;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState<Locale>(detectLocale);

  const t = useCallback(
    (key: TranslationKey): string => translations[locale][key],
    [locale]
  );

  const toggleLocale = useCallback(() => {
    setLocale((prev) => {
      const next: Locale = prev === 'en' ? 'tr' : 'en';
      localStorage.setItem('martinari_locale', next);
      return next;
    });
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return createElement(LocaleContext.Provider, { value: { locale, t, toggleLocale } }, children);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error('useLocale must be used inside LocaleProvider');
  return ctx;
}
