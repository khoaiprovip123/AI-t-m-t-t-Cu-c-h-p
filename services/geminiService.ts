import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import type { ActionItem, Decision, TranscriptSegment, AnalysisResult } from "../types";

const API_KEY = process.env.API_KEY;

if (!API_KEY) {
  throw new Error("API_KEY is not defined. Please set the API_KEY environment variable.");
}

const ai = new GoogleGenAI({ apiKey: API_KEY });
const model = 'gemini-2.5-flash';

type Language = 'vi' | 'en';

const getSystemInstructionForJson = (lang: Language): string => {
    const t = {
        vi: `Bạn là một API trả về CHỈ JSON thô, hợp lệ. TOÀN BỘ phản hồi của bạn PHẢI là một đối tượng hoặc mảng JSON hợp lệ duy nhất theo yêu cầu. Tuân thủ các quy tắc nghiêm ngặt sau:
1.  **KHÔNG MARKDOWN.** Phản hồi của bạn không được bọc trong markdown (ví dụ: \`\`\`json).
2.  **KHÔNG CÓ VĂN BẢN THỪA.** Không thêm bất kỳ bình luận, văn bản giới thiệu nào hoặc bất kỳ văn bản nào khác ngoài JSON.
3.  **CÚ PHÁP HỢP LỆ.** Đảm bảo tất cả các chuỗi được thoát đúng cách (ví dụ: dòng mới là \\n, dấu ngoặc kép là \\"), và tất cả dấu phẩy và dấu ngoặc được đặt đúng vị trí.
4.  **KHÔNG CÓ KÝ TỰ RÁC.** JSON không được chứa bất kỳ ký tự ngẫu nhiên hoặc không liên quan nào. Ví dụ: một mảng phải kết thúc bằng ']', chứ không phải '], some_random_text}'.
5.  **HOÀN CHỈNH & KHÔNG BỊ CẮT NGANG.** JSON phải hoàn chỉnh và không bị cắt bớt.

Đầu ra của bạn sẽ được phân tích cú pháp trực tiếp bằng máy, vì vậy độ chính xác 100% là rất quan trọng.`,
        en: `You are an API that returns ONLY valid, raw JSON. Your entire response MUST be a single, valid JSON object or array as requested. Adhere to the following strict rules:
1.  **NO MARKDOWN.** Your response must not be wrapped in markdown (e.g., \`\`\`json).
2.  **NO EXTRA TEXT.** Do not add any commentary, introductory text, or any text other than the JSON itself.
3.  **VALID SYNTAX.** Ensure all strings are properly escaped (e.g., newlines as \\n, quotes as \\"), and that all commas and brackets are correctly placed.
4.  **NO GARBAGE TEXT.** The JSON must not contain any random or extraneous characters. For example, an array must end with ']', not '], some_random_text}'.
5.  **COMPLETE & UNTRUNCATED.** The JSON must be complete and not cut off.

Your output will be parsed directly by a machine, so 100% correctness is critical.`
    };
    return t[lang];
};

const getTranscriptionSchema = (lang: Language) => {
    const t = {
        vi: {
            startSeconds: "Thời gian bắt đầu của đoạn bản ghi tính bằng giây từ đầu âm thanh.",
            speaker: "Nhãn nhận dạng cho người nói (ví dụ: 'Người nói 1').",
            text: "Văn bản đã được gỡ băng cho đoạn này."
        },
        en: {
            startSeconds: "The start time of the transcript segment in seconds from the beginning of the audio.",
            speaker: "The identified speaker label (e.g., 'Speaker 1').",
            text: "The transcribed text for this segment."
        }
    };
    return {
        type: Type.ARRAY,
        items: {
            type: Type.OBJECT,
            properties: {
                startSeconds: { type: Type.NUMBER, description: t[lang].startSeconds },
                speaker: { type: Type.STRING, description: t[lang].speaker },
                text: { type: Type.STRING, description: t[lang].text }
            },
            required: ["startSeconds", "speaker", "text"]
        }
    };
};

