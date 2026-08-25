import type { AnswerSnapshot, ScoreResult } from "../contracts";

const CORRECT_RADIOS: Record<string, string> = {
  q2a: "input",
  q2b: "output",
  q2c: "storage",
  q2d: "camera",
  q4a: "sender",
  q4b: "receiver",
  q4c: "travel",
  q5a: "phishing",
  q5b: "scam",
  q5c: "malware",
  q5d: "identity",
  q6a: "verify",
  q6b: "trusted",
  q6c: "unique",
  q6d: "encryption",
  q7a: "meaning",
  q7b: "factor",
  q13a: "wrong",
  q13b: "permission",
  q13c: "dontuse",
  q13d: "report",
  q13e: "purpose",
};

const CORRECT_SINGLE_PLACEMENTS: Record<string, string> = {
  "drag-0": "hardware-1",
  "drag-1": "hardware-3",
  "drag-2": "hardware-4",
  "drag-3": "hardware-5",
  "drag-4": "hardware-0",
  "drag-5": "hardware-2",
  "drag-6": "hardware-6",
  "drag-7": "software-type-0",
  "drag-8": "software-type-1",
};

const CORRECT_EXAMPLE_GROUPS = [
  [
    ["drag-9", "software-example-0"],
    ["drag-11", "software-example-0"],
  ],
  [
    ["drag-10", "software-example-1"],
    ["drag-12", "software-example-1"],
  ],
] as const;

const CORRECT_CHECKBOX_GROUPS: Record<string, Set<string>> = {
  p1: new Set(["p1:school", "p1:location", "p1:visibility"]),
  p2: new Set(["p2:report", "p2:official"]),
  p3: new Set(["p3:deletefile", "p3:securityon"]),
  p4: new Set(["p4:unique", "p4:mfa"]),
  p5: new Set(["p5:encrypt", "p5:key"]),
};

function scoreCheckboxGroups(answers: AnswerSnapshot) {
  const selected = new Set(answers.checkboxes);

  return Object.entries(CORRECT_CHECKBOX_GROUPS).reduce(
    (score, [group, correct]) => {
      const groupSelections = [...selected].filter((answer) =>
        answer.startsWith(`${group}:`),
      );
      const isExactMatch =
        groupSelections.length === correct.size &&
        groupSelections.every((answer) => correct.has(answer));
      return score + Number(isExactMatch);
    },
    0,
  );
}

export function scoreYear8DigitalTechnologiesV3(
  answers: AnswerSnapshot,
): ScoreResult {
  const radioScore = Object.entries(CORRECT_RADIOS).reduce(
    (score, [question, answer]) =>
      score + Number(answers.radios[question] === answer),
    0,
  );
  const singlePlacementScore = Object.entries(
    CORRECT_SINGLE_PLACEMENTS,
  ).reduce(
    (score, [item, target]) =>
      score + Number(answers.placements[item] === target),
    0,
  );
  const exampleGroupScore = CORRECT_EXAMPLE_GROUPS.reduce(
    (score, group) =>
      score +
      Number(
        group.every(
          ([item, target]) => answers.placements[item] === target,
        ),
      ),
    0,
  );
  const selectionScore = scoreCheckboxGroups(answers);

  return {
    automaticScore:
      radioScore + singlePlacementScore + exampleGroupScore + selectionScore,
    automaticMaxScore: 38,
    manualMaxScore: 12,
    totalMaxScore: 50,
    breakdown: {
      radio: radioScore,
      matching: singlePlacementScore + exampleGroupScore,
      selection: selectionScore,
    },
  };
}
