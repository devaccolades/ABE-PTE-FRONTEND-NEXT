"use client";

import Image from "next/image";
import Link from "next/link";

export default function Header({
  variant = "home",
  children,
  onSelectQuestions,
}) {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/95 shadow-sm backdrop-blur">
      <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/">
          <Image
            src="/logo.png"
            alt="Application Logo"
            width={180}
            height={60}
            priority
            className="h-10 w-auto"
          />
        </Link>

        <div className="flex items-center gap-3">
          {variant === "home" && (
            <Link
              href="/mock-test"
              className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
            >
              Practice
            </Link>
          )}

          {variant === "mock-test" && (
            <>
              <Link
                href="/"
                className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-100"
              >
                Back to Home
              </Link>

              <button
                onClick={onSelectQuestions}
                className="rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-sky-700"
              >
                Select Questions
              </button>
            </>
          )}
        </div>
      </div>

      {children}
    </header>
  );
}