import type {
  MonitorResults,
  StartAssessmentInput,
  StartAssessmentResult,
  SubmitAssessmentInput,
  SubmitAssessmentResult,
} from "./contracts";
import { getDatabase } from "./database";
import { AssessmentError } from "./errors";
import { scoreAssessment } from "./scorers";

type SessionRow = {
  session_id: number;
  session_public_id: string;
  assessment_slug: string;
  assessment_version: string;
  scorer_key: string;
  max_score: number;
};

type AttemptRow = {
  attempt_id: number;
  attempt_public_id: string;
  status: "started" | "submitted";
  score: number | null;
  max_score: number;
  submitted_at: Date | null;
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
      assessment_definitions.max_score
    from assessment_sessions
    join assessment_definitions
      on assessment_definitions.id = assessment_sessions.assessment_id
    where assessment_definitions.slug = ${input.assessmentSlug}
      and assessment_sessions.class_code = ${input.classCode}
      and assessment_sessions.status = 'active'
      and assessment_sessions.opens_at <= now()
      and (assessment_sessions.closes_at is null or assessment_sessions.closes_at > now())
      and assessment_sessions.access_code_hash = crypt(
        ${input.accessCode},
        assessment_sessions.access_code_hash
      )
    limit 1
  `;
  const session = sessions[0];
  if (!session) {
    throw new AssessmentError(
      "access_denied",
      "The access code is incorrect or this class session is not open.",
      401,
    );
  }

  const attempts = await sql<AttemptRow[]>`
    insert into assessment_attempts (
      session_id,
      client_attempt_id,
      student_name,
      max_score
    )
    values (
      ${session.session_id},
      ${input.clientAttemptId},
      ${input.studentName},
      ${session.max_score}
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
      max_score,
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
    score: attempt.score,
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
      assessment_attempts.max_score,
      assessment_attempts.submitted_at,
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
      score: attempt.score ?? 0,
      maxScore: attempt.max_score,
      breakdown: {},
      submittedAt: attempt.submitted_at?.toISOString() ?? new Date().toISOString(),
      duplicate: true,
    };
  }

  const result = scoreAssessment(attempt.scorer_key, input.answers);
  if (result.maxScore !== attempt.max_score) {
    throw new AssessmentError(
      "score_configuration_mismatch",
      "The scorer max score does not match the database definition.",
      500,
    );
  }

  const updated = await sql<AttemptRow[]>`
    update assessment_attempts
    set
      answers = ${sql.json(input.answers)},
      score = ${result.score},
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
      max_score,
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
        max_score,
        submitted_at
      from assessment_attempts
      where id = ${attempt.attempt_id}
      limit 1
    `;
    const existing = concurrent[0];
    if (existing?.status === "submitted") {
      return {
        attemptId: existing.attempt_public_id,
        score: existing.score ?? 0,
        maxScore: existing.max_score,
        breakdown: {},
        submittedAt: existing.submitted_at?.toISOString() ?? new Date().toISOString(),
        duplicate: true,
      };
    }
    throw new AssessmentError("submission_conflict", "The test could not be submitted.", 409);
  }

  return {
    attemptId: submittedAttempt.attempt_public_id,
    score: result.score,
    maxScore: result.maxScore,
    breakdown: result.breakdown,
    submittedAt: submittedAttempt.submitted_at?.toISOString() ?? new Date().toISOString(),
    duplicate: false,
  };
}

export async function getMonitorResults(sessionPublicId: string): Promise<MonitorResults> {
  const sql = getDatabase();
  const sessions = await sql<
    {
      session_public_id: string;
      class_code: string;
      class_name: string;
      assessment_slug: string;
      assessment_version: string;
      assessment_title: string;
      max_score: number;
    }[]
  >`
    select
      assessment_sessions.public_id as session_public_id,
      assessment_sessions.class_code,
      assessment_sessions.class_name,
      assessment_definitions.slug as assessment_slug,
      assessment_definitions.version as assessment_version,
      assessment_definitions.title as assessment_title,
      assessment_definitions.max_score
    from assessment_sessions
    join assessment_definitions
      on assessment_definitions.id = assessment_sessions.assessment_id
    where assessment_sessions.public_id = ${sessionPublicId}
    limit 1
  `;
  const session = sessions[0];
  if (!session) {
    throw new AssessmentError("session_not_found", "This class session was not found.", 404);
  }

  const attempts = await sql<
    {
      attempt_public_id: string;
      student_name: string;
      status: "started" | "submitted";
      score: number | null;
      max_score: number;
      started_at: Date;
      submitted_at: Date | null;
    }[]
  >`
    select
      public_id as attempt_public_id,
      student_name,
      status,
      score,
      max_score,
      started_at,
      submitted_at
    from assessment_attempts
    where session_id = (
      select id from assessment_sessions where public_id = ${sessionPublicId}
    )
    order by submitted_at desc nulls last, started_at asc
    limit 500
  `;

  return {
    session: {
      sessionId: session.session_public_id,
      classCode: session.class_code,
      className: session.class_name,
      assessmentSlug: session.assessment_slug,
      assessmentVersion: session.assessment_version,
      assessmentTitle: session.assessment_title,
      maxScore: session.max_score,
    },
    attempts: attempts.map((attempt) => ({
      attemptId: attempt.attempt_public_id,
      studentName: attempt.student_name,
      status: attempt.status,
      score: attempt.score,
      maxScore: attempt.max_score,
      startedAt: attempt.started_at.toISOString(),
      submittedAt: attempt.submitted_at?.toISOString() ?? null,
    })),
  };
}
