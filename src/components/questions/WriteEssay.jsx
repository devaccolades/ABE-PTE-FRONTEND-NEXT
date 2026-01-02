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

  // 1. Local state for the text
  const [localText, setLocalText] = useState("");

  // 2. Determine Word Limit based on subsection
  const wordLimit = useMemo(() => {
    if (subsection == "summarize_written_text") return 70;
    if (subsection == "write_essay") return 300;
    // return 1000; 
  }, [subsection]);

  // 3. Global Section Timer
  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  // 4. Set initial phase to "prep" on mount
  useEffect(() => {
    setPhase("prep");
  }, [setPhase]);

  // 5. Word Count Helper
  const getWordCount = (text) => {
    const trimmed = text.trim();
    return trimmed === "" ? 0 : trimmed.split(/\s+/).length;
  };

  const currentCount = getWordCount(localText);

  // 6. Update Store and Phase on Typing
  const handleTextChange = (e) => {
    const newText = e.target.value;
    const newCount = getWordCount(newText);

    // Hard block: prevent adding more words if over the limit
    // Allow deleting (backspacing) even if over limit
    if (newCount > wordLimit && newCount >= currentCount) {
      return; 
    }

    setLocalText(newText);
    setAnswerKey("answer", newText);

    if (newText.length > 0 && phase === "prep") {
      setPhase("writing");
    } else if (newText.length === 0 && phase === "writing") {
      setPhase("prep");
    }
  };

  // 7. Handle Expiry
  useEffect(() => {
    if (isSectionExpired) {
      setPhase("finished");
    }
  }, [isSectionExpired, setPhase]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight uppercase">
          {subsection?.replace(/_/g, " ")}
        </h2>
        <SectionTimerDisplay
          formattedTime={formattedTime}
          isExpired={isSectionExpired}
        />
      </div>

      {/* Prompt Area */}
      <div className="rounded-lg border border-gray-200 p-5 bg-gray-50 text-gray-900 shadow-sm">
        <RichTextDisplay htmlContent={promptText} />
      </div>

      {/* Main Textarea */}
      <div className="relative">
        <Textarea
          value={localText}
          onChange={handleTextChange}
          placeholder={`Write your response here... Max ${wordLimit} words.`}
          disabled={isSectionExpired}
          rows={15}
          className={`text-base leading-relaxed p-4 resize-none focus:ring-2 min-h-[400px] border-gray-300 transition-all ${
            currentCount >= wordLimit ? "border-red-400 focus:ring-red-500" : "focus:ring-sky-500"
          }`}
        />

        {isSectionExpired && (
          <div className="absolute inset-0 bg-gray-100/40 backdrop-blur-[1px] rounded-md flex items-center justify-center">
            <div className="bg-white px-6 py-3 rounded-full shadow-xl border border-gray-200 font-bold text-gray-500">
              Section Time Expired - Editing Disabled
            </div>
          </div>
        )}
      </div>

      {/* Footer Info */}
      <div className="flex justify-between items-center text-sm px-1">
        <div className={`px-3 py-1 rounded-md border transition-colors ${
          currentCount >= wordLimit ? "bg-red-50 border-red-200 text-red-700" : "bg-gray-100 border-gray-200 text-gray-500"
        }`}>
          Word count:{" "}
          <span className="font-bold">
            {currentCount} / {wordLimit}
          </span>
        </div>

        {!isSectionExpired && phase === "prep" && (
          <span className="text-amber-600 animate-pulse font-medium">
            Start typing to enable the "Next" button...
          </span>
        )}

        {isSectionExpired && (
          <span className="text-red-500 font-medium">
            Your response has been locked and saved.
          </span>
        )}
      </div>
    </div>
  );
}

function RichTextDisplay({ htmlContent }) {
  return (
    <div
      className="prose prose-sm max-w-none text-gray-800"
      dangerouslySetInnerHTML={{ __html: htmlContent }}
    />
  );
}