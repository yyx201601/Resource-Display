import type {
  AnswerSnapshot,
  TeacherMarkInput,
} from "@/lib/assessments/contracts";
import { getDatabase } from "@/lib/assessments/database";
import { AssessmentError } from "@/lib/assessments/errors";
import { requireManualQuestions } from "@/lib/assessments/manual-questions";

export type GradingStatus = "not_required" | "pending" | "graded";

export type AssessmentSummary = {
  key: string;
  slug: string;
  title: string;
  version: string;
  maxScore: number;
  sessionCount: number;
  attemptCount: number;
  submittedCount: number;
  pendingMarkCount: number;
  averageScore: number | null;
};

export type StudentResult = {
  attemptId: string;
  studentName: string;
  className: string;
  status: "started" | "submitted";
  gradingStatus: GradingStatus;
  score: number | null;
  maxScore: number;
  startedAt: Date;
  submittedAt: Date | null;
};

export type MarkingQueueItem = {
  attemptId: string;
  studentName: string;
  className: string;
  assessmentTitle: string;
  assessmentVersion: string;
  gradingStatus: "pending" | "graded";
  score: number | null;
  maxScore: number;
  submittedAt: Date;
};

export type ManualQuestionForMarking = {
  questionKey: string;
  label: string;
  prompt: string;
  maxScore: number;
  markingGuide: string[];
  response: string;
  score: number | null;
  feedback: string;
};

export type MarkingAttempt = {
  attemptId: string;
  studentName: string;
  className: string;
  assessmentTitle: string;
  assessmentVersion: string;
  automaticScore: number;
  automaticMaxScore: number;
  manualScore: number | null;
  manualMaxScore: number;
  score: number | null;
  maxScore: number;
  gradingStatus: "pending" | "graded";
  submittedAt: Date;
  markedAt: Date | null;
  teacherFeedback: string;
  questions: ManualQuestionForMarking[];
};

type JsonObject = Record<string, unknown>;

function asJsonObject(value: unknown): JsonObject {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonObject)
    : {};
}

function parseAnswers(value: unknown): AnswerSnapshot {
  const answers = asJsonObject(value);
  const radios = asJsonObject(answers.radios);
  const placements = asJsonObject(answers.placements);
  const shortAnswers = asJsonObject(answers.shortAnswers);

  return {
    radios: Object.fromEntries(
      Object.entries(radios).filter((entry): entry is [string, string] =>
        typeof entry[1] === "string",
      ),
    ),
    checkboxes: Array.isArray(answers.checkboxes)
      ? answers.checkboxes.filter(
          (entry): entry is string => typeof entry === "string",
        )
      : [],
    placements: Object.fromEntries(
      Object.entries(placements).filter((entry): entry is [string, string] =>
        typeof entry[1] === "string",
      ),
    ),
    shortAnswers: Object.fromEntries(
      Object.entries(shortAnswers).filter((entry): entry is [string, string] =>
        typeof entry[1] === "string",
      ),
    ),
  };
}

export async function getAssessmentSummaries() {
  const sql = getDatabase();
  const rows = await sql<
    {
      slug: string;
      title: string;
      version: string;
      max_score: number;
      session_count: number;
      attempt_count: number;
      submitted_count: number;
      pending_mark_count: number;
      average_score: number | null;
    }[]
  >`
    select
      assessment_definitions.slug,
      assessment_definitions.title,
      assessment_definitions.version,
      assessment_definitions.max_score,
      count(distinct assessment_sessions.id)::int as session_count,
      count(assessment_attempts.id)::int as attempt_count,
      count(assessment_attempts.id) filter (
        where assessment_attempts.status = 'submitted'
      )::int as submitted_count,
      count(assessment_attempts.id) filter (
        where assessment_attempts.grading_status = 'pending'
      )::int as pending_mark_count,
      round(avg(assessment_attempts.score) filter (
        where assessment_attempts.status = 'submitted'
          and assessment_attempts.score is not null
      ), 1)::float as average_score
    from assessment_definitions
    left join assessment_sessions
      on assessment_sessions.assessment_id = assessment_definitions.id
    left join assessment_attempts
      on assessment_attempts.session_id = assessment_sessions.id
    group by assessment_definitions.id
    order by
      assessment_definitions.title asc,
      assessment_definitions.created_at desc
  `;

  return rows.map((row): AssessmentSummary => ({
    key: `${row.slug}:${row.version}`,
    slug: row.slug,
    title: row.title,
    version: row.version,
    maxScore: row.max_score,
    sessionCount: row.session_count,
    attemptCount: row.attempt_count,
    submittedCount: row.submitted_count,
    pendingMarkCount: row.pending_mark_count,
    averageScore: row.average_score,
  }));
}

