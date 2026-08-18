"use client";

import React, { useEffect, useState } from "react";
import { ChevronDown, FileText, X } from "lucide-react";
import { useExamStore } from "@/store";
import { mocktestStore } from "../mocktestStore";

// Primary responsibility: Browse practice questions by subsection and mock-test paper.
const SideBar = () => {
  const isSideOpen = mocktestStore((state) => state.isSideOpen);
  const setIsSideOpen = mocktestStore((state) => state.setIsSideOpen);
  const currentQuestion = mocktestStore((state) => state.currentQuestion);
  const baseUrl = mocktestStore((state) => state.baseUrl);
  const selectedQuestion = mocktestStore((state) => state.selectedQuestion);
  const setSelectedQuestion = mocktestStore((state) => state.setSelectedQuestion);
  const currentQuestionName = mocktestStore((state) => state.currentQuestionName);
  const resetAnswer = useExamStore((state) => state.resetAnswer);

  const [mockTests, setMockTests] = useState([]);
  const [questionCount, setQuestionCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!currentQuestion) return undefined;

    const controller = new AbortController();

    const fetchQuestionData = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(
          `${baseUrl}all_questions/${currentQuestion}/`,
          { signal: controller.signal },
        );
        if (!response.ok) {
          throw new Error("Questions could not be loaded.");
        }
        const data = await response.json();
        setMockTests(Array.isArray(data.mock_tests) ? data.mock_tests : []);
        setQuestionCount(Number(data.question_count) || 0);
      } catch (fetchError) {
        if (fetchError.name !== "AbortError") {
          setMockTests([]);
          setQuestionCount(0);
          setError(fetchError.message || "Questions could not be loaded.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    fetchQuestionData();
    return () => controller.abort();
  }, [currentQuestion, baseUrl]);

  const handleClick = (item) => {
    resetAnswer();
    setSelectedQuestion(item);
    setIsSideOpen(false);
  };

  if (!isSideOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/45"
      onClick={() => setIsSideOpen(false)}
    >
      <aside
        className="ml-auto flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
        aria-label={`${currentQuestionName || "Practice"} questions`}
      >
        <header className="flex items-start justify-between border-b border-slate-200 px-5 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase text-sky-600">
              Single-question practice
            </p>
            <h1 className="mt-1 truncate text-lg font-semibold text-slate-900">
              {currentQuestionName}
            </h1>
            {!loading && !error && (
              <p className="mt-1 text-sm text-slate-500">
                {questionCount} question{questionCount === 1 ? "" : "s"} across{" "}
                {mockTests.length} mock test{mockTests.length === 1 ? "" : "s"}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setIsSideOpen(false)}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close question browser"
            title="Close"
          >
            <X size={19} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto">
          {loading && <QuestionSkeleton />}

          {!loading && error && (
            <div className="m-5 border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {!loading && !error && mockTests.length === 0 && (
            <div className="px-6 py-16 text-center">
              <FileText className="mx-auto text-slate-300" size={30} />
              <p className="mt-3 text-sm text-slate-500">
                No active mock tests contain this question type.
              </p>
            </div>
          )}

          {!loading && !error && mockTests.map((mockTest, index) => (
            <details
              key={mockTest.id}
              className="group border-b border-slate-200"
              open={index === 0}
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 bg-slate-50 px-5 py-4 hover:bg-slate-100">
                <div className="min-w-0">
                  <h2 className="truncate text-sm font-semibold text-slate-900">
                    {mockTest.title}
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {mockTest.question_count} question
                    {mockTest.question_count === 1 ? "" : "s"}
                  </p>
                </div>
                <ChevronDown
                  size={18}
                  className="shrink-0 text-slate-500 transition-transform group-open:rotate-180"
                />
              </summary>

              <div className="divide-y divide-slate-100">
                {mockTest.questions.map((item, questionIndex) => {
                  const selected = selectedQuestion?.id === item.id;
                  return (
                    <button
                      type="button"
                      key={item.id}
                      onClick={() => handleClick(item)}
                      className={`flex w-full items-start gap-3 px-5 py-3 text-left transition-colors ${
                        selected
                          ? "bg-sky-50 text-sky-800"
                          : "text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span
                        className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-semibold ${
                          selected
                            ? "bg-sky-600 text-white"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {questionIndex + 1}
                      </span>
                      <span className="min-w-0 break-words text-sm font-medium leading-6">
                        {item.name || `Question ${questionIndex + 1}`}
                      </span>
                    </button>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      </aside>
    </div>
  );
};

const QuestionSkeleton = () => (
  <div className="space-y-3 p-5">
    {Array.from({ length: 7 }).map((_, index) => (
      <div
        key={index}
        className="h-12 w-full animate-pulse rounded-md bg-slate-100"
      />
    ))}
  </div>
);

export default SideBar;
