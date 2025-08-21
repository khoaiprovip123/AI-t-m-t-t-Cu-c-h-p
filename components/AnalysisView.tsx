
import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { AnalysisResult, TranscriptSegment } from '../types';
import { ClipboardIcon, CheckIcon, TagIcon } from './Icons';
import { useTranslation } from '../i18n';

import { Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell, WidthType, AlignmentType, PageBreak } from 'docx';
import saveAs from 'file-saver';
import * as XLSX from 'xlsx';


interface AnalysisViewProps {
  transcript: TranscriptSegment[];
  setTranscript: React.Dispatch<React.SetStateAction<TranscriptSegment[] | null>>;
  result: AnalysisResult | null;
  onAnalyze: () => Promise<void>;
  audioUrl: string | null;
  audioFile: File | null;
  analysisHint: string;
  setAnalysisHint: React.Dispatch<React.SetStateAction<string>>;
}

const timeStringToSeconds = (time: string): number => {
    if (!time || typeof time !== 'string') return 0;
    const timeParts = time.split(':');
    if (timeParts.length > 0 && timeParts.every(p => !isNaN(parseFloat(p)))) {
        return timeParts
            .map(p => parseFloat(p))
            .reverse()
            .reduce((acc, part, index) => acc + part * Math.pow(60, index), 0);
    }
    console.warn(`Could not parse time string: ${time}`);
    return 0; // Fallback
};

const secondsToTimestamp = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) {
        return "00:00:00";
    }
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

const formatTimestamp = (time: string): string => {
    const segmentSeconds = timeStringToSeconds(time);
    return secondsToTimestamp(segmentSeconds);
};

const ReportSection: React.FC<{ title: string; children: React.ReactNode; }> = ({ title, children }) => {
    return (
        <section>
            <h3 className="text-xl font-bold text-sky-600 mb-4 pb-2 border-b-2 border-slate-200">{title}</h3>
            <div className="prose max-w-none text-slate-700 prose-p:my-1 prose-li:my-1 prose-ul:my-2 prose-table:my-2">{children}</div>
        </section>
    );
};