const getAnalysisSchema = (lang: Language) => {
    const t = (lang === 'vi') ? {
        overview: "Thông tin tổng quan về cuộc họp.",
        topic: "Chủ đề chính của cuộc họp.",
        dateTime: "Ngày và giờ của cuộc họp. Nên là '[Chưa xác định]' nếu không được đề cập.",
        location: "Địa điểm của cuộc họp. Nên là '[Chưa xác định]' nếu không được đề cập.",
        attendees: "Danh sách người tham dự. Thêm '(Chủ trì)' vào sau tên người chủ trì nếu có thể xác định.",
        mainObjectives: "1-2 mục tiêu cốt lõi của cuộc họp.",
        discussionSummary: "Bản tóm tắt định dạng Markdown về các điểm thảo luận chính. Sử dụng '##' cho các chủ đề chính và '*' cho các gạch đầu dòng.",
        decisions: "Các quyết định quan trọng đã được chốt.",
        decision: "Quyết định cụ thể đã được đưa ra.",
        actionItems: "Bảng các nhiệm vụ được giao.",
        task: "Nhiệm vụ cụ thể cần thực hiện.",
        owner: "Người chịu trách nhiệm cho nhiệm vụ. Nên là null nếu không được chỉ định.",
        collaborators: "Những người phối hợp trong nhiệm vụ. Nên là null nếu không được chỉ định.",
        deadline: "Hạn chót cho nhiệm vụ. Nên là null nếu không được chỉ định.",
        notes: "Ghi chú bổ sung cho nhiệm vụ. Nên là null nếu không được chỉ định.",
        pendingIssues: "Các vấn đề chưa được giải quyết hoặc các chủ đề cho cuộc họp tiếp theo.",
        notesAndReferences: "Các đề xuất, nhận xét đáng chú ý, hoặc các tài liệu/liên kết được đề cập."
    } : {
        overview: "Overall information about the meeting.",
        topic: "The main topic of the meeting.",
        dateTime: "Date and time of the meeting. Should be '[Unspecified]' if not mentioned.",
        location: "Location of the meeting. Should be '[Unspecified]' if not mentioned.",
        attendees: "List of attendees. Append '(Host)' to the host's name if identifiable.",
        mainObjectives: "1-2 core objectives of the meeting.",
        discussionSummary: "A Markdown-formatted summary of the main discussion points. Use '##' for main topics and '*' for bullet points.",
        decisions: "Key decisions that were finalized.",
        decision: "The specific decision made.",
        actionItems: "Table of assigned tasks.",
        task: "The specific task to be done.",
        owner: "Person responsible for the task. Should be null if not specified.",
        collaborators: "People collaborating on the task. Should be null if not specified.",
        deadline: "Deadline for the task. Should be null if not specified.",
        notes: "Additional notes for the task. Should be null if not specified.",
        pendingIssues: "Unresolved issues or topics for the next meeting.",
        notesAndReferences: "Notable suggestions, comments, or mentioned documents/links."
    };

    return {
        type: Type.OBJECT,
        properties: {
            overview: {
                type: Type.OBJECT, description: t.overview,
                properties: {
                    topic: { type: Type.STRING, description: t.topic },
                    dateTime: { type: Type.STRING, description: t.dateTime },
                    location: { type: Type.STRING, description: t.location },
                    attendees: { type: Type.ARRAY, description: t.attendees, items: { type: Type.STRING } }
                },
                required: ["topic", "dateTime", "location", "attendees"]
            },
            mainObjectives: { type: Type.ARRAY, description: t.mainObjectives, items: { type: Type.STRING } },
            discussionSummary: { type: Type.STRING, description: t.discussionSummary },
            decisions: {
                type: Type.ARRAY, description: t.decisions,
                items: {
                    type: Type.OBJECT,
                    properties: { decision: { type: Type.STRING, description: t.decision } },
                    required: ["decision"]
                }
            },
            actionItems: {
                type: Type.ARRAY, description: t.actionItems,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        task: { type: Type.STRING, description: t.task },
                        owner: { type: Type.STRING, nullable: true, description: t.owner },
                        collaborators: { type: Type.STRING, nullable: true, description: t.collaborators },
                        deadline: { type: Type.STRING, nullable: true, description: t.deadline },
                        notes: { type: Type.STRING, nullable: true, description: t.notes },
                    },
                    required: ["task", "owner", "collaborators", "deadline", "notes"]
                }
            },
            pendingIssues: { type: Type.ARRAY, description: t.pendingIssues, items: { type: Type.STRING } },
            notesAndReferences: { type: Type.ARRAY, description: t.notesAndReferences, items: { type: Type.STRING } }
        },
        required: ["overview", "mainObjectives", "discussionSummary", "decisions", "actionItems", "pendingIssues", "notesAndReferences"]
    };
};

