"use client";

import { FormEvent, useState } from "react";
import { startAssessment } from "@/lib/assessments/client";

const ASSESSMENT_SLUG = "year8-dt-45";
const ASSESSMENT_VERSION = "v3";
const CLASS_CODE = "year8-default";
const ACCESS_CODE = "START";

type FormErrors = {
  name?: string;
  code?: string;
  form?: string;
};

export default function AccessForm() {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [isEntering, setIsEntering] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedName = name.trim();
    const nextErrors: FormErrors = {};

    if (!trimmedName) {
      nextErrors.name = "Enter your name to continue.";
    }

    if (!code.trim()) {
      nextErrors.code = "Enter the access code provided by your teacher.";
    } else if (code.trim().toUpperCase() !== ACCESS_CODE) {
      nextErrors.code = "The access code is incorrect.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    setErrors({});
    setIsEntering(true);

    try {
      const attemptStorageKey = [
        "assessmentClientAttempt",
        ASSESSMENT_SLUG,
        ASSESSMENT_VERSION,
        CLASS_CODE,
        trimmedName.toLowerCase(),
      ].join(":");
      let clientAttemptId = localStorage.getItem(attemptStorageKey);
      if (!clientAttemptId || !/^[0-9a-f-]{36}$/i.test(clientAttemptId)) {
        clientAttemptId = crypto.randomUUID();
        localStorage.setItem(attemptStorageKey, clientAttemptId);
      }
      const access = await startAssessment({
        assessmentSlug: ASSESSMENT_SLUG,
        assessmentVersion: ASSESSMENT_VERSION,
        classCode: CLASS_CODE,
        studentName: trimmedName,
        clientAttemptId,
      });
      sessionStorage.setItem(
        "year8TestAccess",
        JSON.stringify({ ...access, name: access.studentName }),
      );
      // The destination is a rewritten standalone HTML document, so it needs a full navigation.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.assign("/Year8-DT/test/exam");
    } catch (error) {
      setIsEntering(false);
      setErrors({
        form:
          error instanceof Error
            ? error.message
            : "The test could not be opened. Please try again.",
      });
    }
  }

  return (
    <main className="min-h-[100dvh] flex-1 bg-[#f4f8fb] text-[#172033] dark:bg-[#071321] dark:text-[#eef7fb]">
      <div className="mx-auto grid min-h-[100dvh] w-full max-w-[1180px] lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch">
        <section className="relative flex flex-col justify-between overflow-hidden bg-[#0b1f3a] px-6 py-9 text-white sm:px-10 sm:py-12 lg:my-8 lg:ml-8 lg:rounded-2xl lg:px-14 lg:py-14">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full border-[44px] border-[#2aa7c9]/20"
          />

          <div className="relative max-w-xl">
            <p className="mb-8 text-sm font-bold tracking-[0.14em] text-[#9fdcec] uppercase">
              Digital Technologies
            </p>
            <h1 className="max-w-lg text-4xl font-semibold leading-[1.06] tracking-[-0.035em] sm:text-5xl lg:text-6xl">
              Year 8 Interactive Test
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-[#d9edf8] sm:text-lg">
              Hardware, software, networks and cyber security.
            </p>
          </div>

          <dl className="relative mt-14 grid grid-cols-3 gap-5 border-t border-white/20 pt-6">
            <div>
              <dt className="text-xs text-[#a9c5d4]">Marks</dt>
              <dd className="mt-1 text-xl font-bold sm:text-2xl">48</dd>
            </div>
            <div>
              <dt className="text-xs text-[#a9c5d4]">Time</dt>
              <dd className="mt-1 text-xl font-bold sm:text-2xl">45 min</dd>
            </div>
            <div>
              <dt className="text-xs text-[#a9c5d4]">Modules</dt>
              <dd className="mt-1 text-xl font-bold sm:text-2xl">3</dd>
            </div>
          </dl>
        </section>

        <section className="flex items-center px-5 py-10 sm:px-10 lg:px-14">
          <div className="w-full max-w-md lg:mx-auto">
            <p className="text-sm font-bold text-[#1c67a5] dark:text-[#67c8df]">
              Test access
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.025em] sm:text-4xl">
              Ready to begin?
            </h2>
            <p className="mt-3 max-w-sm leading-7 text-[#536579] dark:text-[#b8cbd7]">
              Enter your name and the access code provided by your teacher.
            </p>

            <form className="mt-9 space-y-6" onSubmit={handleSubmit} noValidate>
              <div className="space-y-2">
                <label className="block text-sm font-bold" htmlFor="student-name">
                  Student name
                </label>
                <input
                  id="student-name"
                  name="studentName"
                  type="text"
                  autoComplete="name"
                  autoFocus
                  maxLength={80}
                  value={name}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "student-name-error" : undefined}
                  onChange={(event) => {
                    setName(event.target.value);
                    if (errors.name) {
                      setErrors((current) => ({ ...current, name: undefined }));
                    }
                  }}
                  className="h-13 w-full rounded-xl border border-[#9eb4c3] bg-white px-4 text-base text-[#172033] outline-none transition-[border-color,box-shadow] placeholder:text-[#687b8d] focus:border-[#1c67a5] focus:ring-4 focus:ring-[#2aa7c9]/20 dark:border-[#526d7e] dark:bg-[#102536] dark:text-[#eef7fb] dark:placeholder:text-[#a9beca]"
                  placeholder="Enter your full name"
                />
                {errors.name && (
                  <p id="student-name-error" className="text-sm font-medium text-[#a93636] dark:text-[#ff9f9f]">
                    {errors.name}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-bold" htmlFor="access-code">
                  Access code
                </label>
                <input
                  id="access-code"
                  name="accessCode"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  spellCheck={false}
                  value={code}
                  aria-invalid={Boolean(errors.code)}
                  aria-describedby={errors.code ? "access-code-error" : "access-code-help"}
                  onChange={(event) => {
                    setCode(event.target.value);
                    if (errors.code) {
                      setErrors((current) => ({ ...current, code: undefined }));
                    }
                  }}
                  className="h-13 w-full rounded-xl border border-[#9eb4c3] bg-white px-4 font-mono text-base tracking-[0.12em] text-[#172033] uppercase outline-none transition-[border-color,box-shadow] placeholder:font-sans placeholder:tracking-normal placeholder:text-[#687b8d] placeholder:normal-case focus:border-[#1c67a5] focus:ring-4 focus:ring-[#2aa7c9]/20 dark:border-[#526d7e] dark:bg-[#102536] dark:text-[#eef7fb] dark:placeholder:text-[#a9beca]"
                  placeholder="Enter access code"
                />
                {errors.code ? (
                  <p id="access-code-error" className="text-sm font-medium text-[#a93636] dark:text-[#ff9f9f]">
                    {errors.code}
                  </p>
                ) : (
                  <p id="access-code-help" className="text-sm text-[#647385] dark:text-[#a9beca]">
                    The code is not case-sensitive.
                  </p>
                )}
              </div>

              {errors.form && (
                <p
                  className="rounded-xl border border-[#d8a2a2] bg-[#fff2f2] px-4 py-3 text-sm font-medium text-[#8f2f2f] dark:border-[#8c5555] dark:bg-[#341c25] dark:text-[#ffb5b5]"
                  role="alert"
                >
                  {errors.form}
                </p>
              )}

              <button
                type="submit"
                disabled={isEntering}
                className="flex h-13 w-full items-center justify-center rounded-xl bg-[#0b1f3a] px-5 text-base font-bold text-white transition-[background-color,transform] hover:bg-[#144c78] active:translate-y-px disabled:cursor-wait disabled:bg-[#536579] dark:bg-[#2aa7c9] dark:text-[#071321] dark:hover:bg-[#68c8df]"
              >
                {isEntering ? "Opening test..." : "Enter test"}
              </button>

              <p className="text-sm leading-6 text-[#647385] dark:text-[#a9beca]">
                Your progress is saved automatically on this device.
              </p>
            </form>
          </div>
        </section>
      </div>
    </main>
  );
}
