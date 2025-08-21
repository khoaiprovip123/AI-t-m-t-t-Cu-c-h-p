
import React, { useState, useCallback, useEffect } from 'react';
import { FileUpload } from './components/FileUpload';
import { Loader } from './components/Loader';
import { AnalysisView } from './components/AnalysisView';
import { geminiService } from './services/geminiService';
import type { AnalysisResult, TranscriptSegment } from './types';
import { Header } from './components/Header';
import { ErrorDisplay } from './components/ErrorDisplay';
import { WelcomeScreen } from './components/WelcomeScreen';
import { useTranslation } from './i18n';

export default function App(): React.ReactNode {
  const [file, setFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[] | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [analysisHint, setAnalysisHint] = useState<string>('');
  const { t, language } = useTranslation();

  useEffect(() => {
    // Clean up the object URL when the component unmounts or the URL changes.
    return () => {
        if (audioUrl) {
            URL.revokeObjectURL(audioUrl);
        }
    };
  }, [audioUrl]);

  const handleFileSelect = (selectedFile: File): void => {
    // Max file size: 200MB
    if (selectedFile.size > 200 * 1024 * 1024) {
      setError(t('fileTooLargeError'));
      return;
    }
    setError(null);
    setFile(selectedFile);
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(URL.createObjectURL(selectedFile));
    setTranscript(null);
    setAnalysisResult(null);
  };

  const handleTranscribe = useCallback(async () => {
    if (!file) return;

    setIsLoading(true);
    setLoadingMessage(t('loadingPrepareFile'));
    setError(null);

    const onProgress = (progress: { chunk: number, totalChunks: number }) => {
        setLoadingMessage(t('loadingTranscribingChunk', { 
            chunk: String(progress.chunk), 
            total: String(progress.totalChunks) 
        }));
    };

    try {
      const result = await geminiService.transcribeAudio(file, language, onProgress);
      
      if (!Array.isArray(result) || result.length === 0) {
          setError(t('transcriptionEmptyError'));
          setIsLoading(false);
          return;
      }

      setTranscript(result);
      setIsLoading(false);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('transcriptionGenericError'));
      setIsLoading(false);
    }
  }, [file, t, language]);


  const handleAnalyze = useCallback(async () => {
    if (!transcript) return;
    
    setIsLoading(true);
    setLoadingMessage(t('loadingAnalyzing'));
    setError(null);

    const fullTranscriptText = transcript.map(segment => segment.text).join('\n');

    try {
      const result = await geminiService.analyzeTranscript(fullTranscriptText, language, analysisHint);
      setAnalysisResult(result);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : t('analysisGenericError'));
    } finally {
      setIsLoading(false);
    }
  }, [transcript, t, language, analysisHint]);

  const handleReset = (): void => {
    setFile(null);
    setTranscript(null);
    setAnalysisResult(null);
    setError(null);
    setIsLoading(false);
    setAnalysisHint('');
    if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
    }
    setAudioUrl(null);
  };

  const renderContent = () => {
    if (!file) {
      return (
        <>
          <FileUpload onFileSelect={handleFileSelect} />
          <WelcomeScreen />
        </>
      );
    }
    
    if (!transcript) {
      return (
        <div className="text-center bg-white border border-slate-200 p-8 rounded-lg shadow-xl">
            <h2 className="text-2xl font-bold text-sky-600 mb-4">{t('readyTitle')}</h2>
            <p className="text-slate-500 mb-2">{t('uploadedFile')} <span className="font-semibold text-slate-700">{file.name}</span></p>
            {file.type.startsWith('video/') && (
                <p className="text-sm text-slate-400 mb-6 italic">{t('videoNote')}</p>
            )}
            <button
                onClick={handleTranscribe}
                className="bg-sky-600 hover:bg-sky-500 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg"
            >
                {t('startTranscriptionButton')}
            </button>
            <button
                onClick={handleReset}
                className="ml-4 text-slate-500 hover:text-slate-800"
            >
                {t('chooseAnotherFile')}
            </button>
        </div>
      );
    }

    return (
      <AnalysisView 
        transcript={transcript}
        setTranscript={setTranscript}
        result={analysisResult} 
        onAnalyze={handleAnalyze}
        audioUrl={audioUrl}
        audioFile={file}
        analysisHint={analysisHint}
        setAnalysisHint={setAnalysisHint}
      />
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
      <Header onReset={handleReset} showReset={!!file} />
      <main className="container mx-auto px-4 py-8">
        {isLoading && <Loader message={loadingMessage} />}

        {!isLoading && error && <ErrorDisplay message={error} onClear={() => setError(null)} />}
        
        {!isLoading && !error && (
          <div className="max-w-4xl mx-auto">
            {renderContent()}
          </div>
        )}
      </main>
    </div>
  );
}
