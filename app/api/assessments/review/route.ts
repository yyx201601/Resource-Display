import { reviewAttempt } from "@/lib/assessments/assessment-module";
import { AssessmentError, assessmentErrorResponse } from "@/lib/assessments/errors";
import { parseReviewAssessmentInput } from "@/lib/assessments/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => {
      throw new AssessmentError("invalid_json", "The request body is not valid JSON.", 400);
    });
    const result = await reviewAttempt(parseReviewAssessmentInput(body));
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return assessmentErrorResponse(error);
  }
}
