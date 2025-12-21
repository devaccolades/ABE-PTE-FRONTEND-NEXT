// src/components/FillBlanksDropdown.jsx

"use client";
import { useEffect, useState, useMemo, useRef } from "react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function FillBlanksDropdown({
  segments = [],
  questionId,
  subsection = "Reading: Fill in the Blanks",
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  
  // Access the specific nested answer for this question from the store
  const existingAnswers = useExamStore((s) => s.answer.answer[questionId]);

  // 1. Initialize local state properly
  const [answers, setAnswers] = useState(existingAnswers || {});

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  // 2. Logic to check if all blanks are filled
  const isAllFilled = useMemo(() => {
    // Only count segments that actually HAVE a blank
    const blankSegments = segments.filter(seg => seg.blank_number);
    if (blankSegments.length === 0) return true;
    
    return blankSegments.every((seg) => {
      const val = answers[seg.blank_number];
      return val !== undefined && val !== "" && val !== null;
    });
  }, [segments, answers]);

  // 3. Sync to Store & Phase Management
  useEffect(() => {
    // IMPORTANT: Only update the store if there's actually something to save
    // or if the user has interacted.
    setAnswerKey(questionId, answers);

    if (isSectionExpired || isAllFilled) {
      setPhase("finished");
    } else {
      setPhase("active"); // Use 'active', not 'prep'
    }
  }, [answers, isAllFilled, isSectionExpired, questionId, setAnswerKey, setPhase]);

  const handleChange = (blankNumber, optionId) => {
    setAnswers((prev) => ({
      ...prev,
      [blankNumber]: optionId,
    }));
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight uppercase">
          {subsection}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      <div className="rounded-xl border border-gray-200 p-8 bg-white text-gray-900 text-lg leading-[2.8rem] shadow-sm">
        {segments.map((seg, index) => (
          <span key={index} className="inline">
            <span className="whitespace-pre-wrap">{seg.text_before_blank}</span>

            {seg.blank_number && (
              <SelectBlank
                blankNumber={seg.blank_number}
                options={seg.options}
                value={answers[seg.blank_number] || ""}
                onChange={handleChange}
                disabled={isSectionExpired}
              />
            )}

            <span className="whitespace-pre-wrap">{seg.text_after_blank}</span>
          </span>
        ))}
      </div>

      {!isAllFilled && !isSectionExpired && (
        <div className="text-amber-600 text-sm font-medium bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2">
          <span>⚠️</span>
          Please select an option for all blanks to enable the Next button.
        </div>
      )}
    </div>
  );
}

function SelectBlank({ blankNumber, options, value, onChange, disabled }) {
  return (
    <select
      disabled={disabled}
      className={`
        mx-1 inline-flex h-9 min-w-[140px] rounded border px-2 text-base font-medium
        transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500
        ${value ? "border-sky-300 bg-sky-50 text-sky-900" : "border-gray-300 bg-white text-gray-400"}
        ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : "hover:border-gray-400"}
      `}
      value={value}
      onChange={(e) => onChange(blankNumber, e.target.value)}
    >
      <option value="" disabled>Select...</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>{opt.option_text}</option>
      ))}
    </select>
  );
}