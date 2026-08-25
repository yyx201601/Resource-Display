import type {
  StartAssessmentInput,
  StartAssessmentResult,
  SubmitAssessmentInput,
  SubmitAssessmentResult,
  ReviewAssessmentInput,
  ReviewAssessmentResult,
} from "./contracts";
import { getDatabase } from "./database";
import { AssessmentError } from "./errors";
import { scoreAssessment } from "./scorers";
import { parseAnswerSnapshot } from "./validation";

type SessionRow = {
  session_id: number;
  session_public_id: string;
  assessment_slug: string;
  assessment_version: string;
  scorer_key: string;
  max_score: number;
  manual_max_score: number;
};

type AttemptRow = {
  attempt_id: number;
  attempt_public_id: string;
  status: "started" | "submitted";
  score: number | null;
  automatic_score: number | null;
  max_score: number;
  manual_max_score: number;
  grading_status: "not_required" | "pending" | "graded";
  submitted_at: Date | null;
  answers?: unknown;
};

type ReviewAttemptRow = {
  attempt_public_id: string;
  status: "started" | "submitted";
  answers: unknown;
};

export async function startAttempt(
  input: StartAssessmentInput,
): Promise<StartAssessmentResult> {
  const sql = getDatabase();
  const sessions = await sql<SessionRow[]>`
    select
      assessment_sessions.id as session_id,
      assessment_sessions.public_id as session_public_id,
      assessment_definitions.slug as assessment_slug,
      assessment_definitions.version as assessment_version,
      assessment_definitions.scorer_key,
      assessment_definitions.max_score,
      assessment_definitions.manual_max_score
    from assessment_sessions
    join assessment_definitions
      on assessment_definitions.id = assessment_sessions.assessment_id
    where assessment_definitions.slug = ${input.assessmentSlug}
      and assessment_definitions.version = ${input.assessmentVersion}
      and assessment_sessions.class_code = ${input.classCode}
      and assessment_sessions.status = 'active'
      and assessment_sessions.opens_at <= now()
      and (assessment_sessions.closes_at is null or assessment_sessions.closes_at > now())
    limit 1
  `;
  const session = sessions[0];
  if (!session) {
    throw new AssessmentError(
      "access_denied",
      "This class session is not open.",
      401,
    );
  }

  const attempts = await sql<AttemptRow[]>`
    insert into assessment_attempts (
      session_id,
      client_attempt_id,
      student_name,
      max_score,
      manual_max_score
    )
    values (
      ${session.session_id},
      ${input.clientAttemptId},
      ${input.studentName},
      ${session.max_score},
      ${session.manual_max_score}
    )
    on conflict (session_id, client_attempt_id)
    do update set
      student_name = case
        when assessment_attempts.status = 'started' then excluded.student_name
        else assessment_attempts.student_name
      end,
      updated_at = case
        when assessment_attempts.status = 'started' then now()
        else assessment_attempts.updated_at
      end
    returning
      id as attempt_id,
      public_id as attempt_public_id,
      status,
      score,
      automatic_score,
      max_score,
      manual_max_score,
      grading_status,
      submitted_at
  `;
  const attempt = attempts[0];

  return {
    attemptId: attempt.attempt_public_id,
    clientAttemptId: input.clientAttemptId,
    sessionId: session.session_public_id,
    assessmentSlug: session.assessment_slug,
    assessmentVersion: session.assessment_version,
    studentName: input.studentName,
    status: attempt.status,
    maxScore: attempt.max_score,
  };
}

