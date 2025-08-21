
import React from 'react';
import { LogoIcon } from './Icons';
import { useTranslation } from '../i18n';

interface HeaderProps {
    onReset: () => void;
    showReset: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onReset, showReset }) => {
  const { t, language, changeLanguage } = useTranslation();
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-10 border-b border-slate-200">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center space-x-3">
          <LogoIcon className="w-8 h-8 text-sky-500" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            {t('appTitle')}
          </h1>
        </div>
        <div className="flex items-center gap-4">
            <div className="flex items-center space-x-1 border border-slate-200 rounded-md p-0.5">
                <button
                    onClick={() => changeLanguage('vi')}
                    aria-pressed={language === 'vi'}
                    className={`px-2 py-1 rounded text-sm font-semibold transition-colors ${language === 'vi' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    VIE
                </button>
                <button
                    onClick={() => changeLanguage('en')}
                    aria-pressed={language === 'en'}
                    className={`px-2 py-1 rounded text-sm font-semibold transition-colors ${language === 'en' ? 'bg-sky-600 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    ENG
                </button>
            </div>
            {showReset && (
                <button 
                    onClick={onReset}
                    className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-md transition-colors"
                >
                    {t('startOver')}
                </button>
            )}
        </div>
      </div>
    </header>
  );
};
