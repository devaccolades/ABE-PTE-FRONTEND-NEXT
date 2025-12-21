"use client";
import { useEffect, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { useExamStore } from "@/store";

// Hooks & UI Components
import { useSectionTimer } from "../hooks/useSectionTimer";
import SectionTimerDisplay from "../ui/SectionTimerDisplay";

export default function WriteEssay({ promptText, questionId }) {
  const setPhase = useExamStore((s) => s.setPhase);
  const phase = useExamStore((s) => s.phase);
  const setAnswerKey = useExamStore((s) => s.setAnswerKey);

  // 1. Local state for the text
  const [localText, setLocalText] = useState("");

  // 2. Global Section Timer
  const { formattedTime, isExpired: isSectionExpired } = useSectionTimer();

  // 3. Set initial phase to "prep" on mount
  useEffect(() => {
    setPhase("prep");
  }, [setPhase]);

  // 4. Update Store and Phase on Typing
  const handleTextChange = (e) => {
    const newText = e.target.value;
    setLocalText(newText);

    // Update the global store's answer object
    // Note: Standardized to "answer" to match the ExamShell POST logic
    setAnswerKey("answer", newText);

    // CHANGE PHASE: If the user has typed anything, switch from "prep" to "writing"
    if (newText.length > 0 && phase === "prep") {
      setPhase("writing");
    } else if (newText.length === 0 && phase === "writing") {
      // Optional: switch back to prep if they delete everything
      setPhase("prep");
    }
  };

  // 5. Handle Expiry
  useEffect(() => {
    if (isSectionExpired) {
      setPhase("finished");
    }
  }, [isSectionExpired, setPhase]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center border-b pb-4">
        <h2 className="text-xl font-bold text-gray-800 tracking-tight">
          Write Essay
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
          placeholder="Write your essay here... (Minimum 200 words recommended)"
          disabled={isSectionExpired}
          rows={15}
          className="text-base leading-relaxed p-4 resize-none focus:ring-2 focus:ring-sky-500 min-h-[400px] border-gray-300"
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
      <div className="flex justify-between items-center text-sm text-gray-500 px-1">
        <div className="bg-gray-100 px-3 py-1 rounded-md border">
          Word count:{" "}
          <span className="font-bold text-gray-800">
            {localText.trim() === "" ? 0 : localText.trim().split(/\s+/).length}
          </span>
        </div>
        
        {phase === "prep" && (
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