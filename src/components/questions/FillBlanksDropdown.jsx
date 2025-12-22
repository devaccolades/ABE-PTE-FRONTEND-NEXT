"use client";
import { useEffect, useState, useMemo } from "react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function FillBlanksDropdown({
  segments = [],
  subsection = "Reading: Fill in the Blanks",
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  
  // 1. Local state for answers: { blank_number: option_id }
  const [answers, setAnswers] = useState({});

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  // 2. Logic to check if all blanks are filled
  const isAllFilled = useMemo(() => {
    const blankSegments = segments.filter(seg => seg.blank_number);
    if (blankSegments.length === 0) return true;
    
    return blankSegments.every((seg) => {
      const val = answers[seg.blank_number];
      return val !== undefined && val !== "" && val !== null;
    });
  }, [segments, answers]);

  // 3. SYNC TO STORE: This ensures data goes into the "answer" field
  useEffect(() => {
    // We use the literal string "answer" so it matches your API's expected field
    setAnswerKey("answer", answers);

    // Phase management to enable/disable the Next button
    if (isSectionExpired || isAllFilled) {
      setPhase("writing"); // Enables Next button
    } else {
      setPhase("prep"); // Disables Next button
    }
  }, [answers, isAllFilled, isSectionExpired, setAnswerKey, setPhase]);

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

      {/* Main Text Content */}
      <div className="rounded-xl border border-gray-200 p-8 bg-white text-gray-900 text-lg leading-[3rem] shadow-sm">
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

      {/* Validation Warning */}
      {!isAllFilled && !isSectionExpired && (
        <div className="text-amber-600 text-sm font-medium bg-amber-50 p-3 rounded-lg border border-amber-100 flex items-center gap-2 animate-pulse">
          <span>⚠️</span>
          Please fill all blanks to proceed.
        </div>
      )}
    </div>
  );
}

/**
 * Sub-component for the individual dropdowns
 */
function SelectBlank({ blankNumber, options, value, onChange, disabled }) {
  return (
    <select
      disabled={disabled}
      className={`
        mx-2 inline-flex h-10 min-w-[150px] rounded-md border px-3 text-base font-semibold
        transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500
        ${value ? "border-sky-400 bg-sky-50 text-sky-900 shadow-sm" : "border-gray-300 bg-white text-gray-400"}
        ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : "hover:border-sky-400"}
      `}
      value={value}
      onChange={(e) => onChange(blankNumber, e.target.value)}
    >
      <option value="" disabled>Select...</option>
      {options.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.option_text}
        </option>
      ))}
    </select>
  );
}