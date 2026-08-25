# Assessment backend

The assessment module separates test definitions, classroom sessions, and student attempts. A new class reuses the same scorer and endpoints. A new test version adds one scorer and one database definition.

## Setup on Vercel

1. Add a PostgreSQL integration from the Vercel Storage Marketplace.
2. Use its pooled connection string as `DATABASE_URL`.
3. For a new database, run [`database/assessment-schema.sql`](../database/assessment-schema.sql). For the existing deployment, apply [`database/assessment-v3-migration.sql`](../database/assessment-v3-migration.sql); the earlier manual-marking migration remains available for databases still on v1.
4. Add `TEACHER_DASHBOARD_CODE` and a long random `TEACHER_SESSION_SECRET` in Vercel project environment variables.
5. Redeploy the project.

Do not use a direct, unpooled database URL from a Vercel Function. The database adapter uses one connection per warm function instance and disables prepared statements for transaction pooler compatibility.

## Frontend interface

Reusable browser functions live in `lib/assessments/client.ts`:

```ts
await startAssessment({
  assessmentSlug: "year8-dt-45",
  assessmentVersion: "v3",
  classCode: "year8-default",
  accessCode: "START",
  studentName: "Student name",
  clientAttemptId: crypto.randomUUID(),
});

await submitAssessment({
  attemptId,
  clientAttemptId,
  answers: {
    radios: { q5a: "phishing" },
    checkboxes: ["p1:school"],
    placements: { "drag-2": "hardware-0" },
    shortAnswers: { "data-interception": "The data was copied while travelling..." },
  },
});
```

`clientAttemptId` is stored in localStorage. Together with the classroom session it makes starting and retrying an attempt idempotent.

## HTTP interface

### Start or resume an attempt

`POST /api/assessments/start`

```json
{
  "assessmentSlug": "year8-dt-45",
  "assessmentVersion": "v3",
  "classCode": "year8-default",
  "accessCode": "START",
  "studentName": "Student name",
  "clientAttemptId": "4d9e6159-ec96-47f9-8d13-2fc660be9369"
}
```

### Submit an attempt

`POST /api/assessments/submit`

```json
{
  "attemptId": "server-issued-public-uuid",
  "clientAttemptId": "browser-issued-uuid",
  "answers": {
    "radios": {},
    "checkboxes": [],
    "placements": {},
    "shortAnswers": {}
  }
}
```

The server selects the scorer from the database definition, calculates the automatic section, stores the short answers, and atomically changes the attempt from `started` to `submitted`. Tests with short answers enter `pending` grading and do not receive a final score until a teacher marks them. Submission retries remain idempotent.

### Teacher dashboard

Open `/teacher-dashboard` and enter `TEACHER_DASHBOARD_CODE`. The server sets an 8-hour HttpOnly session cookie. The sidebar contains:

- **Test results**: started, submitted, pending-marking, and final-score views.
- **Mark test**: short-answer queue, marking guide, per-question marks and feedback.

Teacher marking uses `PATCH /api/teacher/attempts/<attempt-id>/mark`. This endpoint requires the teacher session cookie and recalculates the final score inside a database transaction.

## Reuse for another class

Insert another `assessment_sessions` row with the same `assessment_id`, a unique `class_code`, a display name, and a bcrypt access-code hash. Point the class page at that `classCode`. No endpoint or scorer changes are required.

## Reuse for another test version

1. Add a scorer under `lib/assessments/scorers/`.
2. Register it in `lib/assessments/scorers/index.ts`.
3. If it has teacher-marked questions, register their prompts, mark limits, and marking guides in `lib/assessments/manual-questions.ts`. The current v3 assessment has 35 automatically marked points and four short-answer questions worth 10 points.
4. Add an `assessment_definitions` row whose `scorer_key` matches the registry key and whose `manual_max_score` matches the registered questions.
5. Create one or more classroom sessions for the definition.
