import { createHmac, timingSafeEqual } from "node:crypto";
import { AssessmentError } from "@/lib/assessments/errors";

export const TEACHER_SESSION_COOKIE = "teacher_dashboard_session";
export const TEACHER_SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

const SESSION_PURPOSE = "teacher-dashboard";

function getRequiredEnvironmentValue(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new AssessmentError(
      "teacher_access_not_configured",
      `Teacher access is not configured. Add ${name} to the server environment.`,
      503,
    );
  }

  return value;
}

function constantTimeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

function signSessionExpiry(expiresAt: string) {
  const secret = getRequiredEnvironmentValue("MONITOR_API_KEY");

  return createHmac("sha256", secret)
    .update(`${SESSION_PURPOSE}:${expiresAt}`)
    .digest("base64url");
}

export function verifyTeacherAccessCode(candidate: string) {
  const expected = getRequiredEnvironmentValue("TEACHER_DASHBOARD_CODE");
  return constantTimeEqual(candidate, expected);
}

export function createTeacherSessionToken(now = Date.now()) {
  const expiresAt = String(
    now + TEACHER_SESSION_MAX_AGE_SECONDS * 1000,
  );
  return `${expiresAt}.${signSessionExpiry(expiresAt)}`;
}

export function verifyTeacherSessionToken(
  token: string | undefined,
  now = Date.now(),
) {
  if (!token) {
    return false;
  }

  const separatorIndex = token.indexOf(".");
  if (separatorIndex <= 0) {
    return false;
  }

  const expiresAt = token.slice(0, separatorIndex);
  const signature = token.slice(separatorIndex + 1);
  const expiresAtNumber = Number(expiresAt);

  if (!Number.isSafeInteger(expiresAtNumber) || expiresAtNumber <= now) {
    return false;
  }

  return constantTimeEqual(signature, signSessionExpiry(expiresAt));
}
