
import React from 'react';
import { AlertTriangleIcon } from './Icons';
import { useTranslation } from '../i18n';

interface ErrorDisplayProps {
  message: string;
  onClear: () => void;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({ message, onClear }) => {
  const { t } = useTranslation();
  return (
    <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative flex items-start" role="alert">
      <AlertTriangleIcon className="w-5 h-5 mr-3 mt-1 flex-shrink-0 text-red-600" />
      <div>
        <strong className="font-bold">{t('errorTitle')}</strong>
        <span className="block sm:inline ml-2">{message}</span>
      </div>
       <button onClick={onClear} className="absolute top-0 bottom-0 right-0 px-4 py-3 text-red-600 hover:text-red-800" aria-label="Close">
          <span className="text-2xl" aria-hidden="true">&times;</span>
      </button>
    </div>
  );
};
