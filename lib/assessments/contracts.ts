export type AnswerSnapshot = {
  radios: Record<string, string>;
  checkboxes: string[];
  placements: Record<string, string>;
};

export type StartAssessmentInput = {
  assessmentSlug: string;
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
  score: number;
  maxScore: number;
  breakdown: Record<string, number>;
};

export type SubmitAssessmentResult = {
  attemptId: string;
  submittedAt: string;
  duplicate: boolean;
};

export type AssessmentResultRow = {
  attemptId: string;
  studentName: string;
  status: "started" | "submitted";
  score: number | null;
  maxScore: number;
  startedAt: string;
  submittedAt: string | null;
};

export type MonitorResults = {
  session: {
    sessionId: string;
    classCode: string;
    className: string;
    assessmentSlug: string;
    assessmentVersion: string;
    assessmentTitle: string;
    maxScore: number;
  };
  attempts: AssessmentResultRow[];
};