const extractAndParseJson = <T,>(text: string, rootType: 'object' | 'array' = 'object', lang: Language): T => {
    let jsonStr = text.trim();
    const startChar = rootType === 'object' ? '{' : '[';
    const endChar = rootType === 'object' ? '}' : ']';

    const startIndex = jsonStr.indexOf(startChar);
    if (startIndex === -1) {
        const errorMsg = lang === 'vi' 
            ? `Phản hồi của AI không chứa định dạng JSON ${rootType} như mong đợi. Phản hồi nhận được: ${jsonStr}`
            : `AI response did not contain the expected JSON ${rootType} format. Received: ${jsonStr}`;
        throw new Error(errorMsg);
    }

    const endIndex = jsonStr.lastIndexOf(endChar);
    if (endIndex > startIndex) {
        jsonStr = jsonStr.substring(startIndex, endIndex + 1);
    } else {
        // Response is likely truncated.
        if (rootType === 'array') {
            // For arrays, find the last '}' and close the array. This salvages partial transcripts.
            const lastBraceIndex = jsonStr.lastIndexOf('}');
            if (lastBraceIndex > startIndex) {
                let potentialJson = jsonStr.substring(startIndex, lastBraceIndex + 1);
                potentialJson = potentialJson.trim();
                if (potentialJson.endsWith(',')) {
                    potentialJson = potentialJson.slice(0, -1);
                }
                jsonStr = potentialJson + ']';
            } else {
                // No full objects, return empty array.
                jsonStr = '[]';
            }
        } else {
            // For objects, we cannot safely salvage. Let it fail parsing.
            jsonStr = jsonStr.substring(startIndex);
        }
    }
    
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response. Raw text:", text, "Processed string:", jsonStr, e);
        let message = '';
        if (lang === 'vi') {
            message = `AI đã trả về định dạng không hợp lệ và không thể phân tích dưới dạng JSON.`;
            if (e instanceof SyntaxError && (e.message.toLowerCase().includes('unterminated string') || e.message.toLowerCase().includes('unexpected end of json input'))) {
                message = `Phản hồi của AI có vẻ đã bị cắt ngắn, dẫn đến lỗi phân tích JSON. Điều này có thể xảy ra với các tệp âm thanh rất dài. Vui lòng thử lại với một tệp nhỏ hơn.`;
            } else if (e instanceof SyntaxError) {
                message = `Phản hồi của AI chứa lỗi cú pháp JSON và không thể phân tích được.`;
            }
        } else {
            message = `The AI returned an invalid format that could not be parsed as JSON.`;
            if (e instanceof SyntaxError && (e.message.toLowerCase().includes('unterminated string') || e.message.toLowerCase().includes('unexpected end of json input'))) {
                message = `The AI's response appears to have been truncated, leading to a JSON parsing error. This can happen with very long audio files. Please try again with a smaller file.`;
            } else if (e instanceof SyntaxError) {
                message = `The AI's response contained a JSON syntax error and could not be parsed.`;
            }
        }
        throw new Error(message);
    }
};

const secondsToTimestamp = (seconds: number): string => {
    if (isNaN(seconds) || seconds < 0) return "00:00:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    const pad = (num: number) => num.toString().padStart(2, '0');
    return `${pad(h)}:${pad(m)}:${pad(s)}`;
};

