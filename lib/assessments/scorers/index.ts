import type { AnswerSnapshot, ScoreResult } from "../contracts";
import { AssessmentError } from "../errors";
import { scoreYear8DigitalTechnologiesV1 } from "./year8-dt-45-v1";

type Scorer = (answers: AnswerSnapshot) => ScoreResult;

const SCORERS: Record<string, Scorer> = {
  "year8-dt-45-v1": scoreYear8DigitalTechnologiesV1,
};

export function scoreAssessment(scorerKey: string, answers: AnswerSnapshot) {
  const scorer = SCORERS[scorerKey];
  if (!scorer) {
    throw new AssessmentError(
      "scorer_not_registered",
      `No scorer is registered for ${scorerKey}.`,
      500,
    );
  }
  return scorer(answers);
}
