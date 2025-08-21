
import React, { createContext, useState, useContext, useCallback, useMemo, useEffect } from 'react';

const translations = {
  en: {
    appTitle: 'AI Meeting Assistant',
    startOver: 'Start Over',
    fileTooLargeError: 'File is too large. Please select a file smaller than 200MB.',
    loadingPrepareFile: 'Preparing file...',
    metadataError: 'Could not load audio metadata to determine duration.',
    fileReadError: 'Could not read file.',
    loadingTranscribing: 'Transcribing audio... This may take a while for long files.',
    loadingTranscribingChunk: 'Transcribing audio... (Chunk {chunk} of {total})',
    transcriptionEmptyError: 'No transcribable content was found in the file. Please try a different file.',
    fileReadErrorReader: 'An error occurred while reading the file.',
    transcriptionGenericError: 'An unknown error occurred during transcription.',
    loadingAnalyzing: 'AI is analyzing the meeting transcript...',
    analysisGenericError: 'An unknown error occurred during analysis.',
    readyTitle: 'File Ready',
    uploadedFile: 'You have uploaded:',
    videoNote: '(We will automatically analyze the audio stream from your video file)',
    startTranscriptionButton: 'Start Transcription →',
    chooseAnotherFile: 'Choose a different file',
    dropzoneTitle: 'Drag and drop your file here',
    or: 'or',
    selectFileButton: 'Select file from computer',
    supportedFormats: 'Supports: MP3, M4A, WAV, MP4, MOV, ... (Max 200MB)',
    meetingMinutesTitle: 'MEETING MINUTES',
    downloadDocx: 'Download DOCX',
    downloadXlsx: 'Download XLSX',
    exporting: 'Exporting...',
    viewEditTranscript: 'View & Edit Transcript',
    viewReport: 'View Report',
    reportTitle: 'Meeting Report',
    transcriptTitle: 'Full Meeting Transcript',
    editTranscriptTitle: 'Review Transcript & Provide Hints',
    copied: 'Copied!',
    copy: 'Copy',
    audioNotSupported: 'Your browser does not support the audio element.',
    finishEditingTitle: 'Finished Reviewing?',
    finishEditingDescription: 'Save your changes and let the AI analyze the meeting transcript.',
    saveAndAnalyzeButton: 'Save & Analyze →',
    reanalyzeButton: 'Update & Re-analyze →',
    finishEditingTitleImprove: 'Want to improve the analysis?',
    finishEditingDescriptionImprove: 'Edit the transcript or speaker labels, then re-analyze for a more accurate report.',
    analysisHintLabel: 'Provide Hints for AI Analysis',
    analysisHintDescription: 'Help the AI be more accurate. For example: correct spelling of proper nouns, define jargon, provide context.',
    analysisHintPlaceholder: 'e.g., "The name is spelled M-I-S-A, not Visa. Project Phoenix refers to the Q3 launch."',
    speakerLabel: 'Speaker',
    speakerPlaceholder: 'e.g., Speaker 1',
    noContent: 'No content.',
    noContentToShow: 'No content to display.',
    tabOverview: '1. Overview & Objectives',
    tabSummary: '2. Summary',
    tabDecisions: '3. Decisions',
    tabActionItems: '4. Action Items',
    tabPendingIssues: '5. Pending Items',
    tabNotes: '6. Notes',
    overviewSectionTitle: '1. Overview & Objectives',
    overviewInfoTitle: 'Overview Information',
    topic: 'Topic',
    dateTime: 'Date & Time',
    location: 'Location',
    attendees: 'Attendees',
    mainObjectivesTitle: 'Main Meeting Objectives',
    summarySectionTitle: '2. Summary of Main Discussion Points',
    decisionsSectionTitle: '3. Key Decisions Finalized',
    actionItemsSectionTitle: '4. Action Item Assignments',
    actionItemsTableHeaderTask: 'Specific Task',
    actionItemsTableHeaderOwner: 'Owner',
    actionItemsTableHeaderCollaborators: 'Collaborators',
    actionItemsTableHeaderDeadline: 'Deadline',
    actionItemsTableHeaderNotes: 'Notes',
    pendingIssuesSectionTitle: '5. Pending Issues or Follow-ups',
    notesSectionTitle: '6. Notes & References',
    exportError: "Could not export {format} file. Please try again.",
    errorTitle: 'An error occurred!',
    welcomeTitle: 'Free yourself from meeting notes',
    welcomeSubtitle: 'Upload your audio or video recording, and let AI automatically transcribe, summarize, and extract the most important information.',
    feature1Title: 'Intelligent Summary',
    feature1Desc: 'Get a concise summary of the main topics discussed.',
    feature2Title: 'Action Item Detection',
    feature2Desc: 'Automatically identify tasks, owners, and deadlines.',
    feature3Title: 'Decision Extraction',
    feature3Desc: 'Clearly list the key decisions agreed upon during the meeting.',
  },
  vi: {
    appTitle: 'Trợ lý Họp AI',
    startOver: 'Bắt đầu lại',
    fileTooLargeError: 'Tệp quá lớn. Vui lòng chọn tệp nhỏ hơn 200MB.',
    loadingPrepareFile: 'Đang chuẩn bị tệp...',
    metadataError: 'Không thể tải siêu dữ liệu âm thanh để xác định thời lượng.',
    fileReadError: 'Không thể đọc tệp.',
    loadingTranscribing: 'Đang gỡ băng âm thanh... Quá trình này có thể mất nhiều thời gian với tệp dài.',
    loadingTranscribingChunk: 'Đang gỡ băng âm thanh... (Phân đoạn {chunk}/{total})',
    transcriptionEmptyError: 'Không tìm thấy nội dung có thể gỡ băng trong tệp. Vui lòng thử một tệp khác.',
    fileReadErrorReader: 'Đã xảy ra lỗi khi đọc tệp.',
    transcriptionGenericError: 'Đã xảy ra lỗi không xác định khi gỡ băng.',
    loadingAnalyzing: 'AI đang phân tích nội dung cuộc họp...',
    analysisGenericError: 'Đã xảy ra lỗi không xác định khi phân tích.',
    readyTitle: 'Tệp đã sẵn sàng',
    uploadedFile: 'Bạn đã tải lên:',
    videoNote: '(Chúng tôi sẽ tự động phân tích luồng âm thanh từ tệp video của bạn)',
    startTranscriptionButton: 'Bắt đầu Gỡ băng →',
    chooseAnotherFile: 'Chọn tệp khác',
    dropzoneTitle: 'Kéo và thả tệp của bạn vào đây',
    or: 'hoặc',
    selectFileButton: 'Chọn tệp từ máy tính',
    supportedFormats: 'Hỗ trợ: MP3, M4A, WAV, MP4, MOV, ... (Tối đa 200MB)',
    meetingMinutesTitle: 'BIÊN BẢN CUỘC HỌP',
    downloadDocx: 'Tải DOCX',
    downloadXlsx: 'Tải XLSX',
    exporting: 'Đang xuất...',
    viewEditTranscript: 'Xem & Chỉnh sửa Nội dung',
    viewReport: 'Xem Báo cáo',
    reportTitle: 'Báo cáo cuộc họp',
    transcriptTitle: 'Nội dung chi tiết cuộc họp',
    editTranscriptTitle: 'Xem lại Nội dung & Cung cấp Gợi ý',
    copied: 'Đã sao chép!',
    copy: 'Sao chép',
    audioNotSupported: 'Trình duyệt của bạn không hỗ trợ phần tử âm thanh.',
    finishEditingTitle: 'Hoàn tất Xem lại?',
    finishEditingDescription: 'Lưu các thay đổi của bạn và để AI phân tích toàn bộ nội dung cuộc họp đã được cập nhật.',
    saveAndAnalyzeButton: 'Lưu & Phân tích →',
    reanalyzeButton: 'Cập nhật & Phân tích lại →',
    finishEditingTitleImprove: 'Bạn muốn cải thiện phân tích?',
    finishEditingDescriptionImprove: 'Chỉnh sửa nội dung hoặc nhãn người nói, sau đó phân tích lại để có báo cáo chính xác hơn.',
    analysisHintLabel: 'Cung cấp Gợi ý cho AI Phân tích',
    analysisHintDescription: 'Giúp AI phân tích chính xác hơn. Ví dụ: sửa lỗi chính tả của tên riêng, định nghĩa thuật ngữ, cung cấp ngữ cảnh.',
    analysisHintPlaceholder: 'VD: "Tên là Misa, không phải Visa. Dự án Phượng Hoàng là dự án ra mắt quý 3."',
    speakerLabel: 'Người nói',
    speakerPlaceholder: 'VD: Người nói 1',
    noContent: 'Không có nội dung.',
    noContentToShow: 'Không có nội dung để hiển thị.',
    tabOverview: '1. Tổng quan & Mục tiêu',
    tabSummary: '2. Tóm tắt',
    tabDecisions: '3. Quyết định',
    tabActionItems: '4. Công việc',
    tabPendingIssues: '5. Tồn đọng',
    tabNotes: '6. Ghi chú',
    overviewSectionTitle: '1. Tổng quan & Mục tiêu',
    overviewInfoTitle: 'Thông tin Tổng quan',
    topic: 'Chủ đề',
    dateTime: 'Ngày & Giờ',
    location: 'Địa điểm',
    attendees: 'Thành phần tham dự',
    mainObjectivesTitle: 'Mục tiêu Chính của Cuộc họp',
    summarySectionTitle: '2. Tóm tắt các Nội dung Thảo luận Chính',
    decisionsSectionTitle: '3. Các Quyết định Then chốt đã được Chốt',
    actionItemsSectionTitle: '4. Phân công Công việc',
    actionItemsTableHeaderTask: 'Nội dung công việc',
    actionItemsTableHeaderOwner: 'Người thực hiện',
    actionItemsTableHeaderCollaborators: 'Người hỗ trợ',
    actionItemsTableHeaderDeadline: 'Thời hạn hoàn thành',
    actionItemsTableHeaderNotes: 'Ghi chú',
    pendingIssuesSectionTitle: '5. Các Vấn đề Tồn đọng hoặc Cần theo dõi',
    notesSectionTitle: '6. Ghi chú & Tài liệu Tham khảo',
    exportError: "Không thể xuất tệp {format}. Vui lòng thử lại.",
    errorTitle: 'Đã xảy ra lỗi!',
    welcomeTitle: 'Giải phóng bạn khỏi việc ghi chép cuộc họp',
    welcomeSubtitle: 'Tải lên bản ghi âm hoặc video, và để AI tự động gỡ băng, tóm tắt, và trích xuất những thông tin quan trọng nhất.',
    feature1Title: 'Tóm tắt thông minh',
    feature1Desc: 'Nhận ngay bản tóm tắt cô đọng về các chủ đề chính đã được thảo luận.',
    feature2Title: 'Phát hiện công việc',
    feature2Desc: 'Tự động xác định các công việc cần làm, người phụ trách và hạn chót.',
    feature3Title: 'Trích xuất quyết định',
    feature3Desc: 'Liệt kê rõ ràng các quyết định quan trọng đã được thống nhất trong cuộc họp.',
  }
};

type Language = keyof typeof translations;
type TranslationKey = keyof (typeof translations)['en'];

interface LanguageContextType {
  language: Language;
  changeLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string>) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguage] = useState<Language>('vi');

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const changeLanguage = useCallback((lang: Language) => {
    setLanguage(lang);
  }, []);

  const t = useCallback((key: TranslationKey, params: Record<string, string> = {}): string => {
    let translation = translations[language]?.[key] || translations.en[key] || key;
    Object.keys(params).forEach(paramKey => {
        translation = translation.replace(`{${paramKey}}`, params[paramKey]);
    });
    return translation;
  }, [language]);

  const value = useMemo(() => ({ language, changeLanguage, t }), [language, changeLanguage, t]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
