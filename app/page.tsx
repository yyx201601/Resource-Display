import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: { absolute: "Digital Technologies" },
  description: "Digital Technologies course resources for Year 8 and Year 9.",
};

export default function Home() {
  return (
    <main className="min-h-[100dvh] bg-[#f4f8fb] px-5 py-10 text-[#172033] dark:bg-[#071321] dark:text-[#eef7fb] sm:px-8 sm:py-14">
      <div className="mx-auto flex w-full max-w-5xl flex-col">
        <header className="max-w-2xl">
          <p className="text-sm font-bold text-[#1c67a5] dark:text-[#67c8df]">
            Course resources
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Digital Technologies
          </h1>
          <p className="mt-4 max-w-xl text-base leading-7 text-[#536579] dark:text-[#b8cbd7] sm:text-lg">
            Choose your year level to view the available learning resources.
          </p>
        </header>

        <section
          aria-label="Year levels"
          className="mt-10 grid gap-5 md:grid-cols-2 md:gap-6"
        >
          <Link
            href="/Year8-DT"
            className="group flex min-h-72 flex-col justify-between rounded-2xl bg-[#0b1f3a] p-7 text-white shadow-[0_20px_50px_rgba(11,31,58,0.16)] transition-[transform,background-color,box-shadow] hover:-translate-y-1 hover:bg-[#10345a] hover:shadow-[0_24px_60px_rgba(11,31,58,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/40 active:translate-y-0 sm:p-9"
          >
            <div>
              <p className="text-sm font-bold text-[#9fdcec]">Available now</p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Year 8 Digit Tech
              </h2>
              <p className="mt-4 max-w-sm leading-7 text-[#d9edf8]">
                Open the Year 8 course and access the current test.
              </p>
            </div>
            <span className="mt-10 font-bold text-[#9fdcec] transition-colors group-hover:text-white">
              Open course
            </span>
          </Link>

          <Link
            href="/Year9-DT"
            className="group flex min-h-72 flex-col justify-between rounded-2xl bg-[#0b1f3a] p-7 text-white shadow-[0_20px_50px_rgba(11,31,58,0.16)] transition-[transform,background-color,box-shadow] hover:-translate-y-1 hover:bg-[#10345a] hover:shadow-[0_24px_60px_rgba(11,31,58,0.22)] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2aa7c9]/40 active:translate-y-0 sm:p-9"
          >
            <div>
              <p className="text-sm font-bold text-[#9fdcec]">
                Available now
              </p>
              <h2 className="mt-4 text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
                Year 9 Digit Tech
              </h2>
              <p className="mt-4 max-w-sm leading-7 text-[#d9edf8]">
                Review HTML and practise core JavaScript skills.
              </p>
            </div>
            <span className="mt-10 font-bold text-[#9fdcec] transition-colors group-hover:text-white">
              Open course
            </span>
          </Link>
        </section>
      </div>
    </main>
  );
}