const ReportTabsView: React.FC<{ result: AnalysisResult }> = ({ result }) => {
    const [activeTab, setActiveTab] = useState('overview');
    const { t } = useTranslation();

    const renderMarkdown = (text: string) => {
        if (!text || typeof text !== 'string') {
            return <p className="text-slate-500">{t('noContent')}</p>;
        }
        const lines = text.split('\n').filter(p => p.trim() !== '');
        const elements: React.ReactNode[] = [];
        let currentListItems: React.ReactNode[] = [];
        const flushList = () => {
            if (currentListItems.length > 0) {
                elements.push(<ul key={`ul-${elements.length}`} className="list-disc list-inside space-y-2 my-3 pl-4">{currentListItems}</ul>);
                currentListItems = [];
            }
        };
        lines.forEach((line, index) => {
            if (line.startsWith('## ')) {
                flushList();
                elements.push(<h4 key={index} className="text-lg font-semibold text-sky-700 mt-4 mb-2">{line.substring(3)}</h4>);
            } else if (line.startsWith('* ')) {
                currentListItems.push(<li key={index}>{line.substring(2)}</li>);
            } else {
                flushList();
                elements.push(<p key={index} className="leading-relaxed my-3">{line}</p>);
            }
        });
        flushList();
        return elements.length > 0 ? <>{elements}</> : <p className="text-slate-500">{t('noContentToShow')}</p>;
    };

    const tabs = useMemo(() => [
        {
            id: 'overview',
            label: t('tabOverview'),
            hasData: true,
            content: (
                 <ReportSection title={t('overviewSectionTitle')}>
                    <div>
                        <p className="font-bold text-slate-800">{t('overviewInfoTitle')}</p>
                        <div className="pl-4 border-l-2 border-slate-200 my-2 text-slate-700 space-y-1">
                            <p><strong>{t('topic')}:</strong> {result.overview.topic}</p>
                            <p><strong>{t('dateTime')}:</strong> {result.overview.dateTime}</p>
                            <p><strong>{t('location')}:</strong> {result.overview.location}</p>
                            <p><strong>{t('attendees')}:</strong> {result.overview.attendees.join(', ')}</p>
                        </div>

                        {result.mainObjectives.length > 0 && (
                            <>
                                <p className="font-bold text-slate-800 mt-4">{t('mainObjectivesTitle')}</p>
                                 <div className="pl-4 border-l-2 border-slate-200 my-2">
                                    <ul className="list-disc list-inside space-y-1">
                                        {result.mainObjectives.map((item, index) => <li key={index}>{item}</li>)}
                                    </ul>
                                </div>
                            </>
                        )}
                    </div>
                </ReportSection>
            )
        },
        {
            id: 'summary',
            label: t('tabSummary'),
            hasData: !!result.discussionSummary,
            content: (
                <ReportSection title={t('summarySectionTitle')}>
                    {renderMarkdown(result.discussionSummary)}
                </ReportSection>
            )
        },
        {
            id: 'decisions',
            label: t('tabDecisions'),
            hasData: result.decisions.length > 0,
            content: (
                <ReportSection title={t('decisionsSectionTitle')}>
                    <ul className="list-disc list-inside space-y-2">
                        {result.decisions.map((item, index) => <li key={index}>{item.decision}</li>)}
                    </ul>
                </ReportSection>
            )
        },
        {
            id: 'actionItems',
            label: t('tabActionItems'),
            hasData: result.actionItems.length > 0,
            content: (
                <ReportSection title={t('actionItemsSectionTitle')}>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse font-sans text-sm">
                            <thead className="border-b border-slate-300">
                                <tr>
                                    <th className="p-2 bg-slate-50 font-semibold text-slate-700">{t('actionItemsTableHeaderTask')}</th>
                                    <th className="p-2 bg-slate-50 font-semibold text-slate-700">{t('actionItemsTableHeaderOwner')}</th>
                                    <th className="p-2 bg-slate-50 font-semibold text-slate-700">{t('actionItemsTableHeaderCollaborators')}</th>
                                    <th className="p-2 bg-slate-50 font-semibold text-slate-700">{t('actionItemsTableHeaderDeadline')}</th>
                                    <th className="p-2 bg-slate-50 font-semibold text-slate-700">{t('actionItemsTableHeaderNotes')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {result.actionItems.map((item, index) => (
                                    <tr key={index} className="border-b border-slate-200">
                                        <td className="p-2 align-top">{item.task}</td>
                                        <td className="p-2 align-top">{item.owner}</td>
                                        <td className="p-2 align-top">{item.collaborators}</td>
                                        <td className="p-2 align-top">{item.deadline}</td>
                                        <td className="p-2 align-top">{item.notes}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </ReportSection>
            )
        },
        {
            id: 'pendingIssues',
            label: t('tabPendingIssues'),
            hasData: result.pendingIssues.length > 0,
            content: (
                 <ReportSection title={t('pendingIssuesSectionTitle')}>
                    <ul className="list-disc list-inside space-y-2">
                        {result.pendingIssues.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </ReportSection>
            )
        },
        {
            id: 'notesAndReferences',
            label: t('tabNotes'),
            hasData: result.notesAndReferences.length > 0,
            content: (
                <ReportSection title={t('notesSectionTitle')}>
                    <ul className="list-disc list-inside space-y-2">
                        {result.notesAndReferences.map((item, index) => <li key={index}>{item}</li>)}
                    </ul>
                </ReportSection>
            )
        },
    ], [result, t]);

    return (
        <div>
            <h2 className="text-3xl font-bold text-center text-slate-800 mb-2">{t('meetingMinutesTitle')}</h2>
            <p className="text-center text-slate-500 mb-8">{result.overview.topic}</p>
            
            <div className="border-b border-slate-200 mb-6">
                <nav className="-mb-px flex space-x-6 overflow-x-auto" aria-label="Tabs">
                    {tabs.filter(t => t.hasData).map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm
                                ${activeTab === tab.id
                                    ? 'border-sky-500 text-sky-600'
                                    : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6">
                {tabs.find(tab => tab.id === activeTab)?.content}
            </div>
        </div>
    );
};


const TranscriptViewEditor: React.FC<Pick<AnalysisViewProps, 'transcript' | 'setTranscript' | 'onAnalyze' | 'audioUrl' | 'audioFile' | 'result' | 'analysisHint' | 'setAnalysisHint'>> = ({ transcript, setTranscript, onAnalyze, audioUrl, audioFile, result, analysisHint, setAnalysisHint }) => {
  const [copied, setCopied] = useState(false);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState<number | null>(null);
  const { t } = useTranslation();

  const audioRef = useRef<HTMLAudioElement>(null);
  const segmentRefs = useRef<(HTMLDivElement | null)[]>([]);
  const transcriptContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    segmentRefs.current = segmentRefs.current.slice(0, transcript.length);
  }, [transcript]);

  useEffect(() => {
    if (activeSegmentIndex !== null && segmentRefs.current[activeSegmentIndex]) {
        setTimeout(() => {
            segmentRefs.current[activeSegmentIndex]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
    }
  }, [activeSegmentIndex]);

  const transcriptTimeInSeconds = useMemo(() => transcript.map(segment => timeStringToSeconds(segment.startTime)), [transcript]);

  const handleSpeakerChange = (index: number, newSpeaker: string) => {
    const newTranscript = [...transcript];
    newTranscript[index] = { ...newTranscript[index], speaker: newSpeaker };
    setTranscript(newTranscript);
  };

  const handleTranscriptChange = (index: number, newText: string) => {
    const newTranscript = [...transcript];
    newTranscript[index] = { ...newTranscript[index], text: newText };
    setTranscript(newTranscript);
  };

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLAudioElement>) => {
    const currentTime = e.currentTarget.currentTime;
    let newActiveIndex: number | null = null;
    for (let i = transcriptTimeInSeconds.length - 1; i >= 0; i--) {
        if (currentTime >= transcriptTimeInSeconds[i]) {
            newActiveIndex = i;
            break;
        }
    }
    if (newActiveIndex !== activeSegmentIndex) {
      setActiveSegmentIndex(newActiveIndex);
    }
  };
  
  const handleSegmentClick = (startTime: string) => {
    if (audioRef.current) {
        audioRef.current.currentTime = timeStringToSeconds(startTime);
        if (audioRef.current.paused) {
            audioRef.current.play().catch(console.error);
        }
    }
  };
  
  const handleCopyToClipboard = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatTranscriptForCopy = (segments: TranscriptSegment[]): string => {
    return segments.map(seg => `${seg.speaker ? `[${seg.speaker}] ` : ''}[${formatTimestamp(seg.startTime)}] ${seg.text}`).join('\n');
  };

  return (
    <div>
      <div className="sticky top-[65px] z-10 bg-white pb-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold text-sky-600">{result ? t('transcriptTitle') : t('editTranscriptTitle')}</h2>
          <button onClick={() => handleCopyToClipboard(formatTranscriptForCopy(transcript))} className="flex items-center text-sm text-slate-500 hover:text-sky-600">
            {copied ? <CheckIcon className="w-4 h-4 mr-1 text-green-500"/> : <ClipboardIcon className="w-4 h-4 mr-1"/>}
            {copied ? t('copied') : t('copy')}
          </button>
        </div>
        {audioUrl && audioFile && (
          <div>
              <audio ref={audioRef} controls className="w-full h-10 accent-sky-500" onTimeUpdate={handleTimeUpdate}>
                  <source src={audioUrl} type={audioFile.type} />
                  {t('audioNotSupported')}
              </audio>
          </div>
        )}
      </div>

      <div ref={transcriptContainerRef} className="bg-slate-100 p-2 rounded-lg space-y-1">
        {transcript.map((segment, index) => (
            <div key={index} ref={el => { segmentRefs.current[index] = el; }}
                 className={`p-3 rounded-md transition-colors duration-200 ${activeSegmentIndex === index ? 'bg-sky-100' : 'hover:bg-slate-200/70'}`}>
                <div className="flex items-center gap-2 mb-2">
                    <TagIcon className="w-4 h-4 text-slate-500 flex-shrink-0" />
                    <input
                        type="text"
                        value={segment.speaker || ''}
                        onChange={(e) => handleSpeakerChange(index, e.target.value)}
                        placeholder={t('speakerPlaceholder')}
                        aria-label={`${t('speakerLabel')} ${index + 1}`}
                        className="text-sm font-semibold bg-transparent border-0 rounded-md p-0 focus:ring-1 focus:ring-sky-500 w-28 text-slate-700"
                    />
                    <span onClick={() => handleSegmentClick(segment.startTime)} className="text-sm font-mono text-slate-500 cursor-pointer hover:text-sky-600">
                        {formatTimestamp(segment.startTime)}
                    </span>
                </div>
              <textarea value={segment.text} onChange={(e) => handleTranscriptChange(index, e.target.value)}
                        onInput={(e) => {
                          const target = e.target as HTMLTextAreaElement;
                          target.style.height = 'auto';
                          target.style.height = `${target.scrollHeight}px`;
                        }}
                        aria-label={`Transcript segment ${index + 1}`}
                        className="w-full bg-transparent border-0 rounded-md resize-none leading-relaxed focus:ring-1 focus:ring-sky-500 p-0 text-slate-800 focus:bg-white/50"
                        rows={1} />
            </div>
        ))}
      </div>
      
      <div className="mt-6 border-t border-slate-200 -mx-6 -mb-6">
          <div className="p-6">
              <label htmlFor="analysis-hint" className="text-lg font-semibold text-slate-800">{t('analysisHintLabel')}</label>
              <p className="mt-1 text-sm text-slate-500">{t('analysisHintDescription')}</p>
              <textarea
                  id="analysis-hint"
                  rows={3}
                  className="mt-3 block w-full rounded-md border-slate-300 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm"
                  placeholder={t('analysisHintPlaceholder')}
                  value={analysisHint}
                  onChange={(e) => setAnalysisHint(e.target.value)}
                  aria-label={t('analysisHintLabel')}
              />
          </div>
          <div className="p-6 bg-slate-50 text-center rounded-b-xl">
              <h3 className="text-lg font-semibold text-slate-800">{result ? t('finishEditingTitleImprove') : t('finishEditingTitle')}</h3>
              <p className="text-slate-500 mt-1 mb-4">{result ? t('finishEditingDescriptionImprove') : t('finishEditingDescription')}</p>
              <button onClick={onAnalyze} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-3 px-8 rounded-lg transition-transform transform hover:scale-105 shadow-lg">
                  {result ? t('reanalyzeButton') : t('saveAndAnalyzeButton')}
              </button>
          </div>
      </div>
    </div>
  );
};


export const AnalysisView: React.FC<AnalysisViewProps> = (props) => {
  const { result, transcript, audioFile } = props;
  const { t, language } = useTranslation();
  const [viewMode, setViewMode] = useState<'transcript' | 'report'>('transcript');
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (result) {
      setViewMode('report');
    } else {
      setViewMode('transcript');
    }
  }, [result]);

  const sanitizeFileName = (name: string): string => {
    if (!name) return "analysis_export";
    return name.replace(/\.[^/.]+$/, "").replace(/[^a-z0-9_-]/gi, '_').trim();
  }

  const handleExport = async (format: 'docx' | 'xlsx') => {
    if (!result) return;
    setIsExporting(true);
    const fileName = sanitizeFileName(audioFile?.name || 'analysis_export');

    await new Promise(resolve => setTimeout(resolve, 50));

    try {
        if (format === 'docx') {
            await exportDocx(fileName, result, transcript);
        } else {
            await exportXlsx(fileName, result, transcript);
        }
    } catch (error) {
        console.error(`Failed to export as ${format}:`, error);
        alert(t('exportError', {format}));
    } finally {
        setIsExporting(false);
    }
  };

    const exportDocx = async (fileName: string, result: AnalysisResult, transcript: TranscriptSegment[]) => {
        const docTitle = (language === 'vi' ? 'BIÊN BẢN CUỘC HỌP' : 'MEETING MINUTES');
        const docCreator = (language === 'vi' ? 'Trợ lý Họp AI' : 'AI Meeting Assistant');
        const docDesc = (language === 'vi' ? `Biên bản được tạo tự động cho cuộc họp ngày ${result.overview.dateTime}` : `Automatically generated minutes for the meeting on ${result.overview.dateTime}`);
        const docTopic = (language === 'vi' ? `Biên bản họp - ${result.overview.topic}` : `Meeting Minutes - ${result.overview.topic}`);
        
        const docChildren: any[] = [];
        docChildren.push(new Paragraph({ text: docTitle, heading: HeadingLevel.TITLE, alignment: AlignmentType.CENTER, spacing: { after: 400 } }));

        docChildren.push(new Paragraph({ text: t('tabOverview'), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
        docChildren.push(new Paragraph({ text: t('overviewInfoTitle'), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
        docChildren.push(new Paragraph({ children: [new TextRun({ text: `${t('topic')}: `, bold: true }), new TextRun(result.overview.topic)] }));
        docChildren.push(new Paragraph({ children: [new TextRun({ text: `${t('dateTime')}: `, bold: true }), new TextRun(result.overview.dateTime)] }));
        docChildren.push(new Paragraph({ children: [new TextRun({ text: `${t('location')}: `, bold: true }), new TextRun(result.overview.location)] }));
        docChildren.push(new Paragraph({ children: [new TextRun({ text: `${t('attendees')}: `, bold: true }), new TextRun(result.overview.attendees.join(', '))] }));

        if (result.mainObjectives?.length > 0) {
            docChildren.push(new Paragraph({ text: t('mainObjectivesTitle'), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
            result.mainObjectives.forEach(o => docChildren.push(new Paragraph({ text: o, bullet: { level: 0 } })));
        }

        if (result.discussionSummary) {
            docChildren.push(new Paragraph({ text: t('summarySectionTitle'), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
            result.discussionSummary.split('\n').filter(line => line.trim()).forEach(line => {
                if (line.startsWith('## ')) {
                    docChildren.push(new Paragraph({ text: line.substring(3), heading: HeadingLevel.HEADING_2, spacing: { before: 200, after: 100 } }));
                } else if (line.startsWith('* ')) {
                    docChildren.push(new Paragraph({ text: line.substring(2), bullet: { level: 0 } }));
                } else {
                    docChildren.push(new Paragraph(line));
                }
            });
        }

        if (result.decisions?.length > 0) {
            docChildren.push(new Paragraph({ text: t('decisionsSectionTitle'), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
            result.decisions.forEach(d => docChildren.push(new Paragraph({ text: d.decision, bullet: { level: 0 } })));
        }

        if (result.actionItems?.length > 0) {
            docChildren.push(new Paragraph({ text: t('actionItemsSectionTitle'), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
            docChildren.push(new Table({
                width: { size: 100, type: WidthType.PERCENTAGE },
                rows: [
                    new TableRow({
                        tableHeader: true,
                        children: [
                            new TableCell({ width: { size: 35, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: t('actionItemsTableHeaderTask'), bold: true })] })] }),
                            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: t('actionItemsTableHeaderOwner'), bold: true })] })] }),
                            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: t('actionItemsTableHeaderCollaborators'), bold: true })] })] }),
                            new TableCell({ width: { size: 15, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: t('actionItemsTableHeaderDeadline'), bold: true })] })] }),
                            new TableCell({ width: { size: 20, type: WidthType.PERCENTAGE }, children: [new Paragraph({ children: [new TextRun({ text: t('actionItemsTableHeaderNotes'), bold: true })] })] }),
                        ],
                    }),
                    ...result.actionItems.map((item) => new TableRow({
                        children: [
                            new TableCell({ children: [new Paragraph(item.task)] }),
                            new TableCell({ children: [new Paragraph(item.owner || '')] }),
                            new TableCell({ children: [new Paragraph(item.collaborators || '')] }),
                            new TableCell({ children: [new Paragraph(item.deadline || '')] }),
                            new TableCell({ children: [new Paragraph(item.notes || '')] }),
                        ]
                    }))
                ]
            }));
        }

        if (result.pendingIssues?.length > 0) {
            docChildren.push(new Paragraph({ text: t('pendingIssuesSectionTitle'), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
            result.pendingIssues.forEach(i => docChildren.push(new Paragraph({ text: i, bullet: { level: 0 } })));
        }

        if (result.notesAndReferences?.length > 0) {
            docChildren.push(new Paragraph({ text: t('notesSectionTitle'), heading: HeadingLevel.HEADING_1, spacing: { before: 300, after: 200 } }));
            result.notesAndReferences.forEach(n => docChildren.push(new Paragraph({ text: n, bullet: { level: 0 } })));
        }

        const appendixTitle = language === 'vi' ? 'Phụ lục: Nội dung chi tiết cuộc họp' : 'Appendix: Full Meeting Transcript';
        docChildren.push(new Paragraph({ text: appendixTitle, heading: HeadingLevel.HEADING_1, pageBreakBefore: true, spacing: { before: 300, after: 200 } }));
        transcript.forEach(t => docChildren.push(new Paragraph({
            children: [
                new TextRun({ text: `${t.speaker ? `[${t.speaker}] ` : ''}[${formatTimestamp(t.startTime)}] `, bold: true }),
                new TextRun(t.text)
            ]
        })));

        const doc = new Document({
            creator: docCreator,
            title: docTopic,
            description: docDesc,
            sections: [{ children: docChildren }]
        });
        const blob = await Packer.toBlob(doc);
        saveAs(blob, `${fileName}.docx`);
    };

    const exportXlsx = async (fileName: string, result: AnalysisResult, transcript: TranscriptSegment[]) => {
        const wb = XLSX.utils.book_new();
        const overview_data = [
            { [t('topic')]: result.overview.topic },
            { [t('dateTime')]: result.overview.dateTime },
            { [t('location')]: result.overview.location },
            { [t('attendees')]: result.overview.attendees.join(', ') }
        ];
        const overview_ws = XLSX.utils.json_to_sheet(overview_data, {skipHeader: true});
        XLSX.utils.book_append_sheet(wb, overview_ws, t('tabOverview').substring(3).trim());

        if (result.mainObjectives?.length > 0) {
            const objectives_ws = XLSX.utils.json_to_sheet(result.mainObjectives.map(o => ({[t('mainObjectivesTitle')]: o})));
            XLSX.utils.book_append_sheet(wb, objectives_ws, t('mainObjectivesTitle').substring(0,20));
        }
        if (result.discussionSummary) {
            const summary_ws = XLSX.utils.json_to_sheet([{ [t('summarySectionTitle')]: result.discussionSummary.replace(/## /g, '').replace(/\* /g, '  - ') }]);
            XLSX.utils.book_append_sheet(wb, summary_ws, t('tabSummary').substring(3).trim());
        }
        if (result.decisions?.length > 0) {
            const decisions_ws = XLSX.utils.json_to_sheet(result.decisions.map(d => ({[t('decisionsSectionTitle')]: d.decision})));
            XLSX.utils.book_append_sheet(wb, decisions_ws, t('tabDecisions').substring(3).trim());
        }
        if (result.actionItems?.length > 0) {
            const actionItems_ws_data = result.actionItems.map(item => ({
                [t('actionItemsTableHeaderTask')]: item.task,
                [t('actionItemsTableHeaderOwner')]: item.owner,
                [t('actionItemsTableHeaderCollaborators')]: item.collaborators,
                [t('actionItemsTableHeaderDeadline')]: item.deadline,
                [t('actionItemsTableHeaderNotes')]: item.notes
            }));
            const actionItems_ws = XLSX.utils.json_to_sheet(actionItems_ws_data);
            XLSX.utils.book_append_sheet(wb, actionItems_ws, t('tabActionItems').substring(3).trim());
        }
        if (result.pendingIssues?.length > 0) {
            const pending_ws = XLSX.utils.json_to_sheet(result.pendingIssues.map(i => ({[t('pendingIssuesSectionTitle')]: i})));
            XLSX.utils.book_append_sheet(wb, pending_ws, t('tabPendingIssues').substring(3).trim());
        }
        if (result.notesAndReferences?.length > 0) {
            const notes_ws = XLSX.utils.json_to_sheet(result.notesAndReferences.map(n => ({[t('notesSectionTitle')]: n})));
            XLSX.utils.book_append_sheet(wb, notes_ws, t('tabNotes').substring(3).trim());
        }
        const transcriptTitle = language === 'vi' ? 'Nội dung chi tiết' : 'Transcript';
        const speakerTitle = language === 'vi' ? 'Người nói' : 'Speaker';
        const timeTitle = language === 'vi' ? 'Thời gian' : 'Time';
        const contentTitle = language === 'vi' ? 'Nội dung' : 'Content';
        const transcript_ws = XLSX.utils.json_to_sheet(transcript.map(t => ({ [speakerTitle]: t.speaker, [timeTitle]: formatTimestamp(t.startTime), [contentTitle]: t.text })));
        XLSX.utils.book_append_sheet(wb, transcript_ws, transcriptTitle);
        XLSX.writeFile(wb, `${fileName}.xlsx`);
    };

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg">
        {result && (
            <div className="p-4 border-b border-slate-200 bg-slate-50/80 backdrop-blur-sm sticky top-[65px] z-20">
                <div className="flex justify-between items-center">
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                        <h3 className="text-lg font-semibold text-slate-700">{t('reportTitle')}</h3>
                        <button onClick={() => handleExport('docx')} disabled={isExporting} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-slate-400 disabled:cursor-wait text-sm">
                            {isExporting ? t('exporting') : t('downloadDocx')}
                        </button>
                        <button onClick={() => handleExport('xlsx')} disabled={isExporting} className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md disabled:bg-slate-400 disabled:cursor-wait text-sm">
                            {isExporting ? t('exporting') : t('downloadXlsx')}
                        </button>
                    </div>
                     <button
                        onClick={() => setViewMode(viewMode === 'report' ? 'transcript' : 'report')}
                        className="text-sm bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-md transition-colors"
                    >
                        {viewMode === 'report' ? t('viewEditTranscript') : t('viewReport')}
                    </button>
                </div>
            </div>
        )}

        <div className="p-6">
            {viewMode === 'report' && result ? (
                <ReportTabsView result={result} />
            ) : (
                <TranscriptViewEditor {...props} />
            )}
        </div>
    </div>
  );
};