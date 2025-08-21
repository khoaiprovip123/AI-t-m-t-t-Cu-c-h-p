
import React, { useState, useCallback } from 'react';
import { UploadCloudIcon } from './Icons';
import { useTranslation } from '../i18n';

interface FileUploadProps {
  onFileSelect: (file: File) => void;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelect }) => {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useTranslation();

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>): void => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFileSelect(e.dataTransfer.files[0]);
    }
  }, [onFileSelect]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div
      className={`mt-8 border-2 border-dashed rounded-xl p-8 text-center transition-all duration-300
        ${isDragging ? 'border-sky-500 bg-sky-50' : 'border-slate-300 hover:border-sky-500 bg-white'}`}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <input
        type="file"
        id="file-upload"
        className="hidden"
        onChange={handleFileChange}
        accept="audio/*,video/mp4,video/x-m4v,video/quicktime,video/x-ms-wmv"
      />
      <label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
        <UploadCloudIcon className="w-16 h-16 text-slate-400 mb-4" />
        <p className="text-xl font-semibold text-slate-700">{t('dropzoneTitle')}</p>
        <p className="text-slate-500 mt-1">{t('or')}</p>
        <span className="mt-2 bg-sky-600 hover:bg-sky-500 text-white font-bold py-2 px-4 rounded-md">
          {t('selectFileButton')}
        </span>
        <p className="text-xs text-slate-400 mt-4">{t('supportedFormats')}</p>
      </label>
    </div>
  );
};
