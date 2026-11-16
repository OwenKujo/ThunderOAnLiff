import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, type AppLanguage } from '../../../packages/shared/src/language';

const LanguageContext = createContext<{ language: AppLanguage; t: (key: string) => string; toggle: () => void } | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<AppLanguage>(() => {
    const saved = localStorage.getItem('thunder.language');
    return saved === 'en' || saved === 'th' ? saved : 'th';
  });
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const toggle = () => {
    const next = language === 'th' ? 'en' : 'th';
    localStorage.setItem('thunder.language', next);
    setLanguage(next);
  };
  return <LanguageContext.Provider value={{ language, t: (key) => translate(language, key), toggle }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider.');
  return context;
}

export function LanguageSwitcher() {
  const { language, toggle } = useLanguage();
  return <button type="button" className="language-switcher" onClick={toggle} aria-label={language === 'th' ? 'เปลี่ยนภาษาเป็นอังกฤษ' : 'Switch language to Thai'}>{language === 'th' ? 'EN' : 'ไทย'}</button>;
}
