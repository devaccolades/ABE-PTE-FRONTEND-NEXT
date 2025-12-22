"use client";
import { useEffect, useState } from "react";
import { useExamStore } from "@/store";

export default function MultipleChoiceMulti({
  paragraphs = "",
  options = [],
}) {
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const setPhase = useExamStore((s) => s.setPhase);

  // 1. Keep a local state for the UI only
  const [selectedIndices, setSelectedIndices] = useState(new Set());

  // 2. Parse text and question
  const text = paragraphs.split("Question:")[0]?.trim();
  const questionText = paragraphs.split("Question:")[1]?.trim();

  // 3. INITIAL SYNC: Set phase to prep on mount
  useEffect(() => {
    setPhase("prep");
  }, [setPhase]);

  // 4. DATA SYNC: Whenever selectedIndices changes, update the Store and Phase
  // This useEffect is the fix. It separates the "click" from the "global update"
  useEffect(() => {
    const selectedIds = Array.from(selectedIndices).map((idx) => options[idx].id);
    
    // Update global store
    setAnswerKey("answer", selectedIds);

    // Update global phase based on selection
    if (selectedIndices.size > 0) {
      setPhase("writing");
    } else {
      setPhase("prep");
    }
  }, [selectedIndices, options, setAnswerKey, setPhase]);

  // 5. Toggle logic only handles the local set
  function toggle(index, isChecked) {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (isChecked) next.add(index);
      else next.delete(index);
      return next;
    });
  }

  return (
    <div className="space-y-6">
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
                selectedIndices.has(i)
                  ? "border-sky-500 bg-sky-50/50 ring-1 ring-sky-500"
                  : "border-gray-200 bg-white hover:bg-gray-50"
              }`}
            >
              <div className="flex items-center h-5">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-sky-600 focus:ring-sky-500 cursor-pointer"
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

      {selectedIndices.size === 0 && (
        <p className="text-xs text-amber-600 italic">
          * Please select at least one option to continue.
        </p>
      )}
    </div>
  );
}