"use client";
import { useEffect, useState } from "react";
import { useExamStore } from "@/store";
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function FillBlanksDropdown({
  segments = [],
  subsection = "Reading: Fill in the Blanks",
}) {
  const setPhase = useExamStore((s) => s.setPhase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);
  const [answers, setAnswers] = useState({});
  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  useEffect(() => {
    setAnswerKey("answer", answers);
    const hasAtLeastOneAnswer = Object.values(answers).some(
      (val) => val !== undefined && val !== "" && val !== null
    );

    if (isSectionExpired || hasAtLeastOneAnswer) {
      setPhase("writing");
    } else {
      setPhase("prep");
    }
  }, [answers, isSectionExpired, setAnswerKey, setPhase]);

  const handleChange = (blankNumber, optionId) => {
    setAnswers((prev) => ({ ...prev, [blankNumber]: optionId }));
  };

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-x-hidden">
      {/* Responsive Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-4 gap-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight uppercase">
          {subsection}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      {/* Main Text Content - Optimized for all screens */}
      <div className={`
        rounded-xl border border-gray-200 bg-white shadow-sm
        p-4 sm:p-6 md:p-8 
        text-base sm:text-lg 
        leading-[2.5rem] sm:leading-[3rem] md:leading-[3.5rem] 
        text-gray-900
      `}>
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

      {/* Dynamic Instruction Label */}
      <div className="mt-2 md:mt-4 px-2 sm:px-4 py-2 rounded-md inline-block text-xs sm:text-sm font-medium transition-all duration-300">
        {Object.keys(answers).length === 0 && !isSectionExpired ? (
          <span className="text-slate-400 italic">Please answer at least one blank to enable "Next"</span>
        ) : (
          <span className="text-green-600 flex items-center gap-2">
            ✓ Ready to proceed
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * Sub-component: Responsive Select
 */
function SelectBlank({ blankNumber, options, value, onChange, disabled }) {
  return (
    <select
      disabled={disabled}
      className={`
        mx-1 sm:mx-2 inline-flex align-middle rounded-md border px-2 md:px-3 
        text-sm sm:text-base font-semibold transition-all cursor-pointer 
        focus:outline-none focus:ring-2 focus:ring-sky-500
        
        /* Width adjustments */
        w-[120px] sm:w-[150px] md:w-[180px]
        h-8 sm:h-9 md:h-10

        ${value ? "border-sky-400 bg-sky-50 text-sky-900 shadow-sm" : "border-gray-300 bg-white text-gray-400"}
        ${disabled ? "opacity-50 cursor-not-allowed bg-gray-100" : "hover:border-sky-400"}
      `}
      value={value}
      onChange={(e) => onChange(blankNumber, e.target.value)}
    >
      <option value="" disabled>Select...</option>
      {options?.map((opt) => (
        <option key={opt.id} value={opt.id}>
          {opt.option_text}
        </option>
      ))}
    </select>
  );
}