interface RawTranscriptSegment {
  startSeconds: number;
  speaker: string;
  text: string;
}

// #region WAV Encoding Helpers
function floatTo16BitPCM(output: DataView, offset: number, input: Float32Array) {
    for (let i = 0; i < input.length; i++, offset += 2) {
        const s = Math.max(-1, Math.min(1, input[i]));
        output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
    }
}

function writeString(view: DataView, offset: number, string: string) {
    for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
    }
}

function encodeWAV(samples: Float32Array, sampleRate: number, numChannels: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(view, 36, 'data');
    view.setUint32(40, samples.length * 2, true);

    floatTo16BitPCM(view, 44, samples);

    return buffer;
}

function interleave(audioBuffer: AudioBuffer): Float32Array {
    const numberOfChannels = audioBuffer.numberOfChannels;
    const length = audioBuffer.length;
    const result = new Float32Array(length * numberOfChannels);
    let inputIndex = 0;

    for (let i = 0; i < length; i++) {
        for (let channel = 0; channel < numberOfChannels; channel++) {
            result[inputIndex++] = audioBuffer.getChannelData(channel)[i];
        }
    }
    return result;
}
// #endregion

const transcribeAudioChunk = async (base64Data: string, mimeType: string, lang: Language): Promise<RawTranscriptSegment[]> => {
    const t = (lang === 'vi') ? {
        systemInstruction: `Bạn là một chuyên gia gỡ băng âm thanh với độ chính xác tuyệt đối. Nhiệm vụ của bạn là chuyển đổi âm thanh thành văn bản, xác định chính xác người nói và tuân thủ nghiêm ngặt các quy tắc sau đây:
1.  **ĐỊNH DẠNG JSON:** TOÀN BỘ phản hồi của bạn PHẢI là một mảng JSON thô, hợp lệ duy nhất, tuân thủ schema đã cho. KHÔNG thêm bất kỳ văn bản, lời chào, hay bình luận nào ngoài JSON.
2.  **CẤU TRÚC DỮ LIỆU:** Mỗi đối tượng trong mảng phải chứa 'startSeconds', 'speaker' và 'text'.
3.  **NHẬN DIỆN NGƯỜI NÓI:** Gán nhãn người nói một cách nhất quán ('Người nói 1', 'Người nói 2', v.v.). Đừng thay đổi nhãn của một người nói giữa chừng.
4.  **DẤU THỜI GIAN CHÍNH XÁC:** 'startSeconds' phải thể hiện chính xác thời điểm bắt đầu của lời nói, tính bằng giây, và phải theo thứ tự thời gian tăng dần.
5.  **TÍNH TOÀN VẸN CỦA NỘI DUNG:**
    -   Gỡ băng từng từ một cách chính xác. Giữ lại tất cả các từ đệm và thán từ (ví dụ: 'ờ', 'à', 'ừm') để đảm bảo tính nguyên bản.
    -   TUYỆT ĐỐI KHÔNG được lặp lại bất kỳ đoạn văn bản hoặc câu nào. Mỗi phân đoạn phải là duy nhất và tiếp nối nhau một cách logic.
    -   TUYỆT ĐỐI KHÔNG được tóm tắt hay diễn giải. Chỉ ghi lại những gì được nói.
6.  **XỬ LÝ TRƯỜNG HỢP ĐẶC BIỆT:** Nếu không có lời nói trong âm thanh, hãy trả về một mảng trống []. Hoàn thành toàn bộ bản ghi cho đến hết âm thanh.`,
        prompt: `Vui lòng gỡ băng tệp âm thanh tiếng Việt sau và xác định người nói. Tuân thủ nghiêm ngặt định dạng JSON được xác định trong schema.`,
        errorInvalidFormat: "AI đã trả về định dạng bản ghi không hợp lệ.",
        errorGeneric: "Đã xảy ra lỗi không xác định khi gỡ băng."
    } : {
        systemInstruction: `You are an expert transcriptionist with absolute precision. Your task is to convert audio to text, accurately identify speakers, and adhere strictly to the following rules:
1.  **JSON FORMAT:** Your ENTIRE response MUST be a single, valid, raw JSON array conforming to the given schema. DO NOT add any text, greetings, or commentary outside the JSON.
2.  **DATA STRUCTURE:** Each object in the array must contain 'startSeconds', 'speaker', and 'text'.
3.  **SPEAKER IDENTIFICATION:** Label speakers consistently ('Speaker 1', 'Speaker 2', etc.). Do not change a speaker's label midway through.
4.  **ACCURATE TIMESTAMPS:** 'startSeconds' must be precise, in seconds, and strictly chronological.
5.  **CONTENT INTEGRITY:**
    -   Transcribe verbatim. Preserve all filler words and utterances (e.g., 'uh', 'ah', 'um') for authenticity.
    -   ABSOLUTELY DO NOT repeat any text segments or sentences. Each segment must be unique and follow logically.
    -   ABSOLUTELY DO NOT summarize or paraphrase. Transcribe only what is said.
6.  **EDGE CASES:** If there is no speech in the audio, return an empty array []. Complete the entire transcript to the end of the audio.`,
        prompt: `Please transcribe the following English audio file and identify the speakers. Strictly adhere to the JSON format defined in the schema.`,
        errorInvalidFormat: "The AI returned an invalid transcript format.",
        errorGeneric: "An unknown error occurred during transcription."
    };

    try {
      const audioPart = { inlineData: { mimeType, data: base64Data } };
      
      const response: GenerateContentResponse = await ai.models.generateContent({
        model,
        contents: { parts: [audioPart, { text: t.prompt }] },
        config: { 
            responseMimeType: "application/json",
            responseSchema: getTranscriptionSchema(lang),
            systemInstruction: t.systemInstruction
        },
      });

      const rawTranscript = extractAndParseJson<RawTranscriptSegment[]>(response.text, 'array', lang);

      if (!Array.isArray(rawTranscript)) {
          console.error("Parsed transcript is not an array:", rawTranscript);
          throw new Error(t.errorInvalidFormat);
      }
      return rawTranscript;

    } catch (error) {
        console.error("Error during transcription chunk:", error);
        if (error instanceof Error) throw error;
        throw new Error(t.errorGeneric);
    }
}


