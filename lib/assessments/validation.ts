import type {
  AnswerSnapshot,
  ReviewAssessmentInput,
  StartAssessmentInput,
  SubmitAssessmentInput,
  TeacherMarkInput,
} from "./contracts";
import { AssessmentError } from "./errors";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,79}$/;

function objectValue(value: unknown, field: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AssessmentError("invalid_request", `${field} must be an object.`, 400);
  }
  return value as Record<string, unknown>;
}

function stringValue(
  value: unknown,
  field: string,
  options: { min?: number; max?: number; pattern?: RegExp } = {},
) {
  if (typeof value !== "string") {
    throw new AssessmentError("invalid_request", `${field} must be a string.`, 400);
  }
  const result = value.trim();
  const min = options.min ?? 1;
  const max = options.max ?? 100;
  if (result.length < min || result.length > max || options.pattern?.test(result) === false) {
    throw new AssessmentError("invalid_request", `${field} is invalid.`, 400);
  }
  return result;
}

function stringRecord(
  value: unknown,
  field: string,
  maxEntries: number,
  maxValueLength = 100,
) {
  const input = objectValue(value, field);
  const entries = Object.entries(input);
  if (entries.length > maxEntries) {
    throw new AssessmentError("invalid_request", `${field} contains too many entries.`, 400);
  }
  return Object.fromEntries(
    entries.map(([key, entry]) => [
      stringValue(key, `${field} key`, { max: 100 }),
      stringValue(entry, `${field}.${key}`, { max: maxValueLength }),
    ]),
  );
}

export function parseAnswerSnapshot(value: unknown): AnswerSnapshot {
  const input = objectValue(value, "answers");
  if (!Array.isArray(input.checkboxes) || input.checkboxes.length > 80) {
    throw new AssessmentError("invalid_request", "answers.checkboxes is invalid.", 400);
  }
  return {
    radios: stringRecord(input.radios, "answers.radios", 80),
    checkboxes: input.checkboxes.map((entry, index) =>
      stringValue(entry, `answers.checkboxes.${index}`, { max: 100 }),
    ),
    placements: stringRecord(input.placements, "answers.placements", 120),
    shortAnswers:
      input.shortAnswers === undefined
        ? {}
        : stringRecord(input.shortAnswers, "answers.shortAnswers", 30, 4000),
  };
}

export function parseStartAssessmentInput(value: unknown): StartAssessmentInput {
  const input = objectValue(value, "request");
  return {
    assessmentSlug: stringValue(input.assessmentSlug, "assessmentSlug", {
      max: 80,
      pattern: SLUG_PATTERN,
    }).toLowerCase(),
    assessmentVersion: stringValue(
      input.assessmentVersion,
      "assessmentVersion",
      { max: 40, pattern: SLUG_PATTERN },
    ).toLowerCase(),
    classCode: stringValue(input.classCode, "classCode", {
      max: 80,
      pattern: SLUG_PATTERN,
    }).toLowerCase(),
    studentName: stringValue(input.studentName, "studentName", { max: 80 }),
    clientAttemptId: stringValue(input.clientAttemptId, "clientAttemptId", {
      max: 36,
      pattern: UUID_PATTERN,
    }),
  };
}

export function parseSubmitAssessmentInput(value: unknown): SubmitAssessmentInput {
  const input = objectValue(value, "request");
  return {
    attemptId: stringValue(input.attemptId, "attemptId", {
      max: 36,
      pattern: UUID_PATTERN,
    }),
    clientAttemptId: stringValue(input.clientAttemptId, "clientAttemptId", {
      max: 36,
      pattern: UUID_PATTERN,
    }),
    answers: parseAnswerSnapshot(input.answers),
  };
}

export function parseReviewAssessmentInput(value: unknown): ReviewAssessmentInput {
  const input = objectValue(value, "request");
  return {
    attemptId: stringValue(input.attemptId, "attemptId", {
      max: 36,
      pattern: UUID_PATTERN,
    }),
    clientAttemptId: stringValue(input.clientAttemptId, "clientAttemptId", {
      max: 36,
      pattern: UUID_PATTERN,
    }),
  };
}

export function parseAttemptId(value: string) {
  return stringValue(value, "attemptId", { max: 36, pattern: UUID_PATTERN });
}

export function parseTeacherMarkInput(value: unknown): TeacherMarkInput {
  const input = objectValue(value, "request");

  if (!Array.isArray(input.marks) || input.marks.length < 1 || input.marks.length > 30) {
    throw new AssessmentError(
      "invalid_request",
      "marks must contain between 1 and 30 question marks.",
      400,
    );
  }

  if (typeof input.feedback !== "string" || input.feedback.length > 2000) {
    throw new AssessmentError(
      "invalid_request",
      "feedback must be no longer than 2,000 characters.",
      400,
    );
  }

  return {
    marks: input.marks.map((value, index) => {
      const mark = objectValue(value, `marks.${index}`);
      const questionKey = stringValue(mark.questionKey, `marks.${index}.questionKey`, {
        max: 80,
        pattern: SLUG_PATTERN,
      });

      if (
        typeof mark.score !== "number" ||
        !Number.isInteger(mark.score) ||
        mark.score < 0 ||
        mark.score > 32767
      ) {
        throw new AssessmentError(
          "invalid_request",
          `marks.${index}.score must be a whole number greater than or equal to zero.`,
          400,
        );
      }

      if (typeof mark.feedback !== "string" || mark.feedback.length > 2000) {
        throw new AssessmentError(
          "invalid_request",
          `marks.${index}.feedback must be no longer than 2,000 characters.`,
          400,
        );
      }

      return {
        questionKey,
        score: mark.score,
        feedback: mark.feedback.trim(),
      };
    }),
    feedback: input.feedback.trim(),
  };
}
