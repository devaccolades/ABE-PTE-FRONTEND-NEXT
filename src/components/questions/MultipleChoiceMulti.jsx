"use client";
import { useEffect, useState, useCallback } from "react";
import { useExamStore } from "@/store";

// Import your timer hook and display component
import { useSectionTimer } from "../hooks/useSectionTimer"; 
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function MultipleChoiceMulti({
  paragraphs = "",
  options = [],
  name = "Multiple Choice (Multiple)"
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const setPhase = useExamStore((s) => s.setPhase);

  // --- 1. TIMER INTEGRATION ---
  // If time expires, we can optionally auto-submit or just lock the UI
  const handleTimeExpired = useCallback(() => {
    console.log("Section time expired in MultipleChoiceMulti");
  }, []);

  const { formattedTime, isExpired } = useSectionTimer(handleTimeExpired);

  // --- 2. LOCAL STATE ---
  const [selectedIndices, setSelectedIndices] = useState(new Set());

  const text = paragraphs.split("Question:")[0]?.trim();
  const questionText = paragraphs.split("Question:")[1]?.trim();

  // --- 3. INITIAL SYNC ---
  useEffect(() => {
    setPhase("prep");
  }, [setPhase]);

  // --- 4. DATA SYNC ---
  useEffect(() => {
    const selectedIds = Array.from(selectedIndices).map((idx) => options[idx].id);
    setAnswerKey("answer", selectedIds);

    if (selectedIndices.size > 0) {
      setPhase("writing");
    } else {
      setPhase("prep");
    }
  }, [selectedIndices, options, setAnswerKey, setPhase]);

  // Toggle logic - disabled if time is expired
  function toggle(index, isChecked) {
    if (isExpired) return; // Lock UI if time is up
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(index);
      else next.delete(index);
      return next;
    });
  }

  return (
    <div className="space-y-6">
      {/* --- TIMER DISPLAY HEADER --- */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 uppercase">
          {name}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isExpired}
        />
      </div>

      <div className="rounded-lg border border-gray-200 p-6 bg-gray-50 text-gray-900 leading-relaxed shadow-sm">
        <p className="text-base whitespace-pre-wrap">{text}</p>
      </div>

      <div className="space-y-4">
        <div className="text-md font-bold text-sky-900">
          {questionText || "Select all correct statements:"}
        </div>
        
        <div className="grid gap-3">
          {options.map((opt, i) => (
            <label
              key={opt.id || i}
              className={`flex items-start gap-3 rounded-lg border p-4 transition-all cursor-pointer ${
                isExpired ? "opacity-60 cursor-not-allowed" : ""
              } ${
                selectedIndices.has(i)
                  ? "border-sky-500 bg-sky-50/50 ring-1 ring-sky-500"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  disabled={isExpired}
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer disabled:cursor-not-allowed"
                  checked={selectedIndices.has(i)}
                  onChange={(e) => toggle(i, e.target.checked)}
                />
              </div>
              <span className="text-sm text-gray-800 leading-snug select-none">
                {opt.option_text}
              </span>
            </label>
          ))}
        </div>
      </div>

      {isExpired ? (
        <p className="text-sm text-red-600 font-bold animate-pulse">
          Time is up! You can no longer change your answers.
        </p>
      ) : (
        selectedIndices.size === 0 && (
          <p className="text-xs text-amber-600 italic">
            * Please select at least one option to continue.
          </p>
        )
      )}
    </div>
  );
}