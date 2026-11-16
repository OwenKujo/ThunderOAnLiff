import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { translate, type AppLanguage } from '@thunder/shared';

interface LanguageContextValue {
  language: AppLanguage;
  setLanguage: (language: AppLanguage) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

function getInitialLanguage(): AppLanguage {
  const saved = localStorage.getItem('thunder.language');
  return saved === 'en' || saved === 'th' ? saved : 'th';
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AppLanguage>(getInitialLanguage);
  useEffect(() => { document.documentElement.lang = language; }, [language]);
  const setLanguage = (next: AppLanguage) => {
    localStorage.setItem('thunder.language', next);
    setLanguageState(next);
  };
  return <LanguageContext.Provider value={{ language, setLanguage, t: (key) => translate(language, key) }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used within LanguageProvider.');
  return context;
}

export function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const next = language === 'th' ? 'en' : 'th';
  return <button className="language-switcher" type="button" onClick={() => setLanguage(next)} aria-label={language === 'th' ? 'เปลี่ยนภาษาเป็นอังกฤษ' : 'Switch language to Thai'} title={language === 'th' ? 'เปลี่ยนภาษาเป็นอังกฤษ' : 'Switch language to Thai'}>{language === 'th' ? 'EN' : 'ไทย'}</button>;
}
