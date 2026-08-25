import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDatabase } from "@/lib/assessments/database";
import {
  TEACHER_SESSION_COOKIE,
  verifyTeacherSessionToken,
} from "@/lib/assessments/teacher-access";

export const metadata: Metadata = {
  title: "Teacher Dashboard",
  description: "Hidden dashboard for assessment results.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AssessmentSummary = {
  slug: string;
  title: string;
  version: string;
  maxScore: number;
  sessionCount: number;
  attemptCount: number;
  submittedCount: number;
  averageScore: number | null;
};

type StudentResult = {
  attemptId: string;
  studentName: string;
  className: string;
  status: "started" | "submitted";
  score: number | null;
  maxScore: number;
  startedAt: Date;
  submittedAt: Date | null;
};

type DashboardData = {
  assessments: AssessmentSummary[];
  selectedAssessment: AssessmentSummary | null;
  results: StudentResult[];
};

async function getDashboardData(
  selectedSlug: string | undefined,
): Promise<DashboardData> {
  const sql = getDatabase();

  const assessments = await sql<
    {
      slug: string;
      title: string;
      version: string;
      max_score: number;
      session_count: number;
      attempt_count: number;
      submitted_count: number;
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
      round(avg(assessment_attempts.score) filter (
        where assessment_attempts.status = 'submitted'
      ), 1)::float as average_score
    from assessment_definitions
    left join assessment_sessions
      on assessment_sessions.assessment_id = assessment_definitions.id
    left join assessment_attempts
      on assessment_attempts.session_id = assessment_sessions.id
    group by
      assessment_definitions.slug,
      assessment_definitions.title,
      assessment_definitions.version,
      assessment_definitions.max_score
    order by assessment_definitions.title asc
  `;

  const mappedAssessments = assessments.map((assessment) => ({
    slug: assessment.slug,
    title: assessment.title,
    version: assessment.version,
    maxScore: assessment.max_score,
    sessionCount: assessment.session_count,
    attemptCount: assessment.attempt_count,
    submittedCount: assessment.submitted_count,
    averageScore: assessment.average_score,
  }));

  const selectedAssessment =
    mappedAssessments.find((assessment) => assessment.slug === selectedSlug) ??
    null;

  if (!selectedAssessment) {
    return {
      assessments: mappedAssessments,
      selectedAssessment: null,
      results: [],
    };
  }

  const results = await sql<
    {
      attempt_id: string;
      student_name: string;
      class_name: string;
      status: "started" | "submitted";
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
      assessment_attempts.score,
      assessment_attempts.max_score,
      assessment_attempts.started_at,
      assessment_attempts.submitted_at
    from assessment_attempts
    join assessment_sessions
      on assessment_sessions.id = assessment_attempts.session_id
    join assessment_definitions
      on assessment_definitions.id = assessment_sessions.assessment_id
    where assessment_definitions.slug = ${selectedAssessment.slug}
    order by
      assessment_attempts.submitted_at desc nulls last,
      assessment_attempts.started_at desc
    limit 500
  `;

  return {
    assessments: mappedAssessments,
    selectedAssessment,
    results: results.map((result) => ({
      attemptId: result.attempt_id,
      studentName: result.student_name,
      className: result.class_name,
      status: result.status,
      score: result.score,
      maxScore: result.max_score,
      startedAt: result.started_at,
      submittedAt: result.submitted_at,
    })),
  };
}

function formatDate(date: Date | null) {
  if (!date) {
    return "Not submitted";
  }

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getDisplayTitle(assessment: AssessmentSummary) {
  if (assessment.slug === "year8-dt-45") {
    return "Year 8 DT test";
  }

  return assessment.title;
}

export default async function TeacherDashboardPage({
  searchParams,
}: PageProps<"/teacher-dashboard">) {
  const cookieStore = await cookies();
  const token = cookieStore.get(TEACHER_SESSION_COOKIE)?.value;
  let hasAccess = false;

  try {
    hasAccess = verifyTeacherSessionToken(token);
  } catch {
    // Missing access configuration is handled by the access page's API.
  }

  if (!hasAccess) {
    redirect("/teacher-dashboard/access");
  }

  const params = await searchParams;
  const selectedSlug =
    typeof params.assessment === "string" ? params.assessment : undefined;
  const { assessments, selectedAssessment, results } =
    await getDashboardData(selectedSlug);

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fa] px-4 py-6 text-[#172033] sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <header className="flex flex-col gap-4 border-b border-[#d9e1ea] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#286899]">
              Teacher dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              Student assessment results
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="rounded-md border border-[#cfdae5] bg-white px-4 py-3 text-sm text-[#536579]">
              Teacher-only access
            </div>
            <form action="/api/teacher/logout" method="post">
              <button
                type="submit"
                className="rounded-md border border-[#cfdae5] bg-white px-4 py-3 text-sm font-semibold text-[#286899] transition hover:border-[#97b8cf] hover:bg-[#f7fbfd] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[340px_1fr]">
          <aside className="rounded-lg border border-[#d9e1ea] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Assessments</h2>
              <span className="text-sm text-[#66788a]">
                {assessments.length} total
              </span>
            </div>

            <div className="mt-4 flex flex-col gap-3">
              {assessments.map((assessment) => {
                const isSelected = selectedAssessment?.slug === assessment.slug;

                return (
                  <Link
                    key={assessment.slug}
                    href={`/teacher-dashboard?assessment=${assessment.slug}`}
                    className={`rounded-md border p-4 transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30 ${
                      isSelected
                        ? "border-[#286899] bg-[#eaf5fb]"
                        : "border-[#d9e1ea] bg-white hover:border-[#97b8cf] hover:bg-[#f7fbfd]"
                    }`}
                  >
                    <p className="font-semibold">{getDisplayTitle(assessment)}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-semibold text-[#66788a]">
                      <span>Version {assessment.version}</span>
                      <span>{assessment.maxScore} marks</span>
                      <span>{assessment.sessionCount} sessions</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </aside>

          <section className="min-w-0 rounded-lg border border-[#d9e1ea] bg-white">
            {!selectedAssessment ? (
              <div className="flex min-h-[440px] flex-col justify-center p-8">
                <p className="text-sm font-bold text-[#286899]">
                  Assessment level
                </p>
                <h2 className="mt-3 text-2xl font-semibold">
                  Select Year 8 DT test to view student marks.
                </h2>
                <p className="mt-3 max-w-xl leading-7 text-[#66788a]">
                  Student results stay hidden until an assessment is opened from
                  the assessment list.
                </p>
              </div>
            ) : (
              <div className="flex flex-col">
                <div className="border-b border-[#d9e1ea] p-5">
                  <p className="text-sm font-bold text-[#286899]">
                    {selectedAssessment.title}
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <div className="rounded-md bg-[#f5f7fa] p-4">
                      <p className="text-sm text-[#66788a]">Attempts</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {selectedAssessment.attemptCount}
                      </p>
                    </div>
                    <div className="rounded-md bg-[#f5f7fa] p-4">
                      <p className="text-sm text-[#66788a]">Submitted</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {selectedAssessment.submittedCount}
                      </p>
                    </div>
                    <div className="rounded-md bg-[#f5f7fa] p-4">
                      <p className="text-sm text-[#66788a]">Average</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {selectedAssessment.averageScore ?? "-"} /{" "}
                        {selectedAssessment.maxScore}
                      </p>
                    </div>
                    <div className="rounded-md bg-[#f5f7fa] p-4">
                      <p className="text-sm text-[#66788a]">Sessions</p>
                      <p className="mt-1 text-2xl font-semibold">
                        {selectedAssessment.sessionCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full min-w-[760px] border-collapse text-left text-sm">
                    <thead className="bg-[#f5f7fa] text-xs uppercase text-[#66788a]">
                      <tr>
                        <th className="px-5 py-3 font-semibold">Student</th>
                        <th className="px-5 py-3 font-semibold">Class</th>
                        <th className="px-5 py-3 font-semibold">Status</th>
                        <th className="px-5 py-3 font-semibold">Score</th>
                        <th className="px-5 py-3 font-semibold">Started</th>
                        <th className="px-5 py-3 font-semibold">Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-5 py-12 text-center text-[#66788a]"
                          >
                            No student attempts have been recorded yet.
                          </td>
                        </tr>
                      ) : (
                        results.map((result) => (
                          <tr
                            key={result.attemptId}
                            className="border-t border-[#e5ebf1]"
                          >
                            <td className="px-5 py-4 font-semibold">
                              {result.studentName}
                            </td>
                            <td className="px-5 py-4 text-[#536579]">
                              {result.className}
                            </td>
                            <td className="px-5 py-4">
                              <span
                                className={`rounded px-2 py-1 text-xs font-bold ${
                                  result.status === "submitted"
                                    ? "bg-[#e6f5ee] text-[#157347]"
                                    : "bg-[#fff6df] text-[#8a5a00]"
                                }`}
                              >
                                {result.status}
                              </span>
                            </td>
                            <td className="px-5 py-4 font-semibold">
                              {result.score ?? "-"} / {result.maxScore}
                            </td>
                            <td className="px-5 py-4 text-[#536579]">
                              {formatDate(result.startedAt)}
                            </td>
                            <td className="px-5 py-4 text-[#536579]">
                              {formatDate(result.submittedAt)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        </section>
      </div>
    </main>
  );
}
