"use client";
import React, { useEffect, useState, useMemo } from "react";
import { useExamStore } from "@/store";

/**
 * MultipleChoiceSingle
 * - Parses a single string to extract paragraph and question text
 * - Syncs with useExamStore for answer submission and phase management
 */
export default function MultipleChoiceSingle({
  paragraphs = "", // Now a plain string
  options = [],    // Expected array of objects: [{id, option_text}, ...]
  subsection,
  questionId,
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  
  const [selectedId, setSelectedId] = useState(null);

  // --- PARSING LOGIC ---
  // Split the string by "Question:". 
  // part[0] is the text, part[1] is the question.
  const { contentText, questionLabel } = useMemo(() => {
    if (!paragraphs.includes("Question:")) {
      return { contentText: paragraphs, questionLabel: "Select the correct option:" };
    }
    const parts = paragraphs.split("Question:");
    return {
      contentText: parts[0].trim(),
      questionLabel: parts[1].trim(),
    };
  }, [paragraphs]);

  // --- SYNC TO STORE ---
  useEffect(() => {
    if (selectedId !== null) {
      // Save the ID to the global answer key
      setAnswerKey("answer", selectedId);
      // Enable the Next button
      setPhase("finished");
    } else {
      setPhase("prep");
    }
  }, [selectedId, setAnswerKey, setPhase]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase">
          {subsection || "Multiple Choice (Single)"}
        </h2>
      </div>

      {/* Main Reading Text */}
      <div className="rounded-xl border border-gray-200 p-8 bg-white text-gray-900 leading-relaxed shadow-sm">
        <p className="text-lg whitespace-pre-wrap">
          {contentText}
        </p>
      </div>

      {/* Question and Options Area */}
      <div className="space-y-4">
        <div className="text-base font-semibold text-sky-800 bg-sky-50 p-4 rounded-lg border border-sky-100">
          {questionLabel}
        </div>

        <div className="grid gap-3">
          {options.map((opt) => {
            const isChecked = selectedId === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex items-start gap-4 rounded-xl border-2 p-4 cursor-pointer transition-all duration-200
                  ${isChecked 
                    ? "border-sky-600 bg-sky-50 shadow-md translate-x-1" 
                    : "border-gray-100 bg-white hover:border-sky-200 hover:bg-gray-50"}`}
              >
                <div className="mt-1 relative flex items-center justify-center">
                  <input
                    type="radio"
                    name="mcq-single"
                    className="h-5 w-5 cursor-pointer accent-sky-600"
                    checked={isChecked}
                    onChange={() => setSelectedId(opt.id)}
                  />
                </div>
                <span className={`text-base leading-relaxed ${isChecked ? "text-sky-900 font-medium" : "text-gray-700"}`}>
                  {opt.option_text}
                </span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Status Warning */}
      {selectedId === null && (
        <div className="text-center py-2 text-sm text-amber-600 font-medium bg-amber-50 rounded-lg animate-pulse">
          Please select an answer to continue.
        </div>
      )}
    </div>
  );
}