export async function submitAttempt(
  input: SubmitAssessmentInput,
): Promise<SubmitAssessmentResult> {
  const sql = getDatabase();
  const attempts = await sql<(AttemptRow & { scorer_key: string })[]>`
    select
      assessment_attempts.id as attempt_id,
      assessment_attempts.public_id as attempt_public_id,
      assessment_attempts.status,
      assessment_attempts.score,
      assessment_attempts.automatic_score,
      assessment_attempts.max_score,
      assessment_attempts.manual_max_score,
      assessment_attempts.grading_status,
      assessment_attempts.submitted_at,
      assessment_attempts.answers,
      assessment_definitions.scorer_key
    from assessment_attempts
    join assessment_sessions
      on assessment_sessions.id = assessment_attempts.session_id
    join assessment_definitions
      on assessment_definitions.id = assessment_sessions.assessment_id
    where assessment_attempts.public_id = ${input.attemptId}
      and assessment_attempts.client_attempt_id = ${input.clientAttemptId}
    limit 1
  `;
  const attempt = attempts[0];
  if (!attempt) {
    throw new AssessmentError("attempt_not_found", "This test attempt was not found.", 404);
  }

  if (attempt.status === "submitted") {
    return {
      attemptId: attempt.attempt_public_id,
      submittedAt: attempt.submitted_at?.toISOString() ?? new Date().toISOString(),
      duplicate: true,
      answers: parseAnswerSnapshot(attempt.answers),
    };
  }

  const result = scoreAssessment(attempt.scorer_key, input.answers);
  const updated = await sql<AttemptRow[]>`
    update assessment_attempts
    set
      answers = ${sql.json(input.answers)},
      automatic_score = ${result.automaticScore},
      manual_score = null,
      score = ${result.manualMaxScore === 0 ? result.automaticScore : null},
      max_score = ${result.totalMaxScore},
      manual_max_score = ${result.manualMaxScore},
      grading_status = ${result.manualMaxScore === 0 ? "not_required" : "pending"},
      score_breakdown = ${sql.json(result.breakdown)},
      status = 'submitted',
      submitted_at = now(),
      updated_at = now()
    where id = ${attempt.attempt_id}
      and status = 'started'
    returning
      id as attempt_id,
      public_id as attempt_public_id,
      status,
      score,
      automatic_score,
      max_score,
      manual_max_score,
      grading_status,
      submitted_at
  `;
  const submittedAttempt = updated[0];

  if (!submittedAttempt) {
    const concurrent = await sql<AttemptRow[]>`
      select
        id as attempt_id,
        public_id as attempt_public_id,
        status,
        score,
        automatic_score,
        max_score,
        manual_max_score,
        grading_status,
        submitted_at,
        answers
      from assessment_attempts
      where id = ${attempt.attempt_id}
      limit 1
    `;
    const existing = concurrent[0];
    if (existing?.status === "submitted") {
      return {
        attemptId: existing.attempt_public_id,
        submittedAt: existing.submitted_at?.toISOString() ?? new Date().toISOString(),
        duplicate: true,
        answers: parseAnswerSnapshot(existing.answers),
      };
    }
    throw new AssessmentError("submission_conflict", "The test could not be submitted.", 409);
  }

  return {
    attemptId: submittedAttempt.attempt_public_id,
    submittedAt: submittedAttempt.submitted_at?.toISOString() ?? new Date().toISOString(),
    duplicate: false,
    answers: input.answers,
  };
}

export async function reviewAttempt(
  input: ReviewAssessmentInput,
): Promise<ReviewAssessmentResult> {
  const sql = getDatabase();
  const attempts = await sql<ReviewAttemptRow[]>`
    select
      public_id as attempt_public_id,
      status,
      answers
    from assessment_attempts
    where public_id = ${input.attemptId}
      and client_attempt_id = ${input.clientAttemptId}
    limit 1
  `;
  const attempt = attempts[0];

  if (!attempt) {
    throw new AssessmentError("attempt_not_found", "This test attempt was not found.", 404);
  }
  if (attempt.status !== "submitted" || !attempt.answers) {
    throw new AssessmentError(
      "attempt_not_submitted",
      "Submitted answers are not available for this test attempt.",
      409,
    );
  }

  return {
    attemptId: attempt.attempt_public_id,
    status: "submitted",
    answers: parseAnswerSnapshot(attempt.answers),
  };
}
