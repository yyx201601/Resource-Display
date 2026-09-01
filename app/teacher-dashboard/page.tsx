import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MarkingForm } from "./marking-form";
import { hasTeacherSession } from "@/lib/assessments/teacher-server-auth";
import {
  getAssessmentSummaries,
  getMarkingAttempt,
  getMarkingQueue,
  getStudentResults,
  type AssessmentSummary,
  type GradingStatus,
} from "@/lib/assessments/teacher-dashboard";

export const metadata: Metadata = {
  title: "Teacher Dashboard",
  description: "Teacher-only assessment results and marking.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type DashboardView = "results" | "mark";
type ResultsSort = "default" | "name" | "score";
type SortDirection = "asc" | "desc";

function formatDate(date: Date | null) {
  if (!date) {
    return "Not submitted";
  }

  return new Intl.DateTimeFormat("en-AU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function getAssessmentName(assessment: AssessmentSummary) {
  return assessment.slug === "year8-dt-45"
    ? "Year 8 DT test"
    : assessment.title;
}

function resultStatus(
  status: "started" | "submitted",
  gradingStatus: GradingStatus,
) {
  if (status === "started") {
    return { label: "In progress", classes: "bg-[#fff6df] text-[#8a5a00]" };
  }
  if (gradingStatus === "pending") {
    return { label: "Pending marking", classes: "bg-[#eaf5fb] text-[#286899]" };
  }
  return { label: "Complete", classes: "bg-[#e6f5ee] text-[#157347]" };
}

function questionStatus(score: number, maxScore: number) {
  if (score === maxScore) {
    return {
      label: "Correct",
      classes: "bg-[#e6f5ee] text-[#157347]",
    };
  }

  if (score === 0) {
    return {
      label: "Incorrect",
      classes: "bg-[#fff2f2] text-[#a72b2b]",
    };
  }

  return {
    label: "Partial",
    classes: "bg-[#fff6df] text-[#8a5a00]",
  };
}

function sortResults<T extends { studentName: string; score: number | null }>(
  results: T[],
  sort: ResultsSort,
  direction: SortDirection,
) {
  if (sort === "default") {
    return results;
  }

  const multiplier = direction === "asc" ? 1 : -1;

  return [...results].sort((left, right) => {
    if (sort === "name") {
      return (
        left.studentName.localeCompare(right.studentName, "en-AU", {
          sensitivity: "base",
        }) * multiplier
      );
    }

    const leftScore = left.score ?? -1;
    const rightScore = right.score ?? -1;
    if (leftScore === rightScore) {
      return left.studentName.localeCompare(right.studentName, "en-AU", {
        sensitivity: "base",
      });
    }

    return (leftScore - rightScore) * multiplier;
  });
}

function sortHref({
  assessmentKey,
  sort,
  currentSort,
  currentDirection,
}: {
  assessmentKey: string;
  sort: Exclude<ResultsSort, "default">;
  currentSort: ResultsSort;
  currentDirection: SortDirection;
}) {
  const nextDirection =
    currentSort === sort && currentDirection === "asc" ? "desc" : "asc";
  const params = new URLSearchParams({
    assessment: assessmentKey,
    sort,
    dir: nextDirection,
  });

  return `/teacher-dashboard?${params.toString()}`;
}

function sortLabel(
  sort: Exclude<ResultsSort, "default">,
  currentSort: ResultsSort,
  currentDirection: SortDirection,
) {
  if (sort !== currentSort) {
    return "↕";
  }

  return currentDirection === "asc" ? "↑" : "↓";
}

function Sidebar({ view, pendingCount }: { view: DashboardView; pendingCount: number }) {
  const links = [
    { view: "results" as const, label: "Test results", href: "/teacher-dashboard" },
    { view: "mark" as const, label: "Mark test", href: "/teacher-dashboard?view=mark" },
  ];

  return (
    <aside className="rounded-xl border border-[#d9e1ea] bg-white p-3 lg:sticky lg:top-6 lg:self-start">
      <nav className="grid grid-cols-2 gap-2 lg:grid-cols-1" aria-label="Teacher dashboard">
        {links.map((link) => {
          const isActive = link.view === view;
          return (
            <Link
              key={link.view}
              href={link.href}
              aria-current={isActive ? "page" : undefined}
              className={`flex min-h-12 items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30 ${
                isActive
                  ? "bg-[#0c2849] text-white"
                  : "text-[#34495e] hover:bg-[#eef4f8]"
              }`}
            >
              <span>{link.label}</span>
              {link.view === "mark" && pendingCount > 0 ? (
                <span
                  className={`ml-3 rounded-md px-2 py-0.5 text-xs ${
                    isActive
                      ? "bg-white text-[#0c2849]"
                      : "bg-[#dcecf5] text-[#286899]"
                  }`}
                >
                  {pendingCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <form className="mt-3 border-t border-[#e5ebf1] pt-3" action="/api/teacher/logout" method="post">
        <button
          type="submit"
          className="w-full rounded-lg px-4 py-3 text-left text-sm font-semibold text-[#286899] transition hover:bg-[#eef4f8] active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30"
        >
          Sign out
        </button>
      </form>
    </aside>
  );
}

async function ResultsView({
  assessments,
  selectedKey,
  sort,
  direction,
}: {
  assessments: AssessmentSummary[];
  selectedKey: string | undefined;
  sort: ResultsSort;
  direction: SortDirection;
}) {
  const selectedAssessment =
    assessments.find((assessment) => assessment.key === selectedKey) ??
    assessments[0] ??
    null;
  const unsortedResults = selectedAssessment
    ? await getStudentResults(
        selectedAssessment.slug,
        selectedAssessment.version,
      )
    : [];
  const results = sortResults(unsortedResults, sort, direction);

  if (!selectedAssessment) {
    return (
      <section className="rounded-xl border border-[#d9e1ea] bg-white p-8">
        <h2 className="text-xl font-semibold">No assessments configured</h2>
        <p className="mt-2 text-[#66788a]">
          Run the assessment database setup before opening results.
        </p>
      </section>
    );
  }

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-[#d9e1ea] bg-white">
      <div className="border-b border-[#d9e1ea] p-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <h2 className="text-2xl font-semibold">Test results</h2>
            <p className="mt-1 text-sm text-[#66788a]">
              {getAssessmentName(selectedAssessment)} · Version {selectedAssessment.version}
            </p>
          </div>
          {assessments.length > 1 ? (
            <nav className="flex flex-wrap gap-2" aria-label="Assessment versions">
              {assessments.map((assessment) => (
                <Link
                  key={assessment.key}
                  href={`/teacher-dashboard?assessment=${encodeURIComponent(assessment.key)}&sort=${sort}&dir=${direction}`}
                  className={`rounded-lg border px-3 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30 ${
                    assessment.key === selectedAssessment.key
                      ? "border-[#286899] bg-[#eaf5fb] text-[#174f78]"
                      : "border-[#d9e1ea] text-[#536579] hover:bg-[#f5f7fa]"
                  }`}
                >
                  {assessment.version}
                </Link>
              ))}
            </nav>
          ) : null}
        </div>

        <dl className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-lg bg-[#f5f7fa] p-4">
            <dt className="text-sm text-[#66788a]">Attempts</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {selectedAssessment.attemptCount}
            </dd>
          </div>
          <div className="rounded-lg bg-[#f5f7fa] p-4">
            <dt className="text-sm text-[#66788a]">Submitted</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {selectedAssessment.submittedCount}
            </dd>
          </div>
          <div className="rounded-lg bg-[#f5f7fa] p-4">
            <dt className="text-sm text-[#66788a]">Pending marking</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {selectedAssessment.pendingMarkCount}
            </dd>
          </div>
          <div className="rounded-lg bg-[#f5f7fa] p-4">
            <dt className="text-sm text-[#66788a]">Average final score</dt>
            <dd className="mt-1 text-2xl font-semibold">
              {selectedAssessment.averageScore ?? "-"} / {selectedAssessment.maxScore}
            </dd>
          </div>
        </dl>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-sm">
          <thead className="bg-[#f5f7fa] text-xs uppercase text-[#66788a]">
            <tr>
              <th className="px-5 py-3 font-semibold">
                <Link
                  href={sortHref({
                    assessmentKey: selectedAssessment.key,
                    sort: "name",
                    currentSort: sort,
                    currentDirection: direction,
                  })}
                  className="inline-flex items-center gap-2 rounded px-1 py-0.5 transition hover:text-[#286899] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30"
                >
                  Student
                  <span aria-hidden="true">
                    {sortLabel("name", sort, direction)}
                  </span>
                </Link>
              </th>
              <th className="px-5 py-3 font-semibold">Class</th>
              <th className="px-5 py-3 font-semibold">Status</th>
              <th className="px-5 py-3 font-semibold">
                <Link
                  href={sortHref({
                    assessmentKey: selectedAssessment.key,
                    sort: "score",
                    currentSort: sort,
                    currentDirection: direction,
                  })}
                  className="inline-flex items-center gap-2 rounded px-1 py-0.5 transition hover:text-[#286899] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30"
                >
                  Final score
                  <span aria-hidden="true">
                    {sortLabel("score", sort, direction)}
                  </span>
                </Link>
              </th>
              <th className="px-5 py-3 font-semibold">Started</th>
              <th className="px-5 py-3 font-semibold">Submitted</th>
            </tr>
          </thead>
          <tbody>
            {results.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-12 text-center text-[#66788a]">
                  No student attempts have been recorded for this version.
                </td>
              </tr>
            ) : (
              results.map((result) => {
                const status = resultStatus(result.status, result.gradingStatus);
                return (
                  <tr key={result.attemptId} className="border-t border-[#e5ebf1]">
                    <td className="px-5 py-4 font-semibold">{result.studentName}</td>
                    <td className="px-5 py-4 text-[#536579]">{result.className}</td>
                    <td className="px-5 py-4">
                      <span className={`rounded-md px-2 py-1 text-xs font-bold ${status.classes}`}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-semibold">
                      {result.score === null ? "Pending" : `${result.score} / ${result.maxScore}`}
                    </td>
                    <td className="px-5 py-4 text-[#536579]">{formatDate(result.startedAt)}</td>
                    <td className="px-5 py-4 text-[#536579]">{formatDate(result.submittedAt)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

async function MarkView({ selectedAttemptId }: { selectedAttemptId: string | undefined }) {
  const queue = await getMarkingQueue();
  const selectedQueueItem =
    queue.find((attempt) => attempt.attemptId === selectedAttemptId) ??
    queue.find((attempt) => attempt.gradingStatus === "pending") ??
    queue[0] ??
    null;
  const selectedAttempt = selectedQueueItem
    ? await getMarkingAttempt(selectedQueueItem.attemptId)
    : null;
  const pendingCount = queue.filter(
    (attempt) => attempt.gradingStatus === "pending",
  ).length;

  if (!selectedAttempt) {
    return (
      <section className="rounded-xl border border-[#d9e1ea] bg-white p-8">
        <h2 className="text-xl font-semibold">No tests need marking</h2>
        <p className="mt-2 max-w-xl text-[#66788a]">
          Submitted tests with short answers will appear here automatically.
        </p>
      </section>
    );
  }

  return (
    <section className="grid min-w-0 gap-5 xl:grid-cols-[300px_minmax(0,1fr)]">
      <aside className="self-start overflow-hidden rounded-xl border border-[#d9e1ea] bg-white xl:sticky xl:top-6">
        <div className="border-b border-[#d9e1ea] p-4">
          <h2 className="font-semibold">Mark test</h2>
          <p className="mt-1 text-sm text-[#66788a]">
            {pendingCount} pending · {queue.length} total
          </p>
        </div>
        <nav className="max-h-[68dvh] overflow-y-auto p-2" aria-label="Submitted tests">
          {queue.map((attempt) => {
            const isSelected = attempt.attemptId === selectedAttempt.attemptId;
            return (
              <Link
                key={attempt.attemptId}
                href={`/teacher-dashboard?view=mark&attempt=${attempt.attemptId}`}
                className={`mb-1 block rounded-lg px-3 py-3 transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30 ${
                  isSelected ? "bg-[#eaf5fb]" : "hover:bg-[#f5f7fa]"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <p className="font-semibold">{attempt.studentName}</p>
                  <span className={`rounded-md px-2 py-0.5 text-xs font-bold ${
                    attempt.gradingStatus === "pending"
                      ? "bg-[#fff6df] text-[#8a5a00]"
                      : "bg-[#e6f5ee] text-[#157347]"
                  }`}>
                    {attempt.gradingStatus === "pending" ? "Pending" : "Marked"}
                  </span>
                </div>
                <p className="mt-1 text-xs text-[#66788a]">{attempt.className}</p>
                <p className="mt-1 text-xs text-[#66788a]">{formatDate(attempt.submittedAt)}</p>
              </Link>
            );
          })}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="mb-5 rounded-xl border border-[#d9e1ea] bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#286899]">{selectedAttempt.className}</p>
              <h2 className="mt-1 text-2xl font-semibold">{selectedAttempt.studentName}</h2>
              <p className="mt-2 text-sm text-[#66788a]">
                {selectedAttempt.assessmentTitle} · Version {selectedAttempt.assessmentVersion} · Submitted {formatDate(selectedAttempt.submittedAt)}
              </p>
            </div>
            <div className="rounded-lg bg-[#f5f7fa] px-4 py-3 text-right">
              <p className="text-xs font-semibold text-[#66788a]">Current result</p>
              <p className="mt-1 text-lg font-semibold">
                {selectedAttempt.score === null
                  ? "Pending"
                  : `${selectedAttempt.score} / ${selectedAttempt.maxScore}`}
              </p>
            </div>
          </div>
        </header>

        {selectedAttempt.automaticQuestions.length > 0 ? (
          <details className="mb-5 overflow-hidden rounded-xl border border-[#d9e1ea] bg-white">
            <summary className="cursor-pointer list-none border-b border-[#d9e1ea] p-5 marker:hidden">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-xl font-semibold">Automatic questions</h3>
                  <p className="mt-1 text-sm text-[#66788a]">
                    Folded by default. Open to review question correctness.
                  </p>
                </div>
                <span className="rounded-lg bg-[#f5f7fa] px-3 py-2 text-sm font-semibold text-[#536579]">
                  {selectedAttempt.automaticScore} /{" "}
                  {selectedAttempt.automaticMaxScore} automatic
                </span>
              </div>
            </summary>

            <div className="divide-y divide-[#e5ebf1]">
              {selectedAttempt.automaticQuestions.map((question) => {
                const status = questionStatus(question.score, question.maxScore);

                return (
                  <article key={question.key} className="p-5">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold">{question.label}</p>
                          <span className="rounded bg-[#f5f7fa] px-2 py-1 text-xs font-semibold text-[#66788a]">
                            {question.kind.replace("_", " ")}
                          </span>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:items-end">
                        <span className={`rounded-md px-2 py-1 text-xs font-bold ${status.classes}`}>
                          {status.label}
                        </span>
                        <span className="text-sm font-semibold text-[#25364a]">
                          {question.score} / {question.maxScore}
                        </span>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </details>
        ) : null}

        <MarkingForm key={selectedAttempt.attemptId} attempt={selectedAttempt} />
      </div>
    </section>
  );
}

export default async function TeacherDashboardPage({
  searchParams,
}: PageProps<"/teacher-dashboard">) {
  if (!(await hasTeacherSession())) {
    redirect("/teacher-dashboard/access");
  }

  const params = await searchParams;
  const view: DashboardView = params.view === "mark" ? "mark" : "results";
  const selectedKey =
    typeof params.assessment === "string" ? params.assessment : undefined;
  const selectedAttemptId =
    typeof params.attempt === "string" ? params.attempt : undefined;
  const sort: ResultsSort =
    params.sort === "name" || params.sort === "score" ? params.sort : "default";
  const direction: SortDirection = params.dir === "desc" ? "desc" : "asc";
  const assessments = await getAssessmentSummaries();
  const pendingCount = assessments.reduce(
    (total, assessment) => total + assessment.pendingMarkCount,
    0,
  );

  return (
    <main className="min-h-[100dvh] bg-[#f5f7fa] px-4 py-6 text-[#172033] sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="mb-6 flex flex-col gap-4 border-b border-[#d9e1ea] pb-6 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-bold text-[#286899]">Teacher dashboard</p>
            <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">
              {view === "mark" ? "Mark student tests" : "Assessment results"}
            </h1>
          </div>
          <p className="text-sm text-[#66788a]">Teacher-only access</p>
        </header>

        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <Sidebar view={view} pendingCount={pendingCount} />
          {view === "mark" ? (
            <MarkView selectedAttemptId={selectedAttemptId} />
          ) : (
            <ResultsView
              assessments={assessments}
              selectedKey={selectedKey}
              sort={sort}
              direction={direction}
            />
          )}
        </div>
      </div>
    </main>
  );
}
