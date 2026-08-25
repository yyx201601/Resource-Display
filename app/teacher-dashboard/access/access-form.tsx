"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type ErrorResponse = {
  message?: string;
};

export function TeacherAccessForm() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/teacher/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      if (!response.ok) {
        const result = (await response.json().catch(() => ({}))) as ErrorResponse;
        setError(result.message ?? "Teacher access is temporarily unavailable.");
        return;
      }

      router.replace("/teacher-dashboard");
    } catch {
      setError("Teacher access is temporarily unavailable.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="mt-8" onSubmit={handleSubmit}>
      <label className="block text-sm font-semibold" htmlFor="teacher-code">
        Teacher access code
      </label>
      <input
        id="teacher-code"
        name="code"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="mt-2 w-full rounded-lg border border-[#a9bfd2] bg-white px-4 py-3 text-lg outline-none transition focus:border-[#286899] focus:ring-4 focus:ring-[#2aa7c9]/20"
      />
      <p className="mt-2 text-sm text-[#66788a]">
        The code is case-sensitive. Access stays active for 8 hours.
      </p>

      {error ? (
        <p
          className="mt-5 rounded-lg border border-[#eaa5a5] bg-[#fff2f2] px-4 py-3 text-sm font-semibold text-[#a72b2b]"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="mt-6 w-full rounded-lg bg-[#0c2849] px-4 py-3 font-semibold text-white transition hover:bg-[#173f69] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30 disabled:cursor-wait disabled:opacity-60"
      >
        {isSubmitting ? "Checking…" : "Open dashboard"}
      </button>
    </form>
  );
}