const geminiService = {
  async transcribeAudio(file: File, lang: Language, onProgress: (progress: { chunk: number, totalChunks: number }) => void): Promise<TranscriptSegment[]> {
    let audioCtx: AudioContext;
    try {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch(e) {
        throw new Error("Web Audio API is not supported in this browser.");
    }

    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
    
    const duration = audioBuffer.duration;
    // Use 5-minute chunks to be safe with token limits
    const chunkSizeInSeconds = 5 * 60;
    const numChunks = Math.ceil(duration / chunkSizeInSeconds);
    let allSegments: TranscriptSegment[] = [];
    let processedDuration = 0;

    for (let i = 0; i < numChunks; i++) {
        onProgress({ chunk: i + 1, totalChunks: numChunks });

        const start = i * chunkSizeInSeconds;
        const end = Math.min(start + chunkSizeInSeconds, duration);
        
        const startSample = Math.floor(start * audioBuffer.sampleRate);
        const endSample = Math.floor(end * audioBuffer.sampleRate);
        const chunkLengthSamples = endSample - startSample;

        const chunkBuffer = audioCtx.createBuffer(
            audioBuffer.numberOfChannels,
            chunkLengthSamples,
            audioBuffer.sampleRate
        );

        for (let channel = 0; channel < audioBuffer.numberOfChannels; channel++) {
            chunkBuffer.copyToChannel(audioBuffer.getChannelData(channel).subarray(startSample, endSample), channel);
        }

        const interleavedSamples = interleave(chunkBuffer);
        const wavBuffer = encodeWAV(interleavedSamples, audioBuffer.sampleRate, audioBuffer.numberOfChannels);
        const base64Data = btoa(new Uint8Array(wavBuffer).reduce((data, byte) => data + String.fromCharCode(byte), ''));

        const rawSegments = await transcribeAudioChunk(base64Data, 'audio/wav', lang);

        const adjustedSegments: TranscriptSegment[] = rawSegments.map((segment): TranscriptSegment | null => {
            if (typeof segment.startSeconds !== 'number' || typeof segment.text !== 'string' || typeof segment.speaker !== 'string') {
                console.warn("Skipping invalid segment:", segment);
                return null;
            }
            return {
                startTime: secondsToTimestamp(segment.startSeconds + processedDuration),
                speaker: segment.speaker,
                text: segment.text
            };
        }).filter((segment): segment is TranscriptSegment => segment !== null);

        allSegments = allSegments.concat(adjustedSegments);
        processedDuration += chunkBuffer.duration;
    }
    
    await audioCtx.close();
    return allSegments;
  },

  async analyzeTranscript(transcript: string, lang: Language, hint?: string): Promise<AnalysisResult> {
    const hintSection = (lang === 'vi') ? `
---
HƯỚNG DẪN BỔ SUNG TỪ NGƯỜI DÙNG (ƯU TIÊN HƯỚNG DẪN NÀY):
${hint}
---
` : `
---
ADDITIONAL GUIDANCE FROM USER (PRIORITIZE THIS GUIDANCE):
${hint}
---
`;

    const t = (lang === 'vi') ? {
        prompt: `
VAI TRÒ & BỐI CẢNH: Bạn là một trợ lý thư ký và chuyên viên phân tích chuyên nghiệp, cực kỳ tỉ mỉ. Nhiệm vụ của bạn là chắt lọc bản ghi cuộc họp thô thành một biên bản họp chính thức, khách quan, và có tính hành động cao, tuân thủ tuyệt đối các quy tắc bất di bất dịch dưới đây.

MỤC TIÊU CHÍNH: Chuyển đổi bản ghi cuộc họp thành một đối tượng JSON có cấu trúc, dựa trên sự thật 100%.

---
**QUY TẮC VÀNG (BẮT BUỘC TUÂN THỦ)**
---

**1. KHÔNG BỊA ĐẶT (ZERO-FABRICATION):**
- **Không Suy Diễn:** TUYỆT ĐỐI không diễn giải ý định. Một đề xuất ("Chúng ta nên làm X") không phải là một quyết định trừ khi có sự đồng thuận rõ ràng ("Ok, chốt làm X"). Các đề xuất chưa được chốt phải nằm trong 'Ghi chú' (notesAndReferences).
- **Không Giả Định:** Nếu thiếu thông tin (người phụ trách, thời hạn), phải dùng giá trị \`null\` hoặc "[Chưa xác định]" theo yêu cầu của schema. KHÔNG tự điền.
- **Không Thêm Thắt:** Mọi thông tin trong biên bản phải có nguồn gốc trực tiếp từ bản ghi.

**2. TRUNG THỰC VỚI NGUỒN (WORD-FOR-WORD INTEGRITY):**
- **Chỉ Trích Dẫn Sự Thật:** Chỉ ghi lại sự kiện đã xảy ra. Đảm bảo 100% độ chính xác của số liệu, tên riêng, chức danh.
- **Xử lý Mơ Hồ:** Nếu thông tin không rõ ràng, ghi nhận nó trong 'Ghi chú' kèm theo ghi chú như "[Nội dung chưa rõ, cần xác thực lại]".

**3. ĐỊNH NGHĨA CHẶT CHẼ:**
- **Quyết định (Decision):** Phải là một sự thống nhất cuối cùng, được xác nhận bởi các bên liên quan. Tìm các cụm từ như "Chúng ta đã quyết định", "Vậy chốt lại là", "Mọi người đồng ý nhé".
- **Công việc (Action Item):** Phải là một nhiệm vụ cụ thể, có thể giao phó. Phải xác định rõ hành động cần làm. Nếu có thể, xác định 'owner' và 'deadline'.
- **Tóm tắt Thảo luận (Discussion Summary):** Phải cô đọng, logic, và **không trùng lặp**. Nhóm các ý tưởng liên quan, loại bỏ các chi tiết không cần thiết và thông tin đã được ghi nhận trong các mục khác (như Quyết định, Công việc). Sử dụng định dạng Markdown đơn giản.

**4. CẤU TRÚC & HIỆU QUẢ (STRUCTURE & EFFICIENCY):**
- **Văn Phong Chuyên Nghiệp:** Ngắn gọn, súc tích, tập trung vào kết quả.
- **Tuân Thủ Schema Nghiêm ngặt:** Đầu ra cuối cùng PHẢI là một đối tượng JSON hợp lệ duy nhất, tuân thủ \`responseSchema\` đã cho. Không có văn bản thừa, không markdown, không lời giải thích.
${hint ? hintSection : ''}
---
BẢN GHI CUỘC HỌP CHÍNH THỨC CẦN PHÂN TÍCH:
${transcript}
---
`,
        errorGeneric: "Không thể phân tích bản ghi do lỗi không xác định từ dịch vụ AI."
    } : {
        prompt: `
ROLE & CONTEXT: You are a hyper-meticulous and professional secretarial assistant and analyst. Your mission is to distill a raw meeting transcript into a formal, objective, and actionable meeting minutes document, strictly adhering to the non-negotiable rules below.

PRIMARY OBJECTIVE: Convert the meeting transcript into a structured, 100% fact-based JSON object.

---
**GOLDEN RULES (MUST BE FOLLOWED)**
---

**1. ZERO-FABRICATION:**
- **No Inference:** ABSOLUTELY do not interpret intent. A suggestion ("We should do X") is not a decision unless there is explicit agreement ("Okay, let's go with X"). Unconfirmed suggestions belong in 'Notes & References'.
- **No Assumptions:** If information is missing (e.g., owner, deadline), you must use \`null\` or "[Unspecified]" as required by the schema. DO NOT invent information.
- **No Embellishment:** Every piece of information in the minutes must be directly traceable to the transcript.

**2. WORD-FOR-WORD INTEGRITY:**
- **Cite Facts Only:** Only record what happened. Ensure 100% accuracy of figures, proper names, and titles.
- **Handle Ambiguity:** If information is unclear, capture it in 'Notes & References' with a note like "[Content unclear, needs re-validation]".

**3. STRICT DEFINITIONS:**
- **Decision:** Must be a final, confirmed agreement. Look for phrases like "We've decided," "So it's settled," "Everyone agrees."
- **Action Item:** Must be a specific, delegable task. The action to be taken must be clear. If possible, identify an 'owner' and 'deadline'.
- **Discussion Summary:** Must be concise, logical, and **non-redundant**. Group related ideas, eliminate fluff, and exclude information already captured in other sections (like Decisions or Action Items). Use simple Markdown.

**4. STRUCTURE & EFFICIENCY:**
- **Professional Tone:** Be brief, concise, and outcome-focused.
- **Strict Schema Adherence:** The final output MUST be a single, valid JSON object that strictly conforms to the provided \`responseSchema\`. No extra text, no markdown, no explanations.
${hint ? hintSection : ''}
---
OFFICIAL MEETING TRANSCRIPT FOR ANALYSIS:
${transcript}
---
`,
        errorGeneric: "Could not analyze the transcript due to an unknown error from the AI service."
    };

    try {
      const response = await ai.models.generateContent({
        model,
        contents: t.prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: getAnalysisSchema(lang),
          systemInstruction: getSystemInstructionForJson(lang)
        },
      });
      return extractAndParseJson<AnalysisResult>(response.text, 'object', lang);
    } catch (error) {
      console.error("Error during analysis:", error);
       if (error instanceof Error) throw error;
      throw new Error(t.errorGeneric);
    }
  }
};

export { geminiService };