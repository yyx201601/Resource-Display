import type { NextRequest } from "next/server";
import { getMonitorResults } from "@/lib/assessments/assessment-module";
import { assessmentErrorResponse } from "@/lib/assessments/errors";
import { requireMonitorAuthorization } from "@/lib/assessments/monitor-auth";
import { parseSessionId } from "@/lib/assessments/validation";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    requireMonitorAuthorization(request);
    const sessionId = parseSessionId(request.nextUrl.searchParams.get("sessionId"));
    const result = await getMonitorResults(sessionId);
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return assessmentErrorResponse(error);
  }
}
