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
        "Mia's private message is copied while travelling across a public network. Explain what happened, how encryption protects the message, and what is needed to read it.",
      maxScore: 3,
      markingGuide: [
        "1 mark: identifies data interception or copying data while it travels.",
        "1 mark: explains that encryption makes the copied content unreadable or difficult to understand.",
        "1 mark: explains that the correct decryption key is needed to read the message.",
      ],
    },
    {
      questionKey: "phishing-response",
      label: "Q9",
      prompt:
        "Identify the specific threat in Alex's urgent school-account message, give one detail that supports your answer, and state one safe action Alex should take.",
      maxScore: 3,
      markingGuide: [
        "1 mark: identifies phishing.",
        "1 mark: uses scenario evidence such as the unusual sender, urgent warning, or sign-in link.",
        "1 mark: gives a safe action such as avoiding the link, checking the official site, or reporting the message.",
      ],
    },
    {
      questionKey: "malware-interception",
      label: "Q10",
      prompt:
        "Identify the threat in Priya's free editing program scenario, explain which detail supports the answer, and describe one risk to Priya.",
      maxScore: 3,
      markingGuide: [
        "1 mark: identifies malware from the unknown downloaded program.",
        "1 mark: uses scenario evidence such as the unknown download or unexpected copying of saved files.",
        "1 mark: explains a relevant risk such as stolen files, privacy loss, device damage, or account compromise.",
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
