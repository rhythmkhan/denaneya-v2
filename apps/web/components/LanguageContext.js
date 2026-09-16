'use client';
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.LanguageProvider = void 0;
exports.useLanguage = useLanguage;
const react_1 = __importStar(require("react"));
const dictionary_1 = require("../lib/dictionary");
const LanguageContext = (0, react_1.createContext)(undefined);
const LanguageProvider = ({ children }) => {
    const [language, setLanguageState] = (0, react_1.useState)('bn'); // Default Bengali for local audience
    const [mounted, setMounted] = (0, react_1.useState)(false);
    (0, react_1.useEffect)(() => {
        setMounted(true);
        const saved = localStorage.getItem('denaneya_lang');
        if (saved === 'en' || saved === 'bn') {
            setLanguageState(saved);
        }
    }, []);
    const setLanguage = (lang) => {
        setLanguageState(lang);
        if (typeof window !== 'undefined') {
            localStorage.setItem('denaneya_lang', lang);
        }
    };
    const toggleLanguage = () => {
        setLanguage(language === 'bn' ? 'en' : 'bn');
    };
    const t = dictionary_1.DICTIONARY[language];
    return (<LanguageContext.Provider value={{ language, setLanguage, toggleLanguage, t }}>
      <div className={language === 'bn' ? 'font-hind' : 'font-inter'}>
        {children}
      </div>
    </LanguageContext.Provider>);
};
exports.LanguageProvider = LanguageProvider;
function useLanguage() {
    const context = (0, react_1.useContext)(LanguageContext);
    if (!context) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
}
//# sourceMappingURL=LanguageContext.js.map