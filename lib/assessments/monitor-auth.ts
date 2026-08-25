import { timingSafeEqual } from "node:crypto";
import { AssessmentError } from "./errors";

export function requireMonitorAuthorization(request: Request) {
  const expected = process.env.MONITOR_API_KEY;
  if (!expected) {
    throw new AssessmentError(
      "monitor_not_configured",
      "MONITOR_API_KEY is not configured.",
      503,
    );
  }

  const authorization = request.headers.get("authorization") ?? "";
  const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  if (
    expectedBuffer.length !== providedBuffer.length ||
    !timingSafeEqual(expectedBuffer, providedBuffer)
  ) {
    throw new AssessmentError("monitor_unauthorized", "Monitor access is denied.", 401);
  }
}
