import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { TeacherAccessForm } from "./access-form";
import {
  TEACHER_SESSION_COOKIE,
  verifyTeacherSessionToken,
} from "@/lib/assessments/teacher-access";

export const metadata: Metadata = {
  title: "Teacher Access",
  description: "Access the teacher assessment dashboard.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function TeacherAccessPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(TEACHER_SESSION_COOKIE)?.value;
  let hasAccess = false;

  try {
    hasAccess = verifyTeacherSessionToken(token);
  } catch {
    // The form's API response will explain any missing server configuration.
  }

  if (hasAccess) {
    redirect("/teacher-dashboard");
  }

  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-[#f5f7fa] px-4 py-10 text-[#172033]">
      <section className="w-full max-w-md rounded-xl border border-[#d9e1ea] bg-white p-6 shadow-sm sm:p-8">
        <p className="text-sm font-bold text-[#286899]">Teacher access</p>
        <h1 className="mt-2 text-3xl font-semibold">Open results dashboard</h1>
        <p className="mt-3 leading-7 text-[#66788a]">
          Enter the private code configured for teachers. Students do not need
          an account.
        </p>
        <TeacherAccessForm />
      </section>
    </main>
  );
}