export async function getStudentResults(
  assessmentSlug: string,
  assessmentVersion: string,
) {
  const sql = getDatabase();
  const rows = await sql<
    {
      attempt_id: string;
      student_name: string;
      class_name: string;
      status: "started" | "submitted";
      grading_status: GradingStatus;
      score: number | null;
      max_score: number;
      started_at: Date;
      submitted_at: Date | null;
    }[]
  >`
    select
      assessment_attempts.public_id::text as attempt_id,
      assessment_attempts.student_name,
      assessment_sessions.class_name,
      assessment_attempts.status,
      assessment_attempts.grading_status,
      assessment_attempts.score,
      assessment_attempts.max_score,
      assessment_attempts.started_at,
      assessment_attempts.submitted_at
    from assessment_attempts
    join assessment_sessions
      on assessment_sessions.id = assessment_attempts.session_id
    join assessment_definitions
      on assessment_definitions.id = assessment_sessions.assessment_id
    where assessment_definitions.slug = ${assessmentSlug}
      and assessment_definitions.version = ${assessmentVersion}
    order by
      assessment_attempts.submitted_at desc nulls last,
      assessment_attempts.started_at desc
    limit 500
  `;

  return rows.map((row): StudentResult => ({
    attemptId: row.attempt_id,
    studentName: row.student_name,
    className: row.class_name,
    status: row.status,
    gradingStatus: row.grading_status,
    score: row.score,
    maxScore: row.max_score,
    startedAt: row.started_at,
    submittedAt: row.submitted_at,
  }));
}

export async function getMarkingQueue() {
  const sql = getDatabase();
  const rows = await sql<
    {
      attempt_id: string;
      student_name: string;
      class_name: string;
      assessment_title: string;
      assessment_version: string;
      grading_status: "pending" | "graded";
      score: number | null;
      max_score: number;
      submitted_at: Date;
    }[]
  >`
    select
      assessment_attempts.public_id::text as attempt_id,
      assessment_attempts.student_name,
      assessment_sessions.class_name,
      assessment_definitions.title as assessment_title,
      assessment_definitions.version as assessment_version,
      assessment_attempts.grading_status,
      assessment_attempts.score,
      assessment_attempts.max_score,
      assessment_attempts.submitted_at
    from assessment_attempts
    join assessment_sessions
      on assessment_sessions.id = assessment_attempts.session_id
    join assessment_definitions
      on assessment_definitions.id = assessment_sessions.assessment_id
    where assessment_attempts.status = 'submitted'
      and assessment_attempts.manual_max_score > 0
    order by
      (assessment_attempts.grading_status = 'pending') desc,
      assessment_attempts.submitted_at asc
    limit 500
  `;

  return rows.map((row): MarkingQueueItem => ({
    attemptId: row.attempt_id,
    studentName: row.student_name,
    className: row.class_name,
    assessmentTitle: row.assessment_title,
    assessmentVersion: row.assessment_version,
    gradingStatus: row.grading_status,
    score: row.score,
    maxScore: row.max_score,
    submittedAt: row.submitted_at,
  }));
}

export async function getMarkingAttempt(attemptId: string) {
  const sql = getDatabase();
  const attempts = await sql<
    {
      internal_id: number;
      attempt_id: string;
      student_name: string;
      class_name: string;
      assessment_title: string;
      assessment_version: string;
      scorer_key: string;
      automatic_score: number;
      manual_score: number | null;
      manual_max_score: number;
      score: number | null;
      max_score: number;
      grading_status: "pending" | "graded";
      answers: unknown;
      teacher_feedback: string;
      submitted_at: Date;
      marked_at: Date | null;
    }[]
  >`
    select
      assessment_attempts.id as internal_id,
      assessment_attempts.public_id::text as attempt_id,
      assessment_attempts.student_name,
      assessment_sessions.class_name,
      assessment_definitions.title as assessment_title,
      assessment_definitions.version as assessment_version,
      assessment_definitions.scorer_key,
      assessment_attempts.automatic_score,
      assessment_attempts.manual_score,
      assessment_attempts.manual_max_score,
      assessment_attempts.score,
      assessment_attempts.max_score,
      assessment_attempts.grading_status,
      assessment_attempts.answers,
      assessment_attempts.teacher_feedback,
      assessment_attempts.submitted_at,
      assessment_attempts.marked_at
    from assessment_attempts
    join assessment_sessions
      on assessment_sessions.id = assessment_attempts.session_id
    join assessment_definitions
      on assessment_definitions.id = assessment_sessions.assessment_id
    where assessment_attempts.public_id = ${attemptId}
      and assessment_attempts.status = 'submitted'
      and assessment_attempts.manual_max_score > 0
    limit 1
  `;
  const attempt = attempts[0];

  if (!attempt) {
    throw new AssessmentError(
      "attempt_not_found",
      "This submitted attempt was not found.",
      404,
    );
  }

  const marks = await sql<
    { question_key: string; score: number; feedback: string }[]
  >`
    select question_key, score, feedback
    from assessment_manual_marks
    where attempt_id = ${attempt.internal_id}
  `;
  const marksByQuestion = new Map(
    marks.map((mark) => [mark.question_key, mark]),
  );
  const answers = parseAnswers(attempt.answers);
  const definitions = requireManualQuestions(attempt.scorer_key);

  return {
    attemptId: attempt.attempt_id,
    studentName: attempt.student_name,
    className: attempt.class_name,
    assessmentTitle: attempt.assessment_title,
    assessmentVersion: attempt.assessment_version,
    automaticScore: attempt.automatic_score,
    automaticMaxScore: attempt.max_score - attempt.manual_max_score,
    manualScore: attempt.manual_score,
    manualMaxScore: attempt.manual_max_score,
    score: attempt.score,
    maxScore: attempt.max_score,
    gradingStatus: attempt.grading_status,
    submittedAt: attempt.submitted_at,
    markedAt: attempt.marked_at,
    teacherFeedback: attempt.teacher_feedback,
    questions: definitions.map((definition): ManualQuestionForMarking => {
      const mark = marksByQuestion.get(definition.questionKey);
      return {
        ...definition,
        response: answers.shortAnswers[definition.questionKey] ?? "",
        score: mark?.score ?? null,
        feedback: mark?.feedback ?? "",
      };
    }),
  } satisfies MarkingAttempt;
}

