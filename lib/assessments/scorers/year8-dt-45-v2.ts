import type { AnswerSnapshot, ScoreResult } from "../contracts";

const CORRECT_RADIOS: Record<string, string> = {
  q5a: "phishing",
  q5b: "scam",
  q5c: "malware",
  q5d: "password",
  q5e: "identity",
  q5f: "interception",
  q7a: "false",
  q7b: "true",
  q7c: "true",
  s2: "malware",
  s3: "steal",
  s4: "identity",
  s5: "phishing",
  s7: "encryption",
};

const CORRECT_CHECKBOXES = new Set([
  "clue:name",
  "clue:birthday",
  "clue:school",
  "protect:change",
  "protect:mfa",
]);

const CORRECT_PLACEMENTS: Record<string, string> = {
  "drag-0": "single-1",
  "drag-1": "single-3",
  "drag-2": "single-0",
  "drag-3": "single-2",
  "drag-4": "single-6",
  "drag-5": "single-7",
  "drag-6": "single-5",
  "drag-7": "single-4",
  "drag-8": "multi-0",
  "drag-9": "multi-1",
  "drag-10": "multi-0",
  "drag-11": "multi-1",
  "drag-12": "single-9",
  "drag-13": "single-10",
  "drag-14": "single-8",
  "drag-15": "single-16",
  "drag-16": "single-13",
  "drag-17": "single-15",
  "drag-18": "single-12",
  "drag-19": "single-11",
  "drag-20": "single-14",
};

export function scoreYear8DigitalTechnologiesV2(
  answers: AnswerSnapshot,
): ScoreResult {
  const radioScore = Object.entries(CORRECT_RADIOS).reduce(
    (score, [question, answer]) =>
      score + Number(answers.radios[question] === answer),
    0,
  );
  const selectedCheckboxes = new Set(answers.checkboxes);
  const checkboxScore = [...CORRECT_CHECKBOXES].reduce(
    (score, answer) => score + Number(selectedCheckboxes.has(answer)),
    0,
  );
  const placementScore = Object.entries(CORRECT_PLACEMENTS).reduce(
    (score, [item, target]) =>
      score + Number(answers.placements[item] === target),
    0,
  );

  return {
    automaticScore: radioScore + checkboxScore + placementScore,
    automaticMaxScore: 40,
    manualMaxScore: 5,
    totalMaxScore: 45,
    breakdown: {
      radio: radioScore,
      selection: checkboxScore,
      matching: placementScore,
    },
  };
}
