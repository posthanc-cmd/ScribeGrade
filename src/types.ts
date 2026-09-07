export interface Section {
  sectionName: string;
  originalAnswer: string;
  rewrittenAnswer: string;
  score: number;
  feedback: string;
}

export interface GradeResult {
  overallScore: number;
  feedbackSummary: string;
  sections: Section[];
}

export interface HistoryItem {
  id: string;
  date: string;
  title: string;
  result: GradeResult;
}
