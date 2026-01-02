"use client";
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { useExamStore } from "@/store";

// --- Timer Hooks & UI Components ---
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

/**
 * MultipleChoiceSingle
 * - Integrated with Global Section Timer
 * - Parses a single string to extract paragraph and question text
 * - Disables interaction and updates phase when time expires
 */
export default function MultipleChoiceSingle({
  paragraphs = "", // Plain string
  options = [],    // [{id, option_text}, ...]
  subsection,
  questionId,
  name = "Multiple Choice (Single)"
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  
  const [selectedId, setSelectedId] = useState(null);

  // --- 1. Timer Integration ---
  const handleTimeExpired = useCallback(() => {
    console.log("Section time expired in Multiple Choice Single.");
  }, []);

  const { formattedTime, isExpired } = useSectionTimer(handleTimeExpired);

  // --- 2. Parsing Logic ---
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

  // --- 3. Sync to Store & Phase Management ---
  useEffect(() => {
    // Save current selection to global store
    if (selectedId !== null) {
      setAnswerKey("answer", selectedId);
    }

    // Phase control: Enable 'Next' if an answer is chosen OR if time expired
    if (isExpired) {
      setPhase("finished");
    } else if (selectedId !== null) {
      setPhase("finished");
    } else {
      setPhase("prep");
    }
  }, [selectedId, setAnswerKey, setPhase, isExpired]);

  return (
    <div className="space-y-6">
      {/* Header with Global Timer Display */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase">
          {subsection || name}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isExpired}
        />
      </div>

      {/* Main Reading Text */}
      <div className={`rounded-xl border border-gray-200 p-8 bg-white text-gray-900 leading-relaxed shadow-sm transition-opacity duration-300 ${isExpired ? "opacity-60" : ""}`}>
        <p className="text-lg whitespace-pre-wrap">
          {contentText}
        </p>
      </div>

      {/* Question and Options Area */}
      <div className="space-y-4">
        <div className="text-base font-semibold text-sky-800 bg-sky-50 p-4 rounded-lg border border-sky-100">
          {questionLabel}
        </div>

        <div className={`grid gap-3 ${isExpired ? "pointer-events-none" : ""}`}>
          {options.map((opt) => {
            const isChecked = selectedId === opt.id;
            return (
              <label
                key={opt.id}
                className={`flex items-start gap-4 rounded-xl border-2 p-4 transition-all duration-200
                  ${isExpired ? "cursor-not-allowed" : "cursor-pointer"}
                  ${isChecked 
                    ? "border-sky-600 bg-sky-50 shadow-md translate-x-1" 
                    : "border-gray-100 bg-white hover:border-sky-200 hover:bg-gray-50"}`}
              >
                <div className="mt-1 relative flex items-center justify-center">
                  <input
                    type="radio"
                    name="mcq-single"
                    className="h-5 w-5 cursor-pointer accent-sky-600 disabled:cursor-not-allowed"
                    checked={isChecked}
                    disabled={isExpired}
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

      {/* Status Messaging */}
      {isExpired ? (
        <div className="text-center py-3 text-sm text-red-600 font-bold bg-red-50 rounded-lg border border-red-100 animate-pulse">
          ⏳ Section time has expired. Your current selection is locked.
        </div>
      ) : (
        selectedId === null && (
          <div className="text-center py-2 text-sm text-amber-600 font-medium bg-amber-50 rounded-lg animate-pulse border border-amber-100">
            Please select an answer to continue.
          </div>
        )
      )}
    </div>
  );
}