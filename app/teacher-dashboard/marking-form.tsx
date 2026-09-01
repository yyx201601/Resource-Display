"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import type { MarkingAttempt } from "@/lib/assessments/teacher-dashboard";

type MarkingFormProps = {
  attempt: MarkingAttempt;
};

type ErrorResponse = {
  message?: string;
};

export function MarkingForm({ attempt }: MarkingFormProps) {
  const router = useRouter();
  const [scores, setScores] = useState<Record<string, string>>(
    Object.fromEntries(
      attempt.questions.map((question) => [
        question.questionKey,
        question.score === null ? "" : String(question.score),
      ]),
    ),
  );
  const [questionFeedback, setQuestionFeedback] = useState<
    Record<string, string>
  >(
    Object.fromEntries(
      attempt.questions.map((question) => [
        question.questionKey,
        question.feedback,
      ]),
    ),
  );
  const [overallFeedback, setOverallFeedback] = useState(
    attempt.teacherFeedback,
  );
  const [statusMessage, setStatusMessage] = useState("");
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatusMessage("");

    const marks = attempt.questions.map((question) => ({
      questionKey: question.questionKey,
      score: Number(scores[question.questionKey]),
      feedback: questionFeedback[question.questionKey] ?? "",
    }));

    if (
      marks.some(
        (mark, index) =>
          scores[mark.questionKey] === "" ||
          !Number.isInteger(mark.score) ||
          mark.score < 0 ||
          mark.score > attempt.questions[index].maxScore,
      )
    ) {
      setError("Enter a valid whole-number mark for every short answer.");
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(
        `/api/teacher/attempts/${attempt.attemptId}/mark`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ marks, feedback: overallFeedback }),
        },
      );

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as ErrorResponse;
        setError(result.message ?? "The marks could not be saved.");
        return;
      }

      setStatusMessage("Marks saved. The final result is now available here.");
      router.refresh();
    } catch {
      setError("The marks could not be saved. Check the connection and try again.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {attempt.questions.map((question) => (
        <section
          key={question.questionKey}
          className="rounded-xl border border-[#d9e1ea] bg-white p-5"
        >
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-sm font-bold text-[#286899]">
                {question.label}
              </p>
              <h3 className="mt-1 max-w-3xl text-lg font-semibold leading-7">
                {question.prompt}
              </h3>
            </div>
            <span className="shrink-0 text-sm font-semibold text-[#536579]">
              {question.maxScore} marks
            </span>
          </div>

          <div className="mt-4 rounded-lg bg-[#f5f7fa] p-4">
            <p className="text-xs font-bold uppercase tracking-[0.08em] text-[#66788a]">
              Student response
            </p>
            <p className="mt-2 whitespace-pre-wrap leading-7 text-[#25364a]">
              {question.response || "No response submitted."}
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-[150px_1fr]">
            <div>
              <label
                className="block text-sm font-semibold"
                htmlFor={`score-${question.questionKey}`}
              >
                Mark
              </label>
              <div className="mt-2 flex items-center gap-2">
                <input
                  id={`score-${question.questionKey}`}
                  type="number"
                  min={0}
                  max={question.maxScore}
                  step={1}
                  required
                  value={scores[question.questionKey]}
                  onChange={(event) =>
                    setScores((current) => ({
                      ...current,
                      [question.questionKey]: event.target.value,
                    }))
                  }
                  className="w-20 rounded-lg border border-[#a9bfd2] bg-white px-3 py-2 text-base outline-none focus:border-[#286899] focus:ring-4 focus:ring-[#2aa7c9]/20"
                />
                <span className="text-sm text-[#66788a]">
                  / {question.maxScore}
                </span>
              </div>
            </div>
            <div>
              <label
                className="block text-sm font-semibold"
                htmlFor={`feedback-${question.questionKey}`}
              >
                Question feedback (optional)
              </label>
              <textarea
                id={`feedback-${question.questionKey}`}
                maxLength={2000}
                rows={3}
                value={questionFeedback[question.questionKey]}
                onChange={(event) =>
                  setQuestionFeedback((current) => ({
                    ...current,
                    [question.questionKey]: event.target.value,
                  }))
                }
                className="mt-2 w-full resize-y rounded-lg border border-[#a9bfd2] bg-white px-3 py-2 outline-none focus:border-[#286899] focus:ring-4 focus:ring-[#2aa7c9]/20"
              />
            </div>
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-[#d9e1ea] bg-white p-5">
        <label className="block font-semibold" htmlFor="overall-feedback">
          Overall feedback (optional)
        </label>
        <textarea
          id="overall-feedback"
          maxLength={2000}
          rows={4}
          value={overallFeedback}
          onChange={(event) => setOverallFeedback(event.target.value)}
          className="mt-2 w-full resize-y rounded-lg border border-[#a9bfd2] bg-white px-3 py-2 outline-none focus:border-[#286899] focus:ring-4 focus:ring-[#2aa7c9]/20"
        />

        {error ? (
          <p
            className="mt-4 rounded-lg border border-[#eaa5a5] bg-[#fff2f2] px-4 py-3 text-sm font-semibold text-[#a72b2b]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {statusMessage ? (
          <p
            className="mt-4 rounded-lg border border-[#abd6c5] bg-[#eaf7f1] px-4 py-3 text-sm font-semibold text-[#157347]"
            role="status"
          >
            {statusMessage}
          </p>
        ) : null}

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <p className="text-sm text-[#536579]">
            Automatic section: {attempt.automaticScore} /{" "}
            {attempt.automaticMaxScore}. The final score is calculated after
            saving all short-answer marks.
          </p>
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-lg bg-[#0c2849] px-5 py-3 font-semibold text-white transition hover:bg-[#173f69] active:translate-y-px focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30 disabled:cursor-wait disabled:opacity-60"
          >
            {isSaving ? "Saving marks..." : "Save marks"}
          </button>
        </div>
      </section>
    </form>
  );
}
