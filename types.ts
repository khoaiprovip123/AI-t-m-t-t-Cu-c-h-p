
export interface ActionItem {
  task: string;
  owner: string | null;
  collaborators: string | null;
  deadline: string | null;
  notes: string | null;
}

export interface Decision {
  decision: string;
}

export interface TranscriptSegment {
  startTime: string;
  speaker?: string;
  text: string;
}

export interface Overview {
  topic: string;
  dateTime: string;
  location: string;
  attendees: string[];
}

export interface AnalysisResult {
  overview: Overview;
  mainObjectives: string[];
  discussionSummary: string;
  decisions: Decision[];
  actionItems: ActionItem[];
  pendingIssues: string[];
  notesAndReferences: string[];
}