import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Year 8 Digital Technologies",
  description: "Year 8 Digital Technologies learning resources and tests.",
};

export default function Year8DigitalTechnologiesPage() {
  return (
    <main className="min-h-[100dvh] bg-[#f4f8fb] px-5 py-10 text-[#172033] dark:bg-[#071321] dark:text-[#eef7fb] sm:px-8 sm:py-14">
      <div className="mx-auto w-full max-w-5xl">
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-xl px-3 font-bold text-[#1c67a5] transition-colors hover:bg-[#dcecf5] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/30 dark:text-[#67c8df] dark:hover:bg-[#102536]"
        >
          Back to year levels
        </Link>

        <header className="mt-8 max-w-2xl">
          <p className="text-sm font-bold text-[#1c67a5] dark:text-[#67c8df]">
            Course resources
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Year 8 Digit Tech
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#536579] dark:text-[#b8cbd7] sm:text-lg">
            Select a resource to continue.
          </p>
        </header>

        <section aria-label="Year 8 resources" className="mt-10 max-w-xl">
          <Link
            href="/Year8-DT/test"
            className="group flex min-h-64 flex-col justify-between rounded-2xl bg-[#0b1f3a] p-7 text-white shadow-[0_20px_50px_rgba(11,31,58,0.16)] transition-[transform,background-color,box-shadow] hover:-translate-y-1 hover:bg-[#10345a] hover:shadow-[0_24px_60px_rgba(11,31,58,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/40 active:translate-y-0 sm:p-9"
          >
            <div>
              <p className="text-sm font-bold text-[#9fdcec]">Assessment</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Test
              </h2>
              <p className="mt-4 max-w-sm leading-7 text-[#d9edf8]">
                Hardware, software, networks and cyber security.
              </p>
            </div>
            <span className="mt-10 font-bold text-[#9fdcec] transition-colors group-hover:text-white">
              Open test
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
