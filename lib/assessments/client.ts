import type {
  StartAssessmentInput,
  StartAssessmentResult,
  SubmitAssessmentInput,
  SubmitAssessmentResult,
} from "./contracts";

type ErrorPayload = { message?: string };

async function assessmentRequest<TResult extends object>(
  url: string,
  body: unknown,
): Promise<TResult> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as TResult | ErrorPayload;
  if (!response.ok) {
    throw new Error("message" in payload && payload.message ? payload.message : "Request failed.");
  }
  return payload as TResult;
}

export function startAssessment(input: StartAssessmentInput) {
  return assessmentRequest<StartAssessmentResult>("/api/assessments/start", input);
}

export function submitAssessment(input: SubmitAssessmentInput) {
  return assessmentRequest<SubmitAssessmentResult>("/api/assessments/submit", input);
}