export async function saveTeacherMark(
  attemptId: string,
  input: TeacherMarkInput,
) {
  const sql = getDatabase();

  return sql.begin(async (transaction) => {
    const attempts = await transaction<
      {
        internal_id: number;
        automatic_score: number;
        manual_max_score: number;
        max_score: number;
        scorer_key: string;
      }[]
    >`
      select
        assessment_attempts.id as internal_id,
        assessment_attempts.automatic_score,
        assessment_attempts.manual_max_score,
        assessment_attempts.max_score,
        assessment_definitions.scorer_key
      from assessment_attempts
      join assessment_sessions
        on assessment_sessions.id = assessment_attempts.session_id
      join assessment_definitions
        on assessment_definitions.id = assessment_sessions.assessment_id
      where assessment_attempts.public_id = ${attemptId}
        and assessment_attempts.status = 'submitted'
        and assessment_attempts.manual_max_score > 0
      for update
    `;
    const attempt = attempts[0];

    if (!attempt) {
      throw new AssessmentError(
        "attempt_not_found",
        "This submitted attempt was not found.",
        404,
      );
    }

    const questions = requireManualQuestions(attempt.scorer_key);
    const configuredManualMax = questions.reduce(
      (total, question) => total + question.maxScore,
      0,
    );

    if (configuredManualMax !== attempt.manual_max_score) {
      throw new AssessmentError(
        "manual_score_configuration_mismatch",
        "The manual-marking total does not match the assessment definition.",
        500,
      );
    }

    const marksByQuestion = new Map(
      input.marks.map((mark) => [mark.questionKey, mark]),
    );

    if (
      marksByQuestion.size !== input.marks.length ||
      marksByQuestion.size !== questions.length
    ) {
      throw new AssessmentError(
        "invalid_marks",
        "Submit one mark for every short-answer question.",
        400,
      );
    }

    for (const question of questions) {
      const mark = marksByQuestion.get(question.questionKey);

      if (!mark || mark.score > question.maxScore) {
        throw new AssessmentError(
          "invalid_marks",
          `${question.label} must be marked between 0 and ${question.maxScore}.`,
          400,
        );
      }

      await transaction`
        insert into assessment_manual_marks (
          attempt_id, question_key, score, max_score, feedback
        )
        values (
          ${attempt.internal_id},
          ${question.questionKey},
          ${mark.score},
          ${question.maxScore},
          ${mark.feedback}
        )
        on conflict (attempt_id, question_key)
        do update set
          score = excluded.score,
          max_score = excluded.max_score,
          feedback = excluded.feedback,
          updated_at = now()
      `;
    }

    const manualScore = questions.reduce(
      (total, question) =>
        total + (marksByQuestion.get(question.questionKey)?.score ?? 0),
      0,
    );
    const finalScore = attempt.automatic_score + manualScore;
    const updated = await transaction<
      { attempt_id: string; marked_at: Date }[]
    >`
      update assessment_attempts
      set
        manual_score = ${manualScore},
        score = ${finalScore},
        grading_status = 'graded',
        teacher_feedback = ${input.feedback},
        marked_at = now(),
        updated_at = now()
      where id = ${attempt.internal_id}
      returning public_id::text as attempt_id, marked_at
    `;

    if (!updated[0]) {
      throw new AssessmentError(
        "marking_conflict",
        "The marks could not be saved. Refresh and try again.",
        409,
      );
    }

    return {
      attemptId: updated[0].attempt_id,
      automaticScore: attempt.automatic_score,
      manualScore,
      finalScore,
      maxScore: attempt.max_score,
      markedAt: updated[0].marked_at.toISOString(),
    };
  });
}
