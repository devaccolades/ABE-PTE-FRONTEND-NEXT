"use client";
import { useEffect, useState, useCallback } from "react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer"; 
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function MultipleChoiceMulti({
  paragraphs = "",
  options = [],
  name = "Multiple Choice (Multiple)"
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const setPhase = useExamStore((s) => s.setPhase);

  const handleTimeExpired = useCallback(() => {
    console.log("Section time expired");
  }, []);

  const { formattedTime, isExpired } = useSectionTimer(handleTimeExpired);
  const [selectedIndices, setSelectedIndices] = useState(new Set());

  // Logic to separate text from question
  const text = paragraphs.split("Question:")[0]?.trim();
  const questionText = paragraphs.split("Question:")[1]?.trim();

  useEffect(() => {
    setPhase("prep");
  }, [setPhase]);

  useEffect(() => {
    const selectedIds = Array.from(selectedIndices).map((idx) => options[idx].id);
    setAnswerKey("answer", selectedIds);

    if (selectedIndices.size > 0 || isExpired) {
      setPhase("writing");
    } else {
      setPhase("prep");
    }
  }, [selectedIndices, options, setAnswerKey, setPhase, isExpired]);

  function toggle(index, isChecked) {
    if (isExpired) return;
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(index);
      else next.delete(index);
      return next;
    });
  }

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* --- Responsive Header --- */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 uppercase tracking-tight">
          {name}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isExpired}
        />
      </div>

      {/* --- Reading Content: Responsive Font/Padding --- */}
      <div className="rounded-xl border border-gray-200 p-4 sm:p-5 md:p-6 bg-slate-50/50 text-gray-900 shadow-sm">
        <p className="text-sm sm:text-base leading-relaxed md:leading-loose whitespace-pre-wrap">
          {text}
        </p>
      </div>

      <div className="space-y-3 md:space-y-4">
        <div className="text-sm md:text-md font-bold text-sky-900 px-1">
          {questionText || "Select all correct statements:"}
        </div>
        
        {/* --- Options: Larger hit zones for mobile tap --- */}
        <div className="grid gap-2 md:gap-3">
          {options.map((opt, i) => (
            <label
              key={opt.id || i}
              className={`
                flex items-start gap-3 rounded-xl border p-3.5 md:p-4 
                transition-all cursor-pointer select-none
                ${isExpired ? "opacity-60 cursor-not-allowed" : "active:scale-[0.98] sm:active:scale-100"} 
                ${selectedIndices.has(i)
                  ? "border-sky-500 bg-sky-50 ring-1 ring-sky-500 shadow-sm"
                  : "border-gray-200 bg-white hover:bg-gray-50 hover:border-sky-200"
                }
              `}
            >
              <div className="flex items-center h-5 md:h-6">
                <input
                  type="checkbox"
                  disabled={isExpired}
                  className="h-4 w-4 md:h-5 md:w-5 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed"
                  checked={selectedIndices.has(i)}
                  onChange={(e) => toggle(i, e.target.checked)}
                />
              </div>
              <span className="text-xs sm:text-sm md:text-base text-gray-800 leading-tight md:leading-snug pt-0.5">
                {opt.option_text}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* --- Responsive Footer Messages --- */}
      <div className="px-1 min-h-[20px]">
        {isExpired ? (
          <p className="text-xs md:text-sm text-red-600 font-bold animate-pulse flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-600" />
            Time is up! Answers locked.
          </p>
        ) : (
          selectedIndices.size === 0 && (
            <p className="text-[10px] md:text-xs text-amber-600 italic font-medium">
              * Please select at least one option to enable the "Next" button.
            </p>
          )
        )}
      </div>
    </div>
  );
}