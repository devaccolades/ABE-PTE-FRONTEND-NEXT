"use client";
import { useEffect, useState, useMemo } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useExamStore } from "@/store";

// Hooks & UI Components
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function WriteEssay({ promptText, questionId, subsection }) {
  const setPhase = useExamStore((s) => s.setPhase);
  const phase = useExamStore((s) => s.phase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  const [localText, setLocalText] = useState("");

  const wordLimit = useMemo(() => {
    if (subsection === "summarize_written_text") return 75; // PTE standard is usually 75 for SWT
    if (subsection === "write_essay") return 300; // PTE standard is usually 200-300
    return 500;
  }, [subsection]);

  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  useEffect(() => {
    setPhase("prep");
  }, [setPhase]);

  const getWordCount = (text) => {
    const trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  };

  const currentCount = getWordCount(localText);

  const handleTextChange = (e) => {
    const newText = e.target.value;
    
    // REMOVED THE BLOCKING LOGIC: User can now type as much as they want.
    
    setLocalText(newText);
    setAnswerKey("answer", newText);

    if (newText.length > 0 && phase === "prep") {
      setPhase("writing");
    } else if (newText.length === 0 && phase === "writing") {
      setPhase("prep");
    }
  };

  useEffect(() => {
    if (isSectionExpired) {
      setPhase("finished");
    }
  }, [isSectionExpired, setPhase]);

  return (
    <div className="space-y-4 md:space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b pb-3 md:pb-4 gap-3">
        <h2 className="text-lg md:text-xl font-bold text-gray-800 tracking-tight uppercase">
          {subsection?.replace(/_/g, " ")}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      <div className="rounded-lg border border-gray-200 p-4 md:p-5 bg-gray-50 text-gray-900 shadow-sm max-h-[200px] md:max-h-none overflow-y-auto">
        <RichTextDisplay htmlContent={promptText} />
      </div>

      <div className="relative">
        <Textarea
          value={localText}
          onChange={handleTextChange}
          placeholder={`Write your response here... Suggested limit: ${wordLimit} words.`}
          disabled={isSectionExpired}
          rows={12}
          className={`text-sm md:text-base leading-relaxed p-3 md:p-4 resize-none focus:ring-2 min-h-[300px] md:min-h-[400px] border-gray-300 transition-all ${
            currentCount > wordLimit
              ? "border-amber-400 focus:ring-amber-500 bg-amber-50/10"
              : "focus:ring-sky-500"
          }`}
        />

        {isSectionExpired && (
          <div className="absolute inset-0 bg-gray-100/40 backdrop-blur-[1px] rounded-md flex items-center justify-center p-4">
            <div className="bg-white px-4 py-2 md:px-6 md:py-3 rounded-full shadow-xl border border-gray-200 font-bold text-gray-500 text-xs md:text-sm text-center">
              Section Time Expired - Editing Disabled
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-center gap-3 text-xs md:text-sm px-1">
        <div
          className={`px-4 py-2 rounded-full border transition-all duration-300 w-full md:w-auto text-center font-medium shadow-sm ${
            currentCount > wordLimit
              ? "bg-red-600 border-red-700 text-white shadow-red-200"
              : "bg-slate-800 border-slate-900 text-white"
          }`}
        >
          Word count:{" "}
          <span className="font-bold text-base ml-1">
            {currentCount}
          </span>
          <span className="opacity-70 ml-1">/ {wordLimit}</span>
        </div>

        {!isSectionExpired && phase === "prep" && (
          <span className="text-amber-600 animate-pulse font-medium text-center">
            Start typing to enable the "Next" button...
          </span>
        )}

        {currentCount > wordLimit && !isSectionExpired && (
          <span className="text-red-600 font-bold animate-bounce text-center">
            ⚠️ You have exceeded the word limit!
          </span>
        )}
      </div>
    </div>
  );
}

function RichTextDisplay({ htmlContent }) {
  return (
    <div
      className="prose prose-sm md:prose-base max-w-none text-gray-800"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}