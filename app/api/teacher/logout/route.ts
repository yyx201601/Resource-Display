import { cookies } from "next/headers";
import { TEACHER_SESSION_COOKIE } from "@/lib/assessments/teacher-access";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  const cookieStore = await cookies();
  cookieStore.delete(TEACHER_SESSION_COOKIE);

  return new Response(null, {
    status: 303,
    headers: {
      Location: new URL("/teacher-dashboard/access", request.url).toString(),
      "Cache-Control": "no-store",
    },
  });
}
