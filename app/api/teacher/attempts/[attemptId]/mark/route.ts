import { saveTeacherMark } from "@/lib/assessments/teacher-dashboard";
import { AssessmentError, assessmentErrorResponse } from "@/lib/assessments/errors";
import { requireTeacherApiSession } from "@/lib/assessments/teacher-server-auth";
import {
  parseAttemptId,
  parseTeacherMarkInput,
} from "@/lib/assessments/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: RouteContext<"/api/teacher/attempts/[attemptId]/mark">,
) {
  try {
    await requireTeacherApiSession();
    const { attemptId: rawAttemptId } = await context.params;
    const attemptId = parseAttemptId(rawAttemptId);
    const body = await request.json().catch(() => {
      throw new AssessmentError(
        "invalid_json",
        "The request body is not valid JSON.",
        400,
      );
    });
    const result = await saveTeacherMark(
      attemptId,
      parseTeacherMarkInput(body),
    );
    return Response.json(result, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    return assessmentErrorResponse(error);
  }
}
