import { cookies } from "next/headers";
import { AssessmentError } from "@/lib/assessments/errors";
import {
  TEACHER_SESSION_COOKIE,
  verifyTeacherSessionToken,
} from "@/lib/assessments/teacher-access";

export async function hasTeacherSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TEACHER_SESSION_COOKIE)?.value;

  try {
    return verifyTeacherSessionToken(token);
  } catch {
    return false;
  }
}

export async function requireTeacherApiSession() {
  if (!(await hasTeacherSession())) {
    throw new AssessmentError(
      "teacher_access_required",
      "Teacher access is required.",
      401,
    );
  }
}
