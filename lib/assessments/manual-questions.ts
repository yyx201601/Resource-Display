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
  "year8-dt-45-v3": [
    {
      questionKey: "data-interception",
      label: "Q8",
      prompt:
        "Mia's private message is copied while travelling across a public network. Explain what happened and why the encrypted message may still be protected.",
      maxScore: 2,
      markingGuide: [
        "1 mark: identifies data interception or copying data while it travels.",
        "1 mark: explains that encryption makes the content unreadable or difficult to understand without the key.",
      ],
    },
    {
      questionKey: "phishing-response",
      label: "Q9",
      prompt:
        "Explain why the urgent school-account message is phishing rather than only a general scam, and give one safe action Alex should take.",
      maxScore: 2,
      markingGuide: [
        "1 mark: explains that it impersonates a trusted source to obtain login details through a link.",
        "1 mark: gives a safe action such as avoiding the link, checking the official site, or reporting the message.",
      ],
    },
    {
      questionKey: "malware-interception",
      label: "Q10",
      prompt:
        "Identify the two threats in Priya's scenario and explain one risk caused by either threat.",
      maxScore: 3,
      markingGuide: [
        "1 mark: identifies malware from the unknown downloaded program.",
        "1 mark: identifies data interception while information travels across the network.",
        "1 mark: explains a relevant risk such as stolen files, exposed information, privacy loss, or account compromise.",
      ],
    },
    {
      questionKey: "password-identity",
      label: "Q11",
      prompt:
        "Explain Jordan's password problem, what happened next, and one suitable protection.",
      maxScore: 3,
      markingGuide: [
        "1 mark: identifies password reuse or the same password being used across accounts.",
        "1 mark: identifies identity theft or impersonation after the account is accessed.",
        "1 mark: gives a suitable protection such as changing to unique passwords or enabling MFA.",
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
