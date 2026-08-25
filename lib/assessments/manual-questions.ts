import { AssessmentError } from "./errors";

export type ManualQuestionDefinition = {
  questionKey: string;
  label: string;
  prompt: string;
  maxScore: number;
  markingGuide: string[];
};

const QUESTIONS_BY_SCORER: Record<string, ManualQuestionDefinition[]> = {
  "year8-dt-45-v2": [
    {
      questionKey: "ethical-permission",
      label: "Q8",
      prompt:
        "Explain why testing a school system with permission is different from exploiting a weakness without permission.",
      maxScore: 2,
      markingGuide: [
        "1 mark: identifies permission or authorisation.",
        "1 mark: identifies a legitimate protective purpose or avoiding harm.",
      ],
    },
    {
      questionKey: "responsible-response",
      label: "Q9",
      prompt:
        "You accidentally see another student's password and notice a security weakness. Describe three responsible actions you should take.",
      maxScore: 3,
      markingGuide: [
        "1 mark: does not use, save, or share the password.",
        "1 mark: reports the password exposure to the student or teacher.",
        "1 mark: reports the security weakness privately to appropriate staff.",
      ],
    },
  ],
};

export function getManualQuestions(scorerKey: string) {
  return QUESTIONS_BY_SCORER[scorerKey] ?? [];
}

export function requireManualQuestions(scorerKey: string) {
  const questions = getManualQuestions(scorerKey);

  if (questions.length === 0) {
    throw new AssessmentError(
      "manual_questions_not_configured",
      `No manual-marking questions are registered for ${scorerKey}.`,
      500,
    );
  }

  return questions;
}
