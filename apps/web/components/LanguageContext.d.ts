import React from 'react';
import { Dictionary, Language } from '../lib/dictionary';
interface LanguageContextType {
    language: Language;
    setLanguage: (lang: Language) => void;
    toggleLanguage: () => void;
    t: Dictionary;
}
export declare const LanguageProvider: React.FC<{
    children: React.ReactNode;
}>;
export declare function useLanguage(): LanguageContextType;
export {};
//# sourceMappingURL=LanguageContext.d.ts.map