export type AnswerSnapshot = {
  radios: Record<string, string>;
  checkboxes: string[];
  placements: Record<string, string>;
  shortAnswers: Record<string, string>;
};

export type StartAssessmentInput = {
  assessmentSlug: string;
  assessmentVersion: string;
  classCode: string;
  accessCode: string;
  studentName: string;
  clientAttemptId: string;
};

export type StartAssessmentResult = {
  attemptId: string;
  clientAttemptId: string;
  sessionId: string;
  assessmentSlug: string;
  assessmentVersion: string;
  studentName: string;
  status: "started" | "submitted";
  maxScore: number;
};

export type SubmitAssessmentInput = {
  attemptId: string;
  clientAttemptId: string;
  answers: AnswerSnapshot;
};

export type ScoreResult = {
  automaticScore: number;
  automaticMaxScore: number;
  manualMaxScore: number;
  totalMaxScore: number;
  breakdown: Record<string, number>;
};

export type SubmitAssessmentResult = {
  attemptId: string;
  submittedAt: string;
  duplicate: boolean;
};

export type TeacherQuestionMarkInput = {
  questionKey: string;
  score: number;
  feedback: string;
};

export type TeacherMarkInput = {
  marks: TeacherQuestionMarkInput[];
  feedback: string;
};
