# Assessment backend

The assessment module separates test definitions, classroom sessions, and student attempts. A new class reuses the same scorer and endpoints. A new test version adds one scorer and one database definition.

## Setup on Vercel

1. Add a PostgreSQL integration from the Vercel Storage Marketplace.
2. Use its pooled connection string as `DATABASE_URL`.
3. Run [`database/assessment-schema.sql`](../database/assessment-schema.sql) in the provider SQL editor.
4. Add a long random `MONITOR_API_KEY` in Vercel project environment variables.
5. Redeploy the project.

Do not use a direct, unpooled database URL from a Vercel Function. The database adapter uses one connection per warm function instance and disables prepared statements for transaction pooler compatibility.

## Frontend interface

Reusable browser functions live in `lib/assessments/client.ts`:

```ts
await startAssessment({
  assessmentSlug: "year8-dt-45",
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
    checkboxes: ["clue:name"],
    placements: { "drag-2": "single-0" },
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
    "placements": {}
  }
}
```

The server selects the scorer from the database definition, calculates the score, and atomically changes the attempt from `started` to `submitted`. A retry returns the original saved score.

### Read Monitor results

`GET /api/assessments/results?sessionId=<session-public-uuid>`

```http
Authorization: Bearer <MONITOR_API_KEY>
```

The response includes session metadata and up to 500 started or submitted attempts. Use `Cache-Control: no-store` and poll every 3-5 seconds for a classroom Monitor.

## Reuse for another class

Insert another `assessment_sessions` row with the same `assessment_id`, a unique `class_code`, a display name, and a bcrypt access-code hash. Point the class page at that `classCode`. No endpoint or scorer changes are required.

## Reuse for another test version

1. Add a scorer under `lib/assessments/scorers/`.
2. Register it in `lib/assessments/scorers/index.ts`.
3. Add an `assessment_definitions` row whose `scorer_key` matches the registry key.
4. Create one or more classroom sessions for the definition.
