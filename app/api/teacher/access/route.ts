import { cookies } from "next/headers";
import { AssessmentError, assessmentErrorResponse } from "@/lib/assessments/errors";
import {
  createTeacherSessionToken,
  TEACHER_SESSION_COOKIE,
  TEACHER_SESSION_MAX_AGE_SECONDS,
  verifyTeacherAccessCode,
} from "@/lib/assessments/teacher-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type AccessRequest = {
  code?: unknown;
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as AccessRequest;
    const code = typeof body.code === "string" ? body.code.trim() : "";

    if (!code || code.length > 128) {
      throw new AssessmentError(
        "invalid_access_code",
        "Enter the teacher access code.",
        400,
      );
    }

    if (!verifyTeacherAccessCode(code)) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      throw new AssessmentError(
        "access_denied",
        "The teacher access code is incorrect.",
        401,
      );
    }

    const cookieStore = await cookies();
    cookieStore.set({
      name: TEACHER_SESSION_COOKIE,
      value: createTeacherSessionToken(),
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: TEACHER_SESSION_MAX_AGE_SECONDS,
    });

    return Response.json(
      { ok: true },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return assessmentErrorResponse(error);
  }
